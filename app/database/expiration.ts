export type Metric = "ms" | "sec";

export default class Expiration {
  private timestamp: number;

  constructor(ttl: number, metric: Metric) {
    this.timestamp =
      metric === "ms" ? Date.now() + ttl : Date.now() + ttl * 1000;
  }

  public isExpired(): boolean {
    return Date.now() > this.timestamp;
  }
}
