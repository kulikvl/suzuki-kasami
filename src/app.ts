import { Logger } from './logger';
import { Node } from './node';
import express from 'express';
import config from './config';
import { sleep } from './utils';
import { LamportClock } from './lamportClock';

async function start() {
  console.log(`Starting node ${config.myIp}...`);

  const lc = new LamportClock();
  const logger = new Logger(config.myIp, lc);
  const node = new Node(config.myIp, config.rpcPort, logger, lc, config.lockTimeout);
  await node.init();

  let delay = 0;

  const app = express();
  app.use(express.json());

  app.use(async (req, _, next) => {
    if (req.method === 'POST' && req.url !== 'delay') await sleep(delay);
    next();
  });

  app.get('/status', (_, res) => {
    JSON.stringify(node.status, Object.keys(node.status).sort(), 2);
    const status = JSON.stringify(node.status, null, 2);
    res.send(status).status(200);
  });

  app.post('/lock', async (_, res) => {
    await node.lock();
    res.sendStatus(200);
  });

  app.post('/token', (_, res) => {
    node.createToken();
    res.sendStatus(200);
  });

  app.post('/unlock', async (_, res) => {
    await node.unlock();
    res.sendStatus(200);
  });

  app.post('/delay', (req, res) => {
    delay = req.body.value;
    res.sendStatus(200);
  });

  app.post('/set', async (req, res) => {
    if (node.isLocked) {
      if (node.token === null) throw new Error('APP: Token is null');
      node.token.data = req.body.value;
      res.sendStatus(200);
      return;
    }

    // Autolock
    console.log('AUTOLOCK');
    try {
      await node.lock();
      node.token!.data = req.body.value;
      res.sendStatus(200);
    } catch {
      res.sendStatus(500);
    } finally {
      await node.unlock();
    }
  });

  app.get('/get', async (_, res) => {
    if (node.isLocked) {
      if (node.token === null) throw new Error('APP: Token is null');
      res.send({ value: node.token.data }).status(200);
      return;
    }

    // Autolock
    console.log('AUTOLOCK');
    try {
      await node.lock();
      res.send({ value: node.token!.data }).status(200);
    } catch {
      res.sendStatus(500);
    } finally {
      await node.unlock();
    }
  });

  app.post('/join', (req, res) => {
    node.join(req.body.bootstrapIp);
    res.sendStatus(200);
  });

  app.post('/leave', async (_, res) => {
    await node.leave();
    res.sendStatus(200);
    process.exit(0);
  });

  app.post('/kill', (_, res) => {
    res.sendStatus(200);
    process.exit(0);
  });

  app.listen(config.appPort, config.myIp, async () => {
    console.log(`Express server ${config.myIp}:${config.appPort} is ready`);
  });
}

start().catch(e => {
  console.log('App crushed:', e.message);
  process.exit(1);
});
