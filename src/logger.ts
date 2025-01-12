import { LamportClock } from './lamportClock';

export class Logger {
  public constructor(
    private readonly instance: string,
    private readonly lc: LamportClock,
  ) {}

  public log(...message: any) {
    // const logEntry = `[${new Date().toISOString()}] [LC:${this.lc.timestamp}] [${this.instance}] - ${message}`;
    console.log(`[${new Date().toISOString()}] [${this.instance}] -`, ...message);
    // fs.appendFileSync('example.log', logEntry);
  }
}
