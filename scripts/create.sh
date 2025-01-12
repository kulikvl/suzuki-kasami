#!/bin/bash

# Creates Ubuntu LTS VM instance

NAME=$1

if [[ -z $NAME ]]; then
  echo "bad args"
  exit 1
fi

echo "Launching..."
multipass launch --name $NAME

echo "Installing nodejs..."
multipass exec $NAME -- bash -c "sudo apt install -y nodejs > /dev/null 2>&1"
