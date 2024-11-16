"use strict";
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
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const packageDefinition = protoLoader.loadSync('./src/protos/helloworld.proto', {});
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const todoPackage = grpcObject.helloworldPackage;
// console.log(todoPackage);
// const text = process.argv[2];
const client = new todoPackage.Greeter('proxyman.debug:40000', grpc.credentials.createInsecure());
// console.log(client.sayHello);
client.sayHello({ name: 'aaa' }, (err, response) => {
    console.log('Recieved from server1 ' + JSON.stringify(response));
    console.log('Recieved from server2 ' + err);
});
// client.createTodo(
//   {
//     id: -1,
//     text: text,
//   },
//   (err, response) => {
//     console.log('Recieved from server ' + JSON.stringify(response));
//   },
// );
// /*
// client.readTodos(null, (err, response) => {
//     console.log("read the todos from server " + JSON.stringify(response))
//     if (!response.items)
//         response.items.forEach(a=>console.log(a.text));
// })
// */
// const call = client.readTodosStream();
// call.on('data', item => {
//   console.log('received item from server ' + JSON.stringify(item));
// });
// call.on('end', e => console.log('server done!'));
//# sourceMappingURL=client.js.map