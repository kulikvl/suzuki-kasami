// import * as grpc from '@grpc/grpc-js';
// import * as protoLoader from '@grpc/proto-loader';

// const packageDefinition = protoLoader.loadSync('./src/protos/helloworld.proto', {});
// const helloworldPackage = grpc.loadPackageDefinition(packageDefinition);
// const service = (helloworldPackage as any).helloworldPackage.Greeter.service;

// const server = new grpc.Server();
// server.bindAsync('localhost:40000', grpc.ServerCredentials.createInsecure(), (err, port) => {
//   console.log('Server started: ', err, port);
// });

// server.addService(service, {
//   sayHello: sayHello,
// });

// function sayHello(call: any, callback: any) {
//   console.log('sayHello', call.request);
//   callback(null, { message: 'Hello ' + call.request.name });
// }

//////////

// import { createServer } from 'nice-grpc';
// import {
//   GreeterDefinition,
//   GreeterServiceImplementation,
//   HelloRequest,
// } from './generated/helloworld';

// const exampleServiceImpl: GreeterServiceImplementation = {
//   async sayHello(request: HelloRequest) {
//     return Promise.resolve({ message: `Hello ${request.name}` });
//   },
// };

// const server = createServer();

// server.add(GreeterDefinition, exampleServiceImpl);

// server
//   .listen('localhost:40000')
//   .then(a => {
//     console.log(`Server listening on port ${a}`);
//   })
//   .catch(e => {
//     console.error('heyeye errror:', e);
//   });
