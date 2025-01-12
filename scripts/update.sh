#!/bin/bash

npm run build

nodes=($(multipass list --format csv | awk -F, 'NR>1 && $2=="Running" {print $1}'))

for node in "${nodes[@]}"; do
  echo "Updating $node..."
  multipass exec $node -- bash -c "rm -rf * && touch common.log"
  multipass copy-files -r build node_modules config.yml $node:.
done
