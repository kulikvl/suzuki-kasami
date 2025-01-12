import {
  EmptyMessage,
  MutexServiceClient,
  MutexServiceDefinition,
  MutexServiceImplementation,
} from '@src/generated/mutex';
import { Channel, createChannel, createClient, createServer, Server } from 'nice-grpc';
import { Logger } from './logger';
import { abortIf, deepCopy, sortKeysRecursively } from './utils';
import { LamportClock } from './lamportClock';

export interface Token {
  /**
   * (LN) Last request number, the most recent RN of process j for which the token was successfully granted.
   */
  lastGranted: Record<string, number>;

  /**
   * (Q) Processes waiting for the token.
   */
  queue: string[];

  /**
   * Data to be protected by the mutex.
   */
  data: number;
}

export enum NodeStatusType {
  Locked = 'Locked',
  Waiting = 'Waiting',
  Idle = 'Idle',
}

export interface NodeStatus {
  status: NodeStatusType;
  token: Token | null;
  requestNumbers: Record<string, number>;
  ip: string;
  connections: Record<string, string>;
}

interface ConnectedNode {
  channel: Channel | null;
  client: MutexServiceClient;
  status: 'up' | 'down';
}

/**
 * Node for distributed mutex using Suzuki-Kasami algorithm.
 */
export class Node {
  /**
   * (RN) Last request number received by each process.
   */
  private requestNumbers: Record<string, number>;

  /**
   * gRPC server instance.
   */
  private server: Server | null = null;

  /**
   * gRPC client connections to other nodes.
   */
  private connections: Record<string, ConnectedNode> = {};

  public token: Token | null = null;
  public isLocked: boolean = false;

  private lockPromiseResolver: (() => void) | null = null;
  private resolvedDiscoveries: Set<string> = new Set();

  public isTransferringTokenTo: string | null = null;
  public transferTokenPromiseResolver: (() => void) | null = null;

  public constructor(
    private myIp: string,
    private port: number,
    private readonly logger: Logger,
    private readonly lc: LamportClock,
    private readonly lockTimeout: number,
  ) {
    this.requestNumbers = {
      [myIp]: 0,
    };
  }

  public async init() {
    await this.initServer();
  }

  private async initServer() {
    const mutexServiceImpl: MutexServiceImplementation = {
      requestToken: async (req, _) => {
        this.lc.update(req.ts);
        await this.handleTokenRequest(req.requester, req.sequenceNumber);
        return Promise.resolve(EmptyMessage);
      },
      transferToken: (req, _) => {
        this.lc.update(req.ts);
        this.receiveToken(
          req.curHolder,
          {
            lastGranted: req.lastGranted,
            queue: req.queue,
            data: req.data,
          },
          req.curHolderReqNumbers,
        );
        return Promise.resolve(EmptyMessage);
      },
      discover: async (req, _) => {
        if (req.targetIp === this.myIp) {
          this.updateMember(req.senderIp, 'up');
        } else {
          if (this.resolvedDiscoveries.has(req.id)) return Promise.resolve(EmptyMessage);
          this.resolvedDiscoveries.add(req.id);

          this.updateMember(req.targetIp, req.targetStatus);

          await Promise.all(
            this.otherActiveIps.map(async ip => {
              try {
                await this.connections[ip].client.discover({
                  id: req.id,
                  senderIp: this.myIp,
                  targetIp: req.targetIp,
                  targetStatus: req.targetStatus,
                });
              } catch (e: any) {
                // unavailable
                if (e.code === 14) {
                }
                console.log('discover err:', e);
              }
            }),
          );
        }

        return Promise.resolve(EmptyMessage);
      },
    };

    this.server = createServer();
    this.server.add(MutexServiceDefinition, mutexServiceImpl);
    await this.server.listen(`${this.myIp}:${this.port}`);
  }

  public get otherActiveIps() {
    return Object.keys(this.connections).filter(ip => this.connections[ip].status === 'up');
  }

  public get otherIps() {
    return Object.keys(this.connections);
  }

  public get otherInactiveIps() {
    return Object.keys(this.connections).filter(ip => this.connections[ip].status === 'down');
  }

  public createToken() {
    if (this.token) return; // token already exists

    this.logger.log('Creating new token');

    const token: Token = {
      lastGranted: {},
      queue: [],
      data: 0,
    };
    [this.myIp, ...this.otherIps].forEach(ip => {
      token.lastGranted[ip] = 0;
    });
    this.token = token;
  }

  private async reportDeadNode(deadIp: string) {
    if (deadIp === this.myIp) return;
    this.logger.log(`Reporting dead node ${deadIp}`);
    this.updateMember(deadIp, 'down');
    const discoveryId = Math.random().toString();
    this.resolvedDiscoveries.add(discoveryId);
    await Promise.all(
      this.otherActiveIps.map(async ip => {
        try {
          await this.connections[ip].client.discover({
            id: discoveryId,
            senderIp: this.myIp,
            targetIp: deadIp,
            targetStatus: 'down',
          });
        } catch {}
      }),
    );
  }

  private updateMember(ip: string, status: string) {
    abortIf(ip === this.myIp, 'Cannot update self');

    const beforeStatus = this.connections[ip]?.status;

    if (status === 'up') {
      if (!this.connections[ip]) {
        this.connections[ip] = {} as any;
      }

      if (!this.connections[ip].channel) {
        const channel = createChannel(`${ip}:${this.port}`, undefined);
        const client = createClient(MutexServiceDefinition, channel);
        this.connections[ip].channel = channel;
        this.connections[ip].client = client;
      }

      this.connections[ip].status = 'up';
    } else {
      if (this.connections[ip].channel) {
        this.connections[ip].channel.close();
        this.connections[ip].channel = null;
      }

      this.connections[ip].status = 'down';
    }

    this.requestNumbers[ip] = 0;
    if (this.token) this.token.lastGranted[ip] = 0;

    if (beforeStatus !== status) {
      this.logger.log(`Updated member ${ip} to ${status}`);
    }
  }

  public async join(bootstrapIp?: string) {
    if (!bootstrapIp) return;
    this.updateMember(bootstrapIp, 'up');
    const discoveryId = Math.random().toString();
    this.resolvedDiscoveries.add(discoveryId);
    await this.connections[bootstrapIp].client.discover({
      id: discoveryId,
      senderIp: this.myIp,
      targetIp: this.myIp,
      targetStatus: 'up',
    });
  }

  public async leave() {
    if (this.isLocked) await this.unlock();
    if (this.token) {
      for (const ip of this.otherActiveIps) {
        const result = await this.transferToken(ip);
        if (result) break;
      }
    }

    const discoveryId = Math.random().toString();
    this.resolvedDiscoveries.add(discoveryId);
    await Promise.all(
      this.otherActiveIps.map(async ip => {
        try {
          await this.connections[ip].client.discover({
            id: discoveryId,
            senderIp: this.myIp,
            targetIp: this.myIp,
            targetStatus: 'down',
          });
        } catch {}
      }),
    );
  }

  public async lock() {
    abortIf(this.lockPromiseResolver !== null, 'Already waiting for token');
    abortIf(this.isLocked, 'Already locked');

    this.logger.log(`Request to lock`);

    if (this.isTransferringTokenTo !== null) {
      console.log(`LOCK: WAIT TRANSFER TOKEN PROMISE to ${this.isTransferringTokenTo}`);
      await new Promise<void>(resolve => {
        this.transferTokenPromiseResolver = resolve;
      });
    }

    this.requestNumbers[this.myIp]++;

    if (this.token && !this.isLocked) {
      this.isLocked = true;
      abortIf(this.token === null, 'Token should not be null');
      this.logger.log(`Locked (already owned token)`);
      return;
    }

    this.otherActiveIps.forEach(ip => this.sendTokenRequest(ip));

    abortIf(this.token !== null, 'Token should be null');

    try {
      await Promise.race([
        new Promise<void>(resolve => {
          this.lockPromiseResolver = resolve;
        }),
        new Promise<void>((_, reject) =>
          setTimeout(() => {
            this.logger.log(`Lock request timed out`);
            this.lockPromiseResolver = null;
            reject(new Error('Lock request timed out'));
          }, this.lockTimeout),
        ),
      ]);
    } catch {
      abortIf(true, 'Lock request timed out');
      return;
    }

    this.isLocked = true;
    abortIf(this.token === null, 'Token should not be null when locked');
    this.logger.log(`Locked (received token)`);
  }

  public async unlock() {
    abortIf(!this.isLocked, 'Not locked');
    abortIf(this.token == null, 'Token should not be null');

    this.logger.log(`Request to unlock`);

    this.isLocked = false;
    this.token!.lastGranted[this.myIp] = this.requestNumbers[this.myIp];

    let first = true;

    // add processes with RQ > LN to the queue (because if requested mutex at the time token is going in network, it is not registed by any node)
    for (const ip of this.otherActiveIps) {
      if (
        this.requestNumbers[ip] > this.token!.lastGranted[ip] &&
        !this.token!.queue.includes(ip)
      ) {
        this.token!.queue.push(ip);
        if (first) {
          console.log('FIRST:', ip);
        }
        first = false;
      }
    }

    let next = this.token!.queue.shift();
    while (next) {
      this.lc.tick();
      this.logger.log(`Try transferring token to ${next} (queue)`, this.token);
      const result = await this.transferToken(next);
      if (result) {
        this.logger.log(`Transferred token to ${next} (queue)`);
        break;
      } else {
        this.logger.log(`Failed to transfer token to ${next} (queue)`, this.token);
        next = this.token!.queue.shift();
      }
    }

    this.logger.log(`Unlocked`);
  }

  private async handleTokenRequest(requester: string, sequenceNumber: number) {
    this.logger.log(`Received token request from ${requester}`);
    abortIf(requester === this.myIp, 'Cant receive token request from self');

    this.requestNumbers[requester] = Math.max(this.requestNumbers[requester], sequenceNumber);

    if (this.token !== null && this.requestNumbers[requester] > this.token.lastGranted[requester]) {
      if (!this.isLocked) {
        if (this.isTransferringTokenTo !== null) {
          this.logger.log(
            `Already transferring token to ${this.isTransferringTokenTo}, so cant transfer to ${requester} right away`,
          );
        } else {
          this.logger.log(`Transferring token right away to ${requester}`);
          await this.transferToken(requester);
        }
      } else {
        this.logger.log(`Adding ${requester} to queue`);
        this.token.queue.push(requester);
        this.logger.log(`Queue: ${this.token.queue.join(', ')}`);
      }
    }
  }

  private receiveToken(
    curHolder: string,
    token: Token,
    curHolderReqNumbers: Record<string, number>,
  ) {
    this.logger.log(`Received token from ${curHolder} - ${JSON.stringify(token)}`);

    abortIf(curHolder === this.myIp, 'Cant receive token from self');
    abortIf(this.token !== null, 'Token should be null');
    abortIf(this.isLocked, 'Should be unlocked');

    this.token = token;

    const ips = new Set([...Object.keys(curHolderReqNumbers), this.myIp, ...this.otherActiveIps]);

    ips.forEach(ip => {
      this.requestNumbers[ip] = Math.max(
        this.requestNumbers[ip] ?? 0,
        curHolderReqNumbers[ip] ?? 0,
      );
    });

    if (this.lockPromiseResolver) {
      this.lockPromiseResolver();
      this.lockPromiseResolver = null;
    }

    // sync down nodes
    this.otherInactiveIps.forEach(ip => {
      this.requestNumbers[ip] = 0;
      this.token!.lastGranted[ip] = 0;
    });
  }

  private async sendTokenRequest(receiver: string) {
    this.lc.tick();
    this.logger.log(`Sending token request to ${receiver}`);

    abortIf(this.token !== null, 'Token should be null');
    abortIf(this.isLocked, 'Should be unlocked');
    abortIf(receiver === this.myIp, 'Cant send token request to self');

    try {
      await this.connections[receiver].client.requestToken({
        requester: this.myIp,
        sequenceNumber: this.requestNumbers[this.myIp],
        ts: this.lc.timestamp,
      });
    } catch (e) {
      this.logger.log(`Error sending token request to ${receiver}`);
      await this.reportDeadNode(receiver);
    }
  }

  private async transferToken(receiver: string) {
    abortIf(this.token === null, 'Token should not be null');
    abortIf(this.isLocked, 'Should be unlocked');
    abortIf(receiver === this.myIp, 'Cant transfer token to self');
    abortIf(
      this.isTransferringTokenTo !== null,
      `Already transferring token to ${this.isTransferringTokenTo}, cannot transfer to ${receiver}`,
    );

    this.lc.tick();
    this.logger.log(`Transferring token to ${receiver}`);
    this.isTransferringTokenTo = receiver;

    try {
      const copyToken = deepCopy(this.token!);

      await this.connections[receiver].client.transferToken({
        curHolder: this.myIp,
        curHolderReqNumbers: this.requestNumbers,
        ts: this.lc.timestamp,
        lastGranted: copyToken.lastGranted,
        data: copyToken.data,
        queue: copyToken.queue,
      });

      this.logger.log(`Token successfully transferred to ${receiver}`);
      this.token = null;
    } catch (e) {
      this.logger.log(`Error transferring token to ${receiver}`);
      await this.reportDeadNode(receiver);
      return false;
    } finally {
      this.isTransferringTokenTo = null;
      if (this.transferTokenPromiseResolver) {
        this.transferTokenPromiseResolver();
        this.transferTokenPromiseResolver = null;
      }
    }

    return true;
  }

  public get status(): NodeStatus {
    let status: NodeStatusType;

    if (this.isLocked) status = NodeStatusType.Locked;
    if (!this.isLocked && this.lockPromiseResolver != null) status = NodeStatusType.Waiting;
    if (!this.isLocked && this.lockPromiseResolver == null) status = NodeStatusType.Idle;

    return sortKeysRecursively({
      status: status!,
      token: this.token,
      requestNumbers: this.requestNumbers,
      ip: this.myIp,
      connections: Object.keys(this.connections).reduce(
        (acc, ip) => {
          acc[ip] = this.connections[ip].status;
          return acc;
        },
        {} as Record<string, string>,
      ),
    });
  }
}
