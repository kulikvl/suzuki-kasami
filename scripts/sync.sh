#!/bin/bash

all_ips=($(multipass list --format csv | awk -F, 'NR>1 && $2=="Running" {print $3}'))
ips_json=$(printf '%s\n' "${all_ips[@]}" | jq -R . | jq -s .)

for ip in "${all_ips[@]}"; do
  echo "Sending peers list update request to node $ip..."
  curl -X POST "http://$ip:3000/update" -d "{\"peers\":$ips_json}" -H "Content-Type: application/json" > /dev/null 2>&1
done

echo "Nodes are in sync."
