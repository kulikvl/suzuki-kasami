import { MutexClient, MutexDefinition, MutexServiceImplementation } from '@src/generated/mutex';
import { Channel, Client, createChannel, createClient, createServer, Server } from 'nice-grpc';

interface Token {
  LN: number[]; // Last Request Number
  Q: number[]; // Queue of process ids
}

export class Node {
  public server: Server | null = null;
  public clients: (MutexClient | null)[] = [];
  private lockPromiseResolve: (() => void) | null = null;

  public constructor(
    public nodeId: number,
    public RN: number[], // Request Number
    public token: Token | null,
    public isLocked: boolean = false,
  ) {}

  public init() {
    this.initServer();
    this.initClient();
  }

  public initServer() {
    const mutexServiceImpl: MutexServiceImplementation = {
      requestToken: async (req, ctx) => {
        await this.receiveTokenRequest(req.nodeId, req.seq);
        return Promise.resolve({});
      },
      sendToken: async (req, ctx) => {
        await this.receiveToken(req.nodeId, { LN: req.LN, Q: req.Q });
        return Promise.resolve({});
      },
    };

    this.server = createServer();

    this.server.add(MutexDefinition, mutexServiceImpl);

    this.server
      .listen(`localhost:${4000 + this.nodeId}`)
      .then(port => {
        console.log(`Server listening on port ${port}`);
      })
      .catch(e => {
        console.error('Server error:', e);
      });
  }

  public initClient() {
    for (let i = 0; i < this.RN.length; i++) {
      if (i === this.nodeId) continue;

      const channel = createChannel(`localhost:${4000 + this.RN[i]}`);
      const client: MutexClient = createClient(MutexDefinition, channel);
      this.clients[i] = client;
    }
  }

  public async lock(): Promise<void> {
    if (this.isLocked) {
      throw new Error('Already locked');
    }

    if (this.token && !this.isLocked) {
      this.isLocked = true;
      return;
    }

    this.RN[this.nodeId]++;

    for (let i = 0; i < this.RN.length; i++) {
      await this.sendTokenRequest(i);
    }

    // should be blocked here until token is received by calling handleReceiveToken function in the same class

    await new Promise<void>(resolve => {
      this.lockPromiseResolve = resolve;
    });

    // Execution resumes here after the Promise is resolved
    this.isLocked = true;
  }

  public async unlock(): Promise<void> {
    if (!this.token) {
      throw new Error('No token to unlock');
    }

    this.isLocked = false;
    this.token.LN[this.nodeId] = this.RN[this.nodeId];

    for (let i = 0; i < this.RN.length; i++) {
      if (this.RN[i] === this.token.LN[i] + 1) {
        this.token.Q.push(i);
      }
    }
  }

  public async receiveTokenRequest(senderId: number, seq: number): Promise<void> {
    console.log('Received token request from', senderId, 'with seq', seq);

    this.RN[senderId] = Math.max(this.RN[senderId], seq);

    if (
      this.token !== null &&
      !this.isLocked &&
      this.RN[senderId] === this.token.LN[senderId] + 1
    ) {
      // await this.sendToken(senderId);
    }
  }

  public async receiveToken(receiverId: number, token: Token): Promise<void> {
    console.log('Received token from', receiverId, 'with token', token);

    // Process the received token
    this.token = token;

    // If there is a pending lock, resolve it
    if (this.lockPromiseResolve) {
      this.lockPromiseResolve();
      this.lockPromiseResolve = null;
    }
  }

  public async sendTokenRequest(receiverId: number): Promise<void> {
    console.log('Sending token request to', receiverId);

    await this.clients[receiverId]?.requestToken({
      nodeId: this.nodeId,
      seq: this.RN[this.nodeId],
    });
  }

  public async sendToken(receiverId: number): Promise<void> {
    console.log('Sending token to', receiverId);

    if (!this.token) {
      throw new Error('No token to send');
    }

    await this.clients[receiverId]?.sendToken({
      nodeId: this.nodeId,
      LN: this.token.LN,
      Q: this.token.Q,
    });
  }
}
