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
        const { numClients, maxWaitTime } = this.options;
        this.reply(() => this.ctx.connection.writeResp(RespBuilder.integer(this.ctx.replicationStream.getReplicas().length.toString())));
        // const payload = RespEncoder.encodeResp(
        //     RespBuilder.bulkStringArray(["replconf", "getack", "*"])
        // );
        // console.log(`payload: ${payload}`);
        // this.ctx.replicationStream.replicate(Buffer.from(payload));
        // console.log("replicated payload");
        // this.ctx.serverInfo.incrementMasterReplOffset(payload.length);
        // this.ctx.replicationStream.updateAckOffsets(); // begin polling for acks
        // // set a callback to be called when the number of clients is reached
        // // using process.nextTick to simulate the async nature of the command
        // await new Promise(async (resolve) => {
        //     const wait_interval = Math.min(maxWaitTime / 10, 100); // lets try ten times...
        //     while (Date.now() - executionStart < maxWaitTime) {
        //         const replicas = this.ctx.replicationStream.getReplicas();
        //         console.log(replicas.map((replica, idx) => `i: ${idx}, ${replica.getLastKnownOffset()}`));
        //         const countGreaterThanWaitParam = replicas.filter((replica) => replica.getLastKnownOffset() >= currStreamIdx).length;
        //         if (countGreaterThanWaitParam >= numClients) {
        //             this.reply(() => this.ctx.connection.writeResp(RespBuilder.integer(countGreaterThanWaitParam.toString())));
        //             resolve(void 0);
        //             return;
        //         }
        //         await new Promise((resolve) => setTimeout(resolve, wait_interval));
        //     };
        //     this.reply(() => this.ctx.connection.writeResp(RespBuilder.integer("0")));
        //     resolve(void 0);
        // });
            
        return Transaction.Other; 
    }
}