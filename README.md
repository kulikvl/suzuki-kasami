Fails:

    "generate-types": "protoc --js_out=import_style=commonjs,binary:./src/generated --grpc_out=./src/generated --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin -I ./src/protos ./src/protos/*.proto",
    "generate-types2": "grpc_tools_node_protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=src/generated --js_out=import_style=commonjs,binary:src/generated --grpc_out=grpc_js:src/generated -I src/protos src/protos/*.proto",
    "generate-types3": "protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto --js_out=import_style=commonjs,binary:./src/generated --grpc_out=./src/generated ./src/protos/wallet.proto",
    "generate-types4": "grpc_tools_node_protoc --js_out=import_style=commonjs,binary:./src/generated --grpc_out=./src/generated --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin -I ./src/protos ./src/protos/*.proto",
    "generate-types5": "grpc_tools_node_protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --ts_out=./src/generated -I ./src/protos ./src/protos/*.proto",
    "generate": "protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=./src/generated -I ./src/protos ./src/protos/*.proto",
    "proto:generate": "grpc_tools_node_protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts --js_out=import_style=commonjs,binary:./src/generated --ts_out=grpc_js:./src/generated -I ./src/protos ./src/protos/*.proto",
