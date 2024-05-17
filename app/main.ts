import * as net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const server = net.createServer((connection: net.Socket) => {
    connection.on("data", (buffer) => {
        const message = buffer.toString();
        console.log(message);
        connection.write("+PONG\r\n");
    })
});

server.listen(6379, "127.0.0.1");
