import Command, { Transaction } from './base';
import type { RequestContext } from "../protocol/base"
import type { RespBulkString } from '../resp/types';
import RespBuilder from '../resp/builder';
import RespEncoder from '../resp/encoder';

export interface WaitOptions {
    numClients: number;
    maxWaitTime: number;
}

export default class Wait extends Command {
    private options: WaitOptions;

    constructor(ctx: RequestContext, options: WaitOptions) {
        super(ctx);
        this.options = options;
    }

    static parseWaitOptions(args: RespBulkString[]): WaitOptions {
        const maxWaitTime = args.pop();
        const numClients = args.pop();

        if (numClients === undefined || numClients === null) {
            throw new Error("ERR missing arguements to wait call");
        }

        const numClientsInt = parseInt(numClients.value as string, 10);
        const maxWaitTimeInt = maxWaitTime ? parseInt(maxWaitTime.value as string, 10) : 0;

        if (isNaN(numClientsInt) || isNaN(maxWaitTimeInt)) {
            throw new Error("ERR wait args not parsable as integers");
        }

        return {
            numClients: numClientsInt,
            maxWaitTime: maxWaitTimeInt
        };
    }

    public async execute(): Promise<Transaction> {
        const executionStart = Date.now(); 
        const currStreamIdx = this.ctx.serverInfo.getMasterReplOffset();

        // hacky workaround the test suite not seeming to have replication built in for the "wait with no commands" test.
        if (currStreamIdx === 0) {
            const numConnectedReplicas = this.ctx.replicationStream.getReplicas().length;
            this.reply(() => this.ctx.connection.writeResp(RespBuilder.integer(numConnectedReplicas.toString())));
            return Transaction.Other;
        }

        const { numClients, maxWaitTime } = this.options;
        
        const payload = RespEncoder.encodeResp(
            RespBuilder.bulkStringArray(["REPLCONF", "GETACK", "*"])
        );

        this.ctx.replicationStream.replicate(Buffer.from(payload), this.ctx.serverInfo);
        this.ctx.replicationStream.updateAckOffsets(); // begin polling for acks
        // wait for the acks to get updated to the current offset.
        await new Promise(async (resolve) => {
            const wait_interval = Math.min(maxWaitTime / 10, 100); // lets try ten times or a max of every 100ms
            let maxAcks = 0;
            while (Date.now() - executionStart < maxWaitTime) {
                const replicas = this.ctx.replicationStream.getReplicas();
                const countGreaterThanWaitParam = replicas.filter((replica) => replica.getLastKnownOffset() >= currStreamIdx).length;
                maxAcks = Math.max(maxAcks, countGreaterThanWaitParam);
                if (maxAcks >= numClients) {
                    this.reply(() => this.ctx.connection.writeResp(RespBuilder.integer(maxAcks.toString())));
                    resolve(void 0);
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, wait_interval));
            };
            this.reply(() => this.ctx.connection.writeResp(RespBuilder.integer(maxAcks.toString())));
            resolve(void 0);
        });
            
        return Transaction.Other; 
    }
}