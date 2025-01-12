#!/bin/bash

ALL_IPS=($(multipass list --format csv | awk -F, 'NR>1 && $2=="Running" {print $3}'))
PORT=3000
ENDPOINT="/status"

echo "----------------------------------------"
for IP in "${ALL_IPS[@]}"; do
  URL="http://$IP:$PORT$ENDPOINT"
  
  RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$URL")
  BODY=$(echo "$RESPONSE" | sed -e 's/HTTPSTATUS:.*//')
  STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

  if [[ "$STATUS" == "200" ]]; then
    echo "Node $IP:"
    echo "$BODY"
  else
    echo "Node $IP is unreachable."
  fi

  echo "----------------------------------------"
done
