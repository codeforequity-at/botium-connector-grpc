const util = require('util')
const _ = require('lodash')
const Mustache = require('mustache')
const jp = require('jsonpath')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const debug = require('debug')('botium-connector-grpc')

const Capabilities = {
  GRPC_URL: 'GRPC_URL',
  GRPC_PROTO: 'GRPC_PROTO',
  GRPC_PROTO_PACKAGE: 'GRPC_PROTO_PACKAGE',
  GRPC_PROTO_SERVICE: 'GRPC_PROTO_SERVICE',
  GRPC_REQUEST_METHOD: 'GRPC_REQUEST_METHOD',
  GRPC_REQUEST_MESSAGE: 'GRPC_REQUEST_MESSAGE',
  GRPC_RESPONSE_FIELD: 'GRPC_RESPONSE_FIELD'
}

const Defaults = {
}

class BotiumConnectorGRPC {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  Validate () {
    debug('Validate called')
    this.caps = Object.assign({}, Defaults, this.caps)

    if (!this.caps[Capabilities.GRPC_URL]) throw new Error('GRPC_URL capability required')
    if (!this.caps[Capabilities.GRPC_PROTO]) throw new Error('GRPC_PROTO capability required')
    if (!this.caps[Capabilities.GRPC_PROTO_PACKAGE]) throw new Error('GRPC_PROTO_PACKAGE capability required')
    if (!this.caps[Capabilities.GRPC_PROTO_SERVICE]) throw new Error('GRPC_PROTO_SERVICE capability required')
    if (!this.caps[Capabilities.GRPC_REQUEST_METHOD]) throw new Error('GRPC_REQUEST_METHOD capability required')
    if (!this.caps[Capabilities.GRPC_REQUEST_MESSAGE]) throw new Error('GRPC_REQUEST_MESSAGE capability required')
    if (!this.caps[Capabilities.GRPC_RESPONSE_FIELD]) throw new Error('GRPC_RESPONSE_FIELD capability required')
  }

  async Start () {
    debug('Start called')
    const PROTO_PATH = this.caps[Capabilities.GRPC_PROTO]
    const packageDefinition = protoLoader.loadSync(
      PROTO_PATH,
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
    if (this.caps[Capabilities.GRPC_REQUEST_MESSAGE]) {
      try {
        args = this._getMustachedCap(Capabilities.GRPC_REQUEST_MESSAGE, view, true) // eslint-disable-line no-unused-vars
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

      const responseTexts = jp.query(response, this.caps[Capabilities.GRPC_RESPONSE_FIELD])
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
