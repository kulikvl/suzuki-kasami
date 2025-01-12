export class LamportClock {
  private ts = 0;

  tick() {
    return ++this.ts;
  }

  update(ts: number) {
    this.ts = Math.max(this.ts, ts) + 1;
    return this.ts;
  }

  public get timestamp() {
    return this.ts;
  }
}
