// GENERATED CODE -- DO NOT EDIT!
'use strict';
var grpc = require('grpc');
var helloworld_pb = require('./helloworld_pb.js');
function serialize_helloworldPackage_HelloReply(arg) {
    if (!(arg instanceof helloworld_pb.HelloReply)) {
        throw new Error('Expected argument of type helloworldPackage.HelloReply');
    }
    return Buffer.from(arg.serializeBinary());
}
function deserialize_helloworldPackage_HelloReply(buffer_arg) {
    return helloworld_pb.HelloReply.deserializeBinary(new Uint8Array(buffer_arg));
}
function serialize_helloworldPackage_HelloRequest(arg) {
    if (!(arg instanceof helloworld_pb.HelloRequest)) {
        throw new Error('Expected argument of type helloworldPackage.HelloRequest');
    }
    return Buffer.from(arg.serializeBinary());
}
function deserialize_helloworldPackage_HelloRequest(buffer_arg) {
    return helloworld_pb.HelloRequest.deserializeBinary(new Uint8Array(buffer_arg));
}
// The greeting service definition.
var GreeterService = exports.GreeterService = {
    // Sends a greeting
    sayHello: {
        path: '/helloworldPackage.Greeter/SayHello',
        requestStream: false,
        responseStream: false,
        requestType: helloworld_pb.HelloRequest,
        responseType: helloworld_pb.HelloReply,
        requestSerialize: serialize_helloworldPackage_HelloRequest,
        requestDeserialize: deserialize_helloworldPackage_HelloRequest,
        responseSerialize: serialize_helloworldPackage_HelloReply,
        responseDeserialize: deserialize_helloworldPackage_HelloReply,
    },
};
exports.GreeterClient = grpc.makeGenericClientConstructor(GreeterService);
//# sourceMappingURL=helloworld_grpc_pb.js.map