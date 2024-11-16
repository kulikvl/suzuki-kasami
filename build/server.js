"use strict";
// import * as grpc from '@grpc/grpc-js';
// import * as protoLoader from '@grpc/proto-loader';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { IUsersServer, UsersService } from './generated/users_grpc_pb.js';
// import { User, UserRequest, UserStatus } from './generated/users_pb.js';
// class UsersServer implements IUsersServer {
//   [key: string]: any;
//   getUser(call: ServerUnaryCall<UserRequest, User>, callback: sendUnaryData<User>) {
//     const user = new User();
//     user.setId(1);
//     user.setName('Teddy');
//     user.setAge(25);
//     user.setStatus(UserStatus.BUSY);
//     callback(null, user);
//   }
// }
// const server = new Server();
// server.addService(UsersService as unknown as ServiceDefinition, new UsersServer());
// const port = 3000;
// const uri = `localhost:${port}`;
// console.log(`Listening on ${uri}`);
// server.bind(uri, ServerCredentials.createInsecure());
//////
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const packageDefinition = protoLoader.loadSync('./src/protos/helloworld.proto', {});
const helloworldPackage = grpc.loadPackageDefinition(packageDefinition);
const service = helloworldPackage.helloworldPackage.Greeter.service;
const server = new grpc.Server();
server.bindAsync('localhost:40000', grpc.ServerCredentials.createInsecure(), (err, port) => {
    console.log('Server started: ', err, port);
    // server.start();
});
server.addService(service, {
    SayHello: sayHello,
    // createTodo: createTodo,
    // readTodos: readTodos,
    // readTodosStream: readTodosStream,
});
// server.start();
// const todos = [];
// function createTodo(call, callback) {
//   const todoItem = {
//     id: todos.length + 1,
//     text: call.request.text,
//   };
//   todos.push(todoItem);
//   callback(null, todoItem);
// }
// function readTodosStream(call, callback) {
//   todos.forEach(t => call.write(t));
//   call.end();
// }
// function readTodos(call, callback) {
//   callback(null, { items: todos });
// }
function sayHello(call, callback) {
    console.log('sayHello', call.request);
    callback(null, { message: 'Hello ' + call.request.name });
}
//# sourceMappingURL=server.js.map