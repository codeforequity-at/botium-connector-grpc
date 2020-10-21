const path = require('path')
const fs = require('fs')
const util = require('util')
const _ = require('lodash')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const randomize = require('randomatic')
const sanitize = require('sanitize-filename')
const Mustache = require('mustache')
const jp = require('jsonpath')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const debug = require('debug')('botium-connector-grpc')

const Capabilities = {
  GRPC_URL: 'GRPC_URL',
  GRPC_PROTO_PATH: 'GRPC_PROTO_PATH',
  GRPC_PROTO: 'GRPC_PROTO',
  GRPC_PROTO_PACKAGE: 'GRPC_PROTO_PACKAGE',
  GRPC_PROTO_SERVICE: 'GRPC_PROTO_SERVICE',
  GRPC_REQUEST_METHOD: 'GRPC_REQUEST_METHOD',
  GRPC_REQUEST_MESSAGE_TEMPLATE: 'GRPC_REQUEST_MESSAGE_TEMPLATE',
  GRPC_RESPONSE_TEXTS_JSONPATH: 'GRPC_RESPONSE_TEXTS_JSONPATH'
}

class BotiumConnectorGRPC {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  Validate () {
    debug('Validate called')
    this.caps = Object.assign({}, this.caps)

    if (!this.caps[Capabilities.GRPC_URL]) throw new Error('GRPC_URL capability required')
    if (!this.caps[Capabilities.GRPC_PROTO] && !this.caps[Capabilities.GRPC_PROTO_PATH]) throw new Error('GRPC_PROTO or GRPC_PROTO_PATH capability has be filled')
    if (!this.caps[Capabilities.GRPC_PROTO_PACKAGE]) throw new Error('GRPC_PROTO_PACKAGE capability required')
    if (!this.caps[Capabilities.GRPC_PROTO_SERVICE]) throw new Error('GRPC_PROTO_SERVICE capability required')
    if (!this.caps[Capabilities.GRPC_REQUEST_METHOD]) throw new Error('GRPC_REQUEST_METHOD capability required')
    if (!this.caps[Capabilities.GRPC_REQUEST_MESSAGE_TEMPLATE]) throw new Error('GRPC_REQUEST_MESSAGE_TEMPLATE capability required')
    if (!this.caps[Capabilities.GRPC_RESPONSE_TEXTS_JSONPATH]) throw new Error('GRPC_RESPONSE_TEXTS_JSONPATH capability required')
  }

  async Start () {
    debug('Start called')
    let protoPath
    if (this.caps[Capabilities.GRPC_PROTO_PATH]) {
      protoPath = this.caps[Capabilities.GRPC_PROTO_PATH]
    } else {
      this.workDir = path.join(process.env.BOTIUM_TEMPDIR || './botiumwork', sanitize(`grpc_${this.caps[Capabilities.GRPC_PROTO_SERVICE]}_${randomize('Aa0', 5)}`))
      mkdirp.sync(this.workDir)
      protoPath = path.join(this.workDir, 'botiumgrpc.proto')
      fs.writeFileSync(protoPath, this.caps[Capabilities.GRPC_PROTO])
    }

    const packageDefinition = protoLoader.loadSync(
      protoPath,
      {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      })
    const proto = grpc.loadPackageDefinition(packageDefinition)[this.caps[Capabilities.GRPC_PROTO_PACKAGE]]
    this.grpcClient = new proto[this.caps[Capabilities.GRPC_PROTO_SERVICE]](this.caps[Capabilities.GRPC_URL], grpc.credentials.createInsecure())
  }

  async UserSays (msg) {
    debug('UserSays called')

    const view = {
      msg
    }

    let args = {}
    if (this.caps[Capabilities.GRPC_REQUEST_MESSAGE_TEMPLATE]) {
      try {
        args = this._getMustachedCap(Capabilities.GRPC_REQUEST_MESSAGE_TEMPLATE, view, true)
      } catch (err) {
        throw new Error(`composing args from GRPC_REQUEST_MESSAGE failed (${err.message})`)
      }
    }

    this.grpcClient[this.caps[Capabilities.GRPC_REQUEST_METHOD]](args, (err, response) => {
      if (err) {
        debug('Finished with error: ', err)
        return
      }
      const botMsgs = []

      const responseTexts = jp.query(response, this.caps[Capabilities.GRPC_RESPONSE_TEXTS_JSONPATH])
      debug(`found response texts: ${util.inspect(responseTexts)}`)

      const messageTexts = (_.isArray(responseTexts) ? _.flattenDeep(responseTexts) : [responseTexts])
      for (const messageText of messageTexts) {
        const botMsg = { sourceData: response, messageText }
        botMsgs.push(botMsg)
      }

      botMsgs.forEach(botMsg => setTimeout(() => this.queueBotSays(botMsg), 0))
    })
  }

  async Stop () {
    debug('Stop called')
    if (this.workDir) {
      rimraf(this.workDir, (err) => {
        if (err) {
          debug(`Failed rimraf ${this.workDir}: ${err}`)
        }
      })
    }
  }

  _getMustachedCap (capName, view, json) {
    const template = _.isString(this.caps[capName]) ? this.caps[capName] : JSON.stringify(this.caps[capName])
    return this._getMustachedVal(template, view, json)
  }

  _getMustachedVal (template, view, json) {
    if (json) {
      return JSON.parse(Mustache.render(template, view))
    } else {
      return Mustache.render(template, view)
    }
  }
}

module.exports = BotiumConnectorGRPC
