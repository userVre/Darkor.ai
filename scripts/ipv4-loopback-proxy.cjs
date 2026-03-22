const net = require("net");

const listenPort = Number(process.argv[2] || "8081");
const targetPort = Number(process.argv[3] || String(listenPort));
const targetHost = process.argv[4] || "::1";

const server = net.createServer((clientSocket) => {
  const upstream = net.connect({ host: targetHost, port: targetPort });

  upstream.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => upstream.destroy());

  clientSocket.pipe(upstream);
  upstream.pipe(clientSocket);
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});

server.listen(listenPort, "127.0.0.1", () => {
  console.log(`[proxy] 127.0.0.1:${listenPort} -> [${targetHost}]:${targetPort}`);
});
