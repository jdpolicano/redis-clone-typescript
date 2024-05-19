import Server from "./server";
import util from "util";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

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
