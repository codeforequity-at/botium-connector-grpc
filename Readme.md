# Botium Connector for GRPC Endpoint

[![NPM](https://nodei.co/npm/botium-connector-grpc.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/botium-connector-grpc/)

[![Codeship Status for codeforequity-at/botium-connector-grpc](https://app.codeship.com/projects/2b082bfb-7969-4238-87b7-da396ac59843/status?branch=master)](https://app.codeship.com/projects/2b082bfb-7969-4238-87b7-da396ac59843)
[![npm version](https://badge.fury.io/js/botium-connector-grpc.svg)](https://badge.fury.io/js/botium-connector-grpc)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()

This is a [Botium](https://github.com/codeforequity-at/botium-core) connector for testing your chatbot published on [gRPC](https://grpc.io) server.

__Did you read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) articles? Be warned, without prior knowledge of Botium you won't be able to properly use this library!__

## How it works
Botium calls your gRPC endpoint by transforming the Botium internal message representation to match in your .proto file defined schema.

It can be used as any other Botium connector with all Botium Stack components:
* [Botium CLI](https://github.com/codeforequity-at/botium-cli/)
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings/)
* [Botium Box](https://www.botium.at) (Not integrated yet!)

## Requirements
* **Node.js and NPM**
* a bot published on a **gRPC server**
* a **project directory** on your workstation to hold test cases, Botium configuration and a .proto file

## Install Botium and gRPC Connector

When using __Botium CLI__:

```
> npm install -g botium-cli
> npm install -g botium-connector-grpc
> botium-cli init
> botium-cli run
```

When using __Botium Bindings__:

```
> npm install -g botium-bindings
> npm install -g botium-connector-grpc
> botium-bindings init mocha
> npm install && npm run mocha
```

When using __Botium Box__: Not integrated yet!

## Connecting gRPC chatbot to Botium

First you need .proto file, which describe your server schema, 
then create a botium.json in your project directory with the corresponding gRPC configurations:

```
{
  "botium": {
    "Capabilities": {
      "PROJECTNAME": "Botium Project GRPC",
      "CONTAINERMODE": "grpc",
      "GRPC_URL": "localhost:50051",
      "GRPC_PROTO": "../echoserver/protos/botiumgrpc.proto",
      "GRPC_PROTO_PACKAGE": "botium",
      "GRPC_PROTO_SERVICE": "Echo",
      "GRPC_REQUEST_METHOD": "getReply",
      "GRPC_REQUEST_MESSAGE": "{\"text\": \"{{msg.messageText}}\", \"user_name\": \"botium\"}",
      "GRPC_RESPONSE_FIELD": "text"
    }
  }
}
```

To check the configuration, run the emulator (Botium CLI required) to bring up a chat interface in your terminal window:

```
> botium-cli emulator
```

Botium setup is ready, you can begin to write your test cases with [BotiumScript](https://botium.atlassian.net/wiki/spaces/BOTIUM/pages/491664/Botium+Scripting+-+BotiumScript).

## How to start sample

There is a simple *Echo*-bot included, see [samples/echoserver](./samples/echoserver) folder. You have to start it before running the samples:

```
> npm install && npm start
```

Now you can start the included Botium samples:

```
> cd ./samples/echo
> npm install && npm test
```

## Supported Capabilities

Set the capability __CONTAINERMODE__ to __grpc__ to activate this connector.

### GRPC_URL
gRPC server URL

### GRPC_PROTO
Relative url of you .proto file

### GRPC_PROTO_PACKAGE
The package defined in your .proto file

### GRPC_PROTO_SERVICE
The service defined in your .proto file

### GRPC_REQUEST_METHOD
The method defined in your .proto file for the service

### GRPC_REQUEST_MESSAGE_TEMPLATE
[Mustache template](https://mustache.github.io/) for conversating the Botium internal message structure to the gRPC request object as required according to the .proto file.

The Mustache view contains the Botium internal message structure in the _msg_ field, see [Botium Wiki](https://botium.atlassian.net/wiki/spaces/BOTIUM/pages/38502401/Howto+develop+your+own+Botium+connector#The-outgoing-message). Example:

    ...
    "GRPC_REQUEST_MESSAGE_TEMPLATE": {
       "user_name": "botium",
       "text": "{{msg.messageText}}"
    },
    ...
### GRPC_RESPONSE_TEXTS_JSONPATH
[JSONPath expression](https://github.com/dchester/jsonpath) to extract the message text from the gRPC response.

### GRPC_RESPONSE_BUTTONS_JSONPATH (NOT IMPLEMENTED YET!!!)
[JSONPath expression](https://github.com/dchester/jsonpath) to extract button texts from the gRPC response.

### GRPC_RESPONSE_MEDIA_JSONPATH (NOT IMPLEMENTED YET!!!)
[JSONPath expression](https://github.com/dchester/jsonpath) to extract media attachments from the gRPC response.
