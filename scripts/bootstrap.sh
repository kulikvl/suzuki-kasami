#!/bin/bash

echo "Updating sources..."
./scripts/update.sh

nodes=($(multipass list --format csv | awk -F, 'NR>1 && $2=="Running" {print $1}'))

echo "Stopping nodes..."
for node in "${nodes[@]}"; do
  echo "Stopping $node..."
  multipass exec $node -- bash -c "lsof -i :3000 -t | xargs kill -9 > /dev/null 2>&1"
done

echo "Starting nodes..."
for node in "${nodes[@]}"; do
  echo "Starting $node..."
  multipass exec $node -- bash -c "node build/app.js > /dev/null 2>&1 &"
done

# sleep 1

# echo "Syncing..."
# ls
# ./scripts/sync.sh



