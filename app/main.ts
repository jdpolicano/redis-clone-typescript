import Server from "./server";
import util from "util";

const args = util.parseArgs({
    args: process.argv,
    options: {
        port: {
            type: "string",
            short: "p",
            default: "6379"
        },

        replicaof: {
            type: "string"
        },

        dir: {
            type: "string",
            default: "./tmp/redis-files"
        },

        dbfilename: {
            type: "string",
            default: "dump.rdb"
        }
    },

    allowPositionals: true
});

// becaused of default it should never be undefined...
const server = new Server(args.values);
server.start();
