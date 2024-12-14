import { Logger } from './logger';
import { SKNode } from './sknode';
import bodyParser from 'body-parser';
import express from 'express';
import axios from 'axios';
import config from './config';
import { scanSubnetForActiveHosts } from './utils';

async function start() {
  console.log(`Starting node ${config.localIp}...`);

  let peerIps = await scanSubnetForActiveHosts(config.subnet, config.localIp, config.appPort, 500);

  const logger = new Logger(config.localIp, config.logFilePath);
  const sknode = new SKNode(config.localIp, peerIps, config.rpcPort, logger, config.lockTimeout);
  await sknode.init();

  if (peerIps.length === 0) {
    // first node in the cluster
    sknode.createToken();
  }

  const app = express();
  app.use(bodyParser.json());

  app.post('/update', async (req, res) => {
    peerIps = await scanSubnetForActiveHosts(config.subnet, config.localIp, config.appPort, 500);
    sknode.updatePeers(peerIps);
    res.sendStatus(200);
  });

  app.get('/status', (req, res) => {
    const status = JSON.stringify(sknode.status, null, 2);
    res.send(status);
  });

  app.post('/lock', (req, res) => {
    sknode.lock();
    res.sendStatus(200);
  });

  app.post('/unlock', (req, res) => {
    sknode.unlock();
    res.sendStatus(200);
  });

  app.post('/exit', (req, res) => {
    res.sendStatus(200);
    process.exit(0);
  });

  app.listen(config.appPort, config.localIp, async () => {
    await Promise.all(
      peerIps.map(ip => {
        axios.post(`http://${ip}:${config.appPort}/update`).catch(e => {
          /* noop */
        });
      }),
    );
    console.log(`Node ${config.localIp} is ready`);
  });
}

start().catch(e => {
  console.log('App crushed:', e.message);
  process.exit(1);
});
