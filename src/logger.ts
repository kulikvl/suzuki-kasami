import fs from 'fs';

class LamportClock {
  private ts = 0;

  tick() {
    return ++this.ts;
  }

  update(receivedTimestamp: number) {
    this.ts = Math.max(this.ts, receivedTimestamp) + 1;
    return this.ts;
  }

  public get timestamp() {
    return this.ts;
  }
}

export class Logger {
  public lamportClock = new LamportClock();

  public constructor(
    public instance: string,
    public filePath: string,
  ) {}

  public log(message: string, ts?: number) {
    if (ts) this.lamportClock.update(ts);
    this.lamportClock.tick();
    const logEntry = `[${this.lamportClock.timestamp}] [Node ${this.instance}] ${message}\n`;
    fs.appendFileSync(this.filePath, logEntry);
  }
}
