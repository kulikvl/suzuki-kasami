import axios from 'axios';
import { ChildProcessByStdio, spawn } from 'child_process';
import internal from 'stream';
import { describe } from 'mocha';
import { SKNodeStatus, SKNodeStatusType } from './sknode';
import { sleep } from './utils';
import { expect } from 'chai';
import fs from 'fs';

const PORT = 3000;
const SLEEP_TIME = 300;
const DEBUG = false;

interface TestNodeProcess {
  ip: string;
  process: ChildProcessByStdio<null, internal.Readable, internal.Readable>;
}

async function launchTestNode(ip: string): Promise<TestNodeProcess> {
  return new Promise((resolve, reject) => {
    const nodeProcess = spawn('npm', ['start'], {
      env: { ...process.env, ip },
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    nodeProcess.stdout.on('data', data => {
      const output = data.toString();
      if (DEBUG) console.log(`[Node ${ip}] ${output}`);

      if (output.includes('ready')) {
        resolve({
          ip,
          process: nodeProcess,
        });
      }
    });

    nodeProcess.stderr.on('data', data => {
      if (DEBUG) console.error(`[Node ${ip} Error] ${data}`);
    });

    nodeProcess.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Node process at ${ip} exited with code ${code}`));
      }
    });
  });
}

async function getNodeStatuses(nodes: TestNodeProcess[]) {
  const statuses = await Promise.all(
    nodes.map(async node => {
      try {
        const response = await axios.get(`http://${node.ip}:${PORT}/status`);
        return {
          ip: node.ip,
          status: response.data as SKNodeStatus,
        };
      } catch {
        return {
          ip: node.ip,
          status: null,
        };
      }
    }),
  );

  const statusRecord: Record<string, SKNodeStatus | null> = {};
  statuses.forEach(status => {
    statusRecord[status.ip] = status.status;
  });

  return statusRecord;
}

describe('Suzuki-Kasami Tests', () => {
  let nodes: TestNodeProcess[] = [];

  beforeEach(() => {
    fs.truncateSync('common.log', 0);
  });

  afterEach(() => {
    nodes.forEach(node => {
      node.process.kill();
    });
  });

  it('should initiate 3 nodes, validate their statuses, and ensure peers are correctly discovered', async () => {
    const node1 = await launchTestNode('127.0.1.1');
    const node2 = await launchTestNode('127.0.1.2');
    const node3 = await launchTestNode('127.0.1.3');

    nodes = [node1, node2, node3];

    await sleep(500);

    let statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: { lastGranted: { '127.0.1.1': 0, '127.0.1.2': 0, '127.0.1.3': 0 }, queue: [] },
      requestNumbers: { '127.0.1.1': 0, '127.0.1.2': 0, '127.0.1.3': 0 },
    });

    expect(statuses[node2.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 0, '127.0.1.2': 0, '127.0.1.3': 0 },
    });

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 0, '127.0.1.2': 0, '127.0.1.3': 0 },
    });
  });

  it('should correctly handle token passing, locking, and unlocking across 3 nodes', async () => {
    const node1 = await launchTestNode('127.0.1.1');
    const node2 = await launchTestNode('127.0.1.2');
    const node3 = await launchTestNode('127.0.1.3');

    nodes = [node1, node2, node3];

    await sleep(SLEEP_TIME);

    axios.post(`http://${node1.ip}:${PORT}/lock`);

    await sleep(SLEEP_TIME);

    axios.post(`http://${node2.ip}:${PORT}/lock`);

    await sleep(SLEEP_TIME);

    axios.post(`http://${node3.ip}:${PORT}/lock`);

    await sleep(SLEEP_TIME);

    let statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.deep.include({
      status: SKNodeStatusType.Locked,
      token: {
        lastGranted: { '127.0.1.1': 0, '127.0.1.2': 0, '127.0.1.3': 0 },
        queue: [node2.ip, node3.ip],
      },
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node2.ip]).to.deep.include({
      status: SKNodeStatusType.Waiting,
      token: null,
      requestNumbers: { '127.0.1.1': 0, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Waiting,
      token: null,
      requestNumbers: { '127.0.1.1': 0, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    axios.post(`http://${node1.ip}:${PORT}/unlock`);

    await sleep(SLEEP_TIME);

    statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node2.ip]).to.deep.include({
      status: SKNodeStatusType.Locked,
      token: {
        lastGranted: { '127.0.1.1': 1, '127.0.1.2': 0, '127.0.1.3': 0 },
        queue: [node3.ip],
      },
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Waiting,
      token: null,
      requestNumbers: { '127.0.1.1': 0, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    axios.post(`http://${node2.ip}:${PORT}/unlock`);

    await sleep(SLEEP_TIME);

    statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node2.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Locked,
      token: {
        lastGranted: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 0 },
        queue: [],
      },
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    axios.post(`http://${node3.ip}:${PORT}/unlock`);

    await sleep(SLEEP_TIME);

    statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node2.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: {
        lastGranted: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
        queue: [],
      },
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    axios.post(`http://${node3.ip}:${PORT}/lock`);

    await sleep(SLEEP_TIME);

    statuses = await getNodeStatuses(nodes);

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Locked,
      token: {
        lastGranted: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
        queue: [],
      },
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 2 },
    });
  });

  it('should handle node crashes and recovery, ensuring proper token redistribution and queue management', async () => {
    const node1 = await launchTestNode('127.0.1.1');
    const node2 = await launchTestNode('127.0.1.2');
    const node3 = await launchTestNode('127.0.1.3');

    nodes = [node1, node2, node3];

    await sleep(SLEEP_TIME);

    await axios.post(`http://${node1.ip}:${PORT}/lock`);

    await sleep(SLEEP_TIME);

    await axios.post(`http://${node2.ip}:${PORT}/lock`);

    await sleep(SLEEP_TIME);

    await axios.post(`http://${node3.ip}:${PORT}/lock`);

    await sleep(SLEEP_TIME);

    await axios.post(`http://${node2.ip}:${PORT}/exit`);

    await sleep(SLEEP_TIME);

    let statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.deep.include({
      status: SKNodeStatusType.Locked,
      token: {
        lastGranted: { '127.0.1.1': 0, '127.0.1.2': 0, '127.0.1.3': 0 },
        queue: ['127.0.1.2', '127.0.1.3'],
      },
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node2.ip]).to.equal(null);

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Waiting,
      token: null,
      requestNumbers: { '127.0.1.1': 0, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    await axios.post(`http://${node1.ip}:${PORT}/unlock`);

    await sleep(SLEEP_TIME);

    statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node2.ip]).to.equal(null);

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Locked,
      token: {
        lastGranted: { '127.0.1.1': 1, '127.0.1.2': 0, '127.0.1.3': 0 },
        queue: [],
      },
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    await axios.post(`http://${node1.ip}:${PORT}/lock`);

    await sleep(SLEEP_TIME);

    node1.process.kill();

    await sleep(SLEEP_TIME);

    await axios.post(`http://${node3.ip}:${PORT}/unlock`);

    await sleep(SLEEP_TIME);

    statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.equal(null);

    expect(statuses[node2.ip]).to.equal(null);

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: {
        lastGranted: { '127.0.1.1': 1, '127.0.1.2': 0, '127.0.1.3': 1 },
        queue: [],
      },
      requestNumbers: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    // Revive node2
    const node2_new = await launchTestNode('127.0.1.2');
    nodes.push(node2_new);

    await sleep(SLEEP_TIME);

    await axios.post(`http://${node2.ip}:${PORT}/lock`);

    await sleep(SLEEP_TIME);

    statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.equal(null);

    expect(statuses[node2.ip]).to.deep.include({
      status: SKNodeStatusType.Locked,
      token: {
        lastGranted: { '127.0.1.1': 1, '127.0.1.2': 0, '127.0.1.3': 1 },
        queue: [],
      },
      requestNumbers: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    // Revive node1
    const node1_new = await launchTestNode('127.0.1.1');
    nodes.push(node1_new);

    await sleep(SLEEP_TIME);

    await axios.post(`http://${node1.ip}:${PORT}/lock`);

    await sleep(SLEEP_TIME);

    statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.deep.include({
      status: SKNodeStatusType.Waiting,
      token: null,
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 0, '127.0.1.3': 0 },
    });

    expect(statuses[node2.ip]).to.deep.include({
      status: SKNodeStatusType.Locked,
      token: {
        lastGranted: { '127.0.1.1': 1, '127.0.1.2': 0, '127.0.1.3': 1 },
        queue: ['127.0.1.1'],
      },
      requestNumbers: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    await axios.post(`http://${node2.ip}:${PORT}/unlock`);

    await sleep(SLEEP_TIME);

    statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.deep.include({
      status: SKNodeStatusType.Locked,
      token: {
        lastGranted: { '127.0.1.1': 1, '127.0.1.2': 1, '127.0.1.3': 1 },
        queue: [],
      },
      requestNumbers: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node2.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    await axios.post(`http://${node1.ip}:${PORT}/unlock`);

    await sleep(SLEEP_TIME);

    statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: {
        lastGranted: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
        queue: [],
      },
      requestNumbers: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node2.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
    });

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 2, '127.0.1.2': 1, '127.0.1.3': 1 },
    });
  });

  it('should handle node crash and recovery during locking and unlocking, ensuring correct token state and request tracking', async () => {
    const node1 = await launchTestNode('127.0.1.1');
    const node2 = await launchTestNode('127.0.1.2');
    const node3 = await launchTestNode('127.0.1.3');

    nodes = [node1, node2, node3];

    await sleep(500);

    await axios.post(`http://${node3.ip}:${PORT}/lock`);

    await sleep(500);

    await axios.post(`http://${node1.ip}:${PORT}/lock`);

    await sleep(500);

    node1.process.kill();

    // Revive node1
    const node1_new = await launchTestNode('127.0.1.1');
    nodes.push(node1_new);

    await sleep(500);

    await axios.post(`http://${node3.ip}:${PORT}/unlock`);

    await sleep(500);

    let statuses = await getNodeStatuses(nodes);

    expect(statuses[node1.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: { lastGranted: { '127.0.1.1': 0, '127.0.1.2': 0, '127.0.1.3': 1 }, queue: [] },
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 0, '127.0.1.3': 1 },
    });

    expect(statuses[node2.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 0, '127.0.1.3': 1 },
    });

    expect(statuses[node3.ip]).to.deep.include({
      status: SKNodeStatusType.Idle,
      token: null,
      requestNumbers: { '127.0.1.1': 1, '127.0.1.2': 0, '127.0.1.3': 1 },
    });
  });
});
