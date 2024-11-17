// import * as grpc from '@grpc/grpc-js';
// import * as protoLoader from '@grpc/proto-loader';
// import { GreeterClient, HelloRequest } from './generated/helloworld';

// import { createChannel, createClient } from 'nice-grpc';
// import { GreeterClient, GreeterDefinition } from './generated/helloworld';

// const packageDefinition = protoLoader.loadSync('./src/protos/helloworld.proto', {});
// const grpcObject = grpc.loadPackageDefinition(packageDefinition);
// const todoPackage = (grpcObject as any).helloworldPackage;

// // console.log(todoPackage);

// // const text = process.argv[2];

// const client = new todoPackage.Greeter('localhost:40000', grpc.credentials.createInsecure());
// // console.log(client.sayHello);

// client.sayHello({ name: 'aaa' }, (err: any, response: any) => {
//   console.log('Recieved from server1 ' + JSON.stringify(response));
//   console.log('Recieved from server2 ' + err);
// });

// const client2 = new GreeterClient('localhost:40000', grpc.credentials.createInsecure());

// // const body = new HelloRequest();
// // body.setName('aaa');

// const body = HelloRequest.create({ name: 'aaa' });

// client2.sayHello(body, (err: any, response: any) => {
//   console.log('Recieved from server1 ' + JSON.stringify(response));
//   console.log('Recieved from server2 ' + err);
// });

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

// const channel = createChannel('localhost:40000');

// const client: GreeterClient = createClient(GreeterDefinition, channel);

// async function main() {
//   const response = await client.sayHello({ name: 'aaa' });
//   console.log('Recieved from server ' + JSON.stringify(response));
// }

// main();
