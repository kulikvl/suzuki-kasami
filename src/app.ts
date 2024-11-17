import { config } from './config';
import { Node } from './mutex/node';
import * as readline from 'readline';
import express, { Request, Response } from 'express';

const node = new Node(config.self.name, [0, 1, 2], null, false);

function startInteractiveConsole() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${config.self.name}> `,
  });

  rl.prompt();

  rl.on('line', line => {
    const input = line.trim();
    console.log(`Received input: ${input}`);
    handleCommand(input);
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(`${config.self.name} console closed.`);
    process.exit(0);
  });
}

function handleCommand(command: string) {
  const [cmd, ...args] = command.split(' ');

  switch (cmd.toLocaleLowerCase()) {
    case 'lock':
      console.log('Locking...');
      break;
    case 'status':
      console.log('Locking...');
      break;
    case 'unlock':
      console.log('Locking...');
      break;
    case 'update':
      console.log('Locking...');
      break;
    case 'init-token':
      console.log('Locking...');
      break;
    default:
      console.log(`Unknown command: ${cmd}`);
  }
}

startInteractiveConsole();
