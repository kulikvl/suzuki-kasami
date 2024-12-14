import {
  EmptyMessage,
  MutexServiceClient,
  MutexServiceDefinition,
  MutexServiceImplementation,
} from '@src/generated/mutex';
import { createChannel, createClient, createServer, Server } from 'nice-grpc';
import { Logger } from './logger';

export interface Token {
  /**
   * (LN) Last request number, the most recent RN of process j for which the token was successfully granted.
   */
  lastGranted: Record<string, number>;

  /**
   * (Q) Processes waiting for the token.
   */
  queue: string[];
}

export enum SKNodeStatusType {
  Locked = 'Locked',
  Waiting = 'Waiting',
  Idle = 'Idle',
}

export interface SKNodeStatus {
  status: SKNodeStatusType;
  pid: number;
  token: Token | null;
  requestNumbers: Record<string, number>;
}

/**
 * Suzuki-Kasami Node for distributed mutex.
 */
export class SKNode {
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
  private clientConnections: Record<string, MutexServiceClient> = {};

  private token: Token | null = null;
  private isLocked: boolean = false;
  private lockPromiseResolver: (() => void) | null = null;

  public constructor(
    private localIp: string,
    private peerIps: string[],
    private rpcPort: number,
    private readonly logger: Logger,
    private readonly lockTimeout: number,
  ) {
    this.requestNumbers = {};
    [this.localIp, ...this.peerIps].forEach(ip => {
      this.requestNumbers[ip] = 0;
    });
  }

  public async init() {
    await this.initServer();
    this.initClients();
  }

  private async initServer() {
    const mutexServiceImpl: MutexServiceImplementation = {
      requestToken: async (req, ctx) => {
        await this.handleTokenRequest(req.requester, req.sequenceNumber, req.ts);
        return Promise.resolve(EmptyMessage);
      },
      transferToken: (req, ctx) => {
        this.receiveToken(
          req.curHolder,
          {
            lastGranted: req.lastGranted,
            queue: req.queue,
          },
          req.curHolderReqNumbers,
          req.ts,
        );
        return Promise.resolve(EmptyMessage);
      },
    };

    this.server = createServer();
    this.server.add(MutexServiceDefinition, mutexServiceImpl);
    await this.server.listen(`${this.localIp}:${this.rpcPort}`);
  }

  private initClients() {
    this.peerIps.forEach(ip => {
      const channel = createChannel(`${ip}:${this.rpcPort}`);
      const client: MutexServiceClient = createClient(MutexServiceDefinition, channel);
      this.clientConnections[ip] = client;
    });
  }

  public createToken() {
    if (this.token) return; // token already exists

    this.logger.log('Creating new token');

    const token: Token = {
      lastGranted: {},
      queue: [],
    };
    [this.localIp, ...this.peerIps].forEach(ip => {
      token.lastGranted[ip] = 0;
    });
    this.token = token;
  }

  public updatePeers(updatedPeerIps: string[]) {
    const newPeerIps = updatedPeerIps.filter(ip => !this.peerIps.includes(ip));

    for (const ip of newPeerIps) {
      this.clientConnections[ip] ??= createClient(
        MutexServiceDefinition,
        createChannel(`${ip}:${this.rpcPort}`),
      );
      this.requestNumbers[ip] ??= 0;
      if (this.token) this.token.lastGranted[ip] ??= 0;
    }

    this.peerIps = updatedPeerIps;
  }

  public async lock() {
    if (this.lockPromiseResolver != null) return; // already waiting for token
    if (this.isLocked) return; // already locked

    this.logger.log(`Request to lock`);
    this.requestNumbers[this.localIp]++;

    if (this.token && !this.isLocked) {
      this.isLocked = true;
      this.logger.log(`Locked (already owned token)`);
      return true;
    }

    this.peerIps.forEach(ip => this.sendTokenRequest(ip));

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
    } catch (_) {
      return false;
    }

    this.isLocked = true;
    this.logger.log(`Locked (received token)`);
    return true;
  }

  public async unlock() {
    if (!this.isLocked) return; // not locked
    if (!this.token) return; // no token to unlock

    this.logger.log(`Request to unlock`);

    this.isLocked = false;
    this.token.lastGranted[this.localIp] = this.requestNumbers[this.localIp];

    let next = this.token.queue.shift();
    while (next) {
      const result = await this.transferToken(next);
      if (result) break;
      next = this.token.queue.shift();
    }

    this.logger.log(`Unlocked`);
  }

  private async handleTokenRequest(requester: string, sequenceNumber: number, ts: number) {
    this.logger.log(`Received token request from ${requester}`, ts);

    this.requestNumbers[requester] = Math.max(this.requestNumbers[requester], sequenceNumber);

    if (
      this.token !== null &&
      !this.isLocked &&
      this.requestNumbers[requester] > this.token.lastGranted[requester]
    ) {
      await this.transferToken(requester);
      return;
    }

    if (
      this.token !== null &&
      this.isLocked &&
      this.requestNumbers[requester] > this.token.lastGranted[requester]
    ) {
      this.token.queue.push(requester);
    }
  }

  private receiveToken(
    curHolder: string,
    token: Token,
    curHolderReqNumbers: Record<string, number>,
    ts: number,
  ) {
    this.logger.log(`Received token from ${curHolder}`, ts);

    this.token = token;

    const ips = new Set([...Object.keys(curHolderReqNumbers), this.localIp, ...this.peerIps]);

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
  }

  private sendTokenRequest(receiver: string) {
    this.logger.log(`Sending token request to ${receiver}`);

    this.clientConnections[receiver]
      .requestToken({
        requester: this.localIp,
        sequenceNumber: this.requestNumbers[this.localIp],
        ts: this.logger.lamportClock.timestamp,
      })
      .catch(e => this.logger.log(`Error sending token request to ${receiver}`));
  }

  private async transferToken(receiver: string) {
    if (!this.token) throw new Error('No token to send');

    this.logger.log(`Transferring token to ${receiver}`);

    try {
      await this.clientConnections[receiver].transferToken({
        curHolder: this.localIp,
        curHolderReqNumbers: this.requestNumbers,
        lastGranted: this.token.lastGranted,
        queue: this.token.queue,
        ts: this.logger.lamportClock.timestamp,
      });

      this.token = null;
    } catch (e) {
      this.logger.log(`Error transferring token to ${receiver}`);
      return false;
    }

    return true;
  }

  public get status(): SKNodeStatus {
    let status: SKNodeStatusType;

    if (this.isLocked) status = SKNodeStatusType.Locked;
    if (!this.isLocked && this.lockPromiseResolver != null) status = SKNodeStatusType.Waiting;
    if (!this.isLocked && this.lockPromiseResolver == null) status = SKNodeStatusType.Idle;

    return {
      status: status!,
      pid: process.pid,
      token: this.token,
      requestNumbers: this.requestNumbers,
    };
  }
}
