import axios from 'axios';
import { execSync } from 'child_process';
import * as readline from 'readline';

const APP_PORT = 3000;
const output = execSync(`multipass list --format json`, { encoding: 'utf-8' });
const nodes = JSON.parse(output).list.map((i: any) => ({
  ip: i.ipv4[0],
  name: i.name,
})) as { ip: string; name: string }[];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
});

async function processCommand(input: string) {
  const args = input.trim().split(/\s+/);

  if (args[0] === 'status') {
    const responses = await Promise.all(
      nodes.map(async node => {
        try {
          const response = await axios.get(`http://${node.ip}:${APP_PORT}/status`);
          return `${node.name}: ${JSON.stringify(response.data, null, 2)}`;
        } catch (error) {
          return `${node.name}: Unavailable`;
        }
      }),
    );

    console.log(responses.sort().join('\n'));
    return;
  }

  const node = nodes.find(n => n.name === args[0]);
  if (!node) {
    console.log(`Node not found: ${args[0]}`);
    return;
  }
  const action = args[1];

  switch (action) {
    case 'get': {
      const response = await axios.get(`http://${node.ip}:${APP_PORT}/get`);
      console.log(response.data.value);
      break;
    }
    case 'set': {
      const value = args[2];
      await axios.post(`http://${node.ip}:${APP_PORT}/set`, {
        value: Number(value),
      });
      break;
    }
    case 'lock': {
      // non-blocking
      axios.post(`http://${node.ip}:${APP_PORT}/lock`).catch(() => {});
      break;
    }
    case 'unlock': {
      // non-blocking
      axios.post(`http://${node.ip}:${APP_PORT}/unlock`).catch(() => {});
      break;
    }
    case 'delay': {
      const value = args[2];
      await axios.post(`http://${node.ip}:${APP_PORT}/delay`, { value: Number(value) });
      break;
    }
    case 'token': {
      await axios.post(`http://${node.ip}:${APP_PORT}/token`);
      break;
    }
    case 'join': {
      const joinNode = args[2];
      await axios.post(`http://${node.ip}:${APP_PORT}/join`, {
        ...(joinNode && { bootstrapIp: nodes.find(n => n.name === joinNode)!.ip }),
      });
      break;
    }
    case 'leave': {
      await axios.post(`http://${node.ip}:${APP_PORT}/leave`);
      break;
    }
    case 'kill': {
      await axios.post(`http://${node.ip}:${APP_PORT}/kill`);
      break;
    }
  }
}

console.log('Welcome to the Command-Line Tool! Type "help" for instructions.');
rl.prompt();

rl.on('line', async line => {
  await processCommand(line);
  rl.prompt();
}).on('close', () => {
  console.log('Exiting...');
  process.exit(0);
});
