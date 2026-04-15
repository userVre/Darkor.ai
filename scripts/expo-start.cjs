const fs = require("fs");
const { spawnSync } = require("child_process");
const { resolve } = require("path");
const { pathToFileURL } = require("url");
const { getExpoDevServerStatus, resolvePort, setupAdbReverse } = require("./dev-server-utils.cjs");

async function main() {
  const projectRoot = resolve(__dirname, "..");
  const metroConfig = pathToFileURL(resolve(projectRoot, "metro.config.js")).href;
  process.env.EXPO_OVERRIDE_METRO_CONFIG = metroConfig;
  process.env.EXPO_DEV_PORT = process.env.EXPO_DEV_PORT || "8081";
  process.env.NODE_ENV = process.env.NODE_ENV || "development";
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--dns-result-order=ipv4first"].filter(Boolean).join(" ");

  const preferredPort = Number(process.env.EXPO_DEV_PORT || "8081");
  const existingServer = await getExpoDevServerStatus(preferredPort);
  const { port, autoSelected } = existingServer.isExpoServer
    ? { port: preferredPort, autoSelected: false }
    : await resolvePort();
  const portString = String(port);

  if (autoSelected) {
    console.error(`[dev] Port 8081 is unavailable; stop the conflicting process before starting Metro.`);
    process.exit(1);
  }

  let host = process.env.EXPO_DEV_HOST;
  let adbOk = false;

  if (!host) {
    const reverse = setupAdbReverse(portString);
    adbOk = reverse.ok;
    const compatibilityAliases = reverse.activeAliases.filter((alias) => alias !== `${portString}->${portString}`);
    if (compatibilityAliases.length > 0) {
      console.log(`[dev] ADB reverse aliases active: ${compatibilityAliases.join(", ")}`);
    }
    host = adbOk ? "127.0.0.1" : "10.0.2.2";
  }

  const serverUrl = `http://${host}:${portString}`;
  console.log(`[dev] Expo dev server: ${serverUrl} (adb reverse ${adbOk ? "ok" : "off"})`);

  process.env.EXPO_DEV_CLIENT_SERVER_URL = serverUrl;
  process.env.EXPO_PACKAGER_PROXY_URL = serverUrl;
  process.env.EXPO_DEV_PORT = portString;

  if (existingServer.isExpoServer && port === preferredPort) {
    console.log(`[dev] Reusing existing Expo dev server on port ${portString}.`);
    process.exit(0);
  }

  const expoHostMode = adbOk ? "localhost" : "lan";
  const defaultArgs = ["expo", "start", "--dev-client", "--host", expoHostMode, "--port", portString];
  const extraArgs = process.argv.slice(2).filter((arg) => arg !== "--non-interactive");

  const result = spawnSync("npx", [...defaultArgs, ...extraArgs], {
    stdio: "inherit",
    shell: true,
    env: process.env,
    cwd: projectRoot,
  });

  process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

