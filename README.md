## About

This is an implementation of the Suzuki-Kasami algorithm in Node.js using gRPC. Each node is identified by its IP address. The network topology is a full mesh, where every node maintains a reference (gRPC client) to every other node in the network (cluster).

Each node exposes an HTTP API for control:

- `/status`: Returns the node's status in JSON format.
- `/join`: Joins the cluster. You must specify the bootstrap IP—the IP of an existing node in the cluster—so the discovery process works.
- `/leave`: Gracefully leaves the cluster by sending a discovery message to every node, indicating that this node is leaving.
- `/kill`: Immediately exits the process.
- `/lock`: Requests the lock.
- `/unlock`: Releases the lock.
- `/get`: Retrieves the shared variable.
- `/set`: Updates the shared variable.
- `/delay`: Sets a delay for POST API requests.

## Fault tolerance

The original Suzuki-Kasami algorithm assumes all nodes are always active, functional, and in a fixed quantity, meaning it does not account for node failures. This implementation handles failures of non-token-bearing nodes gracefully, ensuring the cluster continues to function correctly. Even if all non-token-bearing nodes fail, the cluster remains operational.

However, if the node holding the token fails, the token must be manually recreated on another node. This limitation exists because the token is stored in memory, and token recreation or recovery is outside the scope of this implementation.

## Build

To build the project, ensure you have npm and node installed (ideally matching the version specified in the .node-version file).

- `npm install`: Installs all dependencies.
- `npm run prebuild`: Generates type definitions from gRPC protobuf files.

## Test

The best way to test this on virtual machines is by using Multipass to create Ubuntu LTS VMs.

Example of launching node1:

- `multipass launch --name node1`: Creates a VM.
- `multipass mount . node1:/home/ubuntu/app`: Mounts the source files.
- `multipass shell node1`: Opens the VM shell.
- `sudo apt install -y nodejs npm`: Installs the runtime.
- `npm start`: Starts the app.

Repeat these steps for each VM node.

You can control the cluster using either the HTTP API or the CLI app. The CLI app is a lightweight wrapper that converts command-line input into API calls to the nodes, which significantly simplifies development and testing.

- `npm run cli`: Starts the CLI app.
- `boot`: Initializes the cluster and creates the token (calls the /join and /token endpoints).
- `<node_x> set 13`: Sets the shared variable value to 13 on the node_x instance.
- `<node_x> get`: Retrieves the shared variable.

You can also run npm run test to simulate a highly parallel environment where every node continuously requests a lock to increment a shared value.

## Notes

Commands useful for debugging/testing this app:

- `lsof -i :3000`: List all processes using port 3000
- `lsof -i :3000 -t | xargs kill -9`: Kill all processes using port 3000
- `multipass stop --all && multipass delete --all && multipass purge`: Clear all vms
