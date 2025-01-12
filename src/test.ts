import axios from 'axios';
import { execSync } from 'child_process';
import { sleep } from './utils';

const APP_PORT = 3000;
const output = execSync(`multipass list --format json`, { encoding: 'utf-8' });
const nodes = JSON.parse(output).list.map((i: any) => ({
  ip: i.ipv4[0],
  name: i.name,
})) as { ip: string; name: string }[];

function getRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

const TARGET_VALUE = 1000;
// const DELAY = () => getRandomFloat(0, 100);
const DELAY = () => 0;

async function test() {
  const stats = {} as any;

  await Promise.all(
    nodes.map(async node => {
      while (true) {
        await axios.post(`http://${node.ip}:${APP_PORT}/lock`);
        const getResponse = await axios.get(`http://${node.ip}:${APP_PORT}/get`);
        // await sleep(DELAY());
        const value = getResponse.data.value;
        if (value >= TARGET_VALUE) {
          await axios.post(`http://${node.ip}:${APP_PORT}/unlock`);
          break;
        }
        await axios.post(`http://${node.ip}:${APP_PORT}/set`, {
          value: value + 1,
        });
        console.log(`Node ${node.name} incremented value to ${value + 1}`);
        stats[node.name] = (stats[node.name] || 0) + 1;
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
