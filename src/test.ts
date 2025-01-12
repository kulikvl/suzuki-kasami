import axios from 'axios';
import { execSync } from 'child_process';
import { getRandomFloat, getRandomInt, sleep } from './utils';

const APP_PORT = 3000;
const TARGET_VALUE = 500;
// const DELAY = () => getRandomFloat(0, 50);
// const DELAY = () => 10;
const DELAY: any = undefined;

const output = execSync(`multipass list --format json`, { encoding: 'utf-8' });
const nodes = JSON.parse(output).list.map((i: any) => ({
  ip: i.ipv4[0],
  name: i.name,
})) as { ip: string; name: string }[];

let leaved = 0;

async function test() {
  const stats: any = {};

  await Promise.all(
    nodes.map(async node => {
      while (true) {
        // Random leave from cluster
        // if (leaved < nodes.length - 1) {
        //   if (getRandomInt(0, 2000) < 10) {
        //     console.log(`Node ${node.name} is leaving the test...`);
        //     leaved++;
        //     await axios.post(`http://${node.ip}:${APP_PORT}/leave`); // or /kill
        //     break;
        //   }
        // }

        // Acquire lock
        await axios.post(`http://${node.ip}:${APP_PORT}/lock`);

        // Get current value
        const value = (await axios.get(`http://${node.ip}:${APP_PORT}/get`)).data.value;

        // Delay if set
        if (DELAY) await sleep(DELAY());

        // Exit if target value reached
        if (value >= TARGET_VALUE) {
          await axios.post(`http://${node.ip}:${APP_PORT}/unlock`);
          break;
        }

        // Increment value
        await axios.post(`http://${node.ip}:${APP_PORT}/set`, {
          value: value + 1,
        });
        console.log(`Node ${node.name} incremented value to ${value + 1}`);

        stats[node.name] = (stats[node.name] || 0) + 1;

        // Release lock
        await axios.post(`http://${node.ip}:${APP_PORT}/unlock`);
      }
    }),
  );

  console.log('Test completed!', stats);
}

test().catch(e => {
  console.log('Test crushed:', e.message);
  process.exit(1);
});
