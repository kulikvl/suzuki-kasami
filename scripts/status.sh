#!/bin/bash

# Usage: ./check_nodes.sh <subnet> <port> <endpoint>
# Example: ./check_nodes.sh 127.0.1.0/29 3000 /status

# Input parameters
SUBNET=$1
PORT=$2
ENDPOINT=$3

# Validate inputs
if [[ -z "$SUBNET" || -z "$PORT" || -z "$ENDPOINT" ]]; then
  echo "Usage: $0 <subnet> <port> <endpoint>"
  echo "Example: $0 127.0.1.0/29 3000 /status"
  exit 1
fi

# Dependencies check
if ! command -v nmap &> /dev/null; then
  echo "Error: nmap is required but not installed. Install it with 'brew install nmap' or 'sudo apt install nmap'."
  exit 1
fi

# Scan subnet for active nodes with open port
# echo "Scanning subnet $SUBNET for active nodes with port $PORT open..."
ACTIVE_IPS=$(nmap -p $PORT --open -n $SUBNET | grep "Nmap scan report for" | awk '{print $NF}')

if [[ -z "$ACTIVE_IPS" ]]; then
  echo "No active nodes with port $PORT open found in the subnet."
  exit 0
fi

# Check the status of each node
# echo "Checking statuses of active nodes on port $PORT with endpoint $ENDPOINT..."
echo "----------------------------------------"
for IP in $ACTIVE_IPS; do
  URL="http://$IP:$PORT$ENDPOINT"

  RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$URL")
  BODY=$(echo "$RESPONSE" | sed -e 's/HTTPSTATUS:.*//')
  STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

  if [[ "$STATUS" == "200" ]]; then
    echo "Node $IP:"
    echo "$BODY"
  elif [[ "$STATUS" == "000" ]]; then
    echo "Node $IP: Port $PORT is open but endpoint $ENDPOINT is unreachable"
  else
    echo "Node $IP: Port $PORT is open but responded with status $STATUS"
  fi

  echo "----------------------------------------"
done
