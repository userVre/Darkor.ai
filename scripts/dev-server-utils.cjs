const http = require("http");
const net = require("net");
const { spawnSync } = require("child_process");

const DEFAULT_DEV_PORT_ALIASES = ["8081", "8082", "8083", "8084", "8085"];

function isHostPortOpen(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(250);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function isPortAvailable(port) {
  const ipv4Open = await isHostPortOpen(port, "127.0.0.1");
  if (ipv4Open) return false;

  const ipv6Open = await isHostPortOpen(port, "::1");
  return !ipv6Open;
}

function getExpoDevServerStatus(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host,
        port,
        path: "/status",
        timeout: 800,
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        });

        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8").trim();
          resolve({
            ok: response.statusCode === 200,
            isExpoServer: body.includes("packager-status:running"),
            body,
          });
        });
      },
    );

    request.on("timeout", () => {
      request.destroy();
      resolve({ ok: false, isExpoServer: false, body: "" });
    });

    request.on("error", () => {
      resolve({ ok: false, isExpoServer: false, body: "" });
    });
  });
}

async function waitForExpoDevServer(port, options = {}) {
  const {
    host = "127.0.0.1",
    timeoutMs = 45000,
    pollIntervalMs = 500,
  } = options;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = await getExpoDevServerStatus(port, host);
    if (status.isExpoServer) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return false;
}

async function resolvePort() {
  const explicitPort = process.env.EXPO_DEV_PORT;
  const preferredPort = Number(explicitPort || "8081");

  if (explicitPort) {
    return { port: preferredPort, autoSelected: false };
  }

  for (let port = preferredPort; port < preferredPort + 20; port += 1) {
    if (await isPortAvailable(port)) {
      return { port, autoSelected: port !== preferredPort };
    }
  }

  return { port: preferredPort, autoSelected: false };
}

function tryAdbReverse(remotePort, localPort = remotePort) {
  const result = spawnSync("adb", ["reverse", `tcp:${remotePort}`, `tcp:${localPort}`], {
    stdio: "ignore",
    shell: true,
  });
  return result.status === 0;
}

function setupAdbReverse(localPort) {
  const aliases = new Set([String(localPort), ...DEFAULT_DEV_PORT_ALIASES]);
  let primaryOk = false;
  const activeAliases = [];

  for (const remotePort of aliases) {
    const ok = tryAdbReverse(remotePort, localPort);
    if (remotePort === String(localPort)) {
      primaryOk = ok;
    }
    if (ok) {
      activeAliases.push(`${remotePort}->${localPort}`);
    }
  }

  return {
    primaryOk,
    ok: primaryOk || activeAliases.length > 0,
    activeAliases,
  };
}

module.exports = {
  getExpoDevServerStatus,
  resolvePort,
  setupAdbReverse,
  waitForExpoDevServer,
};
