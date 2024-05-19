export type Metric = "ms" | "sec";

export default class Expiration {
    private ttl: number; 
    private metric: Metric;
    private timestamp: number;

    constructor(ttl: number, metric: Metric) {
        this.ttl = ttl;
        this.metric = metric;
        this.timestamp = Date.now();
    }

    public isExpired(): boolean {
        const diff = Date.now() - this.timestamp;
        if (this.metric === "ms") {
            return diff >= this.ttl;
        } else if (this.metric === "sec") {
            return diff >= this.ttl * 1000;
        }

        return false;
    }
}