const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const PROTO_PATH = './protos/botiumgrpc.proto'

const packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })
const proto = grpc.loadPackageDefinition(packageDefinition).botium

/**
 * Implements the getReply RPC method.
 */
function getReply (call, callback) {
  callback(null, { text: 'Echo: ' + call.request.text })
}

/**
 * Starts an RPC server that receives requests for the Echo service at the
 * sample server port
 */
function main () {
  const server = new grpc.Server()
  server.addService(proto.Echo.service, { getReply: getReply })
  server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure())
  server.start()
  console.log('gRPC server start on http://127.0.0.1:50051')
}

main()
