## About

This is an implementation of the Suzuki-Kasami algorithm in Node.js using gRPC. Each node is identified by its IP address. For simplicity, all nodes are assigned IPs from the loopback subnet. The network topology is a full mesh, where every node has a reference (gRPC client) to every other node in the network (cluster). Nodes' IPs are drawn from a predefined subnet specified in the configuration (config.yml). When a new node starts, you only specify its IP address; the advertisement of the new node is automatically handled across all other nodes in the subnet.

Each node exposes an HTTP API for control:

- `/update`: You don’t need to call this manually. It triggers a scan of the subnet for active nodes (e.g., processes listening on port 3000 with IPs in the defined subnet) and updates the list of active peer IPs. This endpoint is automatically invoked by a new node on all existing active nodes when it starts.
- `/status`: Returns the node's status in JSON format.
- `/lock`: Requests the lock.
- `/unlock`: Releases the lock if held.
- `/exit`: Exits the process. This endpoint simply calls process.exit. Alternatively, you can kill the process directly with the same effect. If the node does not hold the token, the cluster continues to operate correctly. Therefore, a dedicated graceful exit endpoint is not strictly necessary.

The implementation has been thoroughly tested. Integration tests for mutex correctness and node failures can be found in the `src/test.ts` file.

All nodes log messages to the `common.log` file. Each log entry is timestamped using a logical clock (Lamport clock).

## Fault tolerance

The original Suzuki-Kasami algorithm does not account for node failures, assuming all nodes are always active and functional. This implementation handles failures of non-token-bearing nodes gracefully, allowing the cluster to continue functioning correctly. Even if all non-token-bearing nodes fail, the cluster remains operational.

However, if the node holding the token fails, the token must be manually recreated on another node. This is because the token is an in-memory structure, and handling token recreation or recovery is outside the scope of this implementation.

## Build

To build the project, ensure you have npm and node installed (ideally matching the version specified in the `.node-version` file).

- `npm install`: Installs all dependencies.
- `npm run prebuild`: Generates type definitions from gRPC protobuf files.

## Run

To run a node:

Assign a loopback address using:
`sudo ifconfig lo0 alias <ip>`

For example, this app and its tests use at least the following addresses: 127.0.1.1, 127.0.1.2, 127.0.1.3.

Start the node with:
`ip=<ip> npm start`

You can use the `./scripts/status.sh` script to print the statuses of all nodes in the specified subnet.

## Test

To run the tests:

- `npm run test`

## Notes

Commands useful for debugging/testing this app:

- `lsof -i :3000`: List all processes using port 3000
- `lsof -i :3000 -t | xargs kill -9`: Kill all processes using port 3000
- `ifconfig lo0`: Print the loopback network interface and its assigned IPs
- `sudo ifconfig lo0 alias 127.0.1.1`: Add a new local IP to the loopback subnet
- `sudo ifconfig lo0 -alias 127.0.1.1`: Remove a local IP from the loopback subnet
