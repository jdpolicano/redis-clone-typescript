import Server from "./server";
import util from "util";

const args = util.parseArgs({
    args: Bun.argv,
    options: {
        port: {
            type: "string",
            short: "p",
            default: "6379"
        },

        replicaof: {
            type: "string"
        }
    },
    allowPositionals: true
});

// becaused of default it should never be undefined...
const server = new Server(args.values);
server.start();
