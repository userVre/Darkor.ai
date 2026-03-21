const { spawnSync } = require("child_process");
const { resolve } = require("path");
const { pathToFileURL } = require("url");
const { resolvePort, tryAdbReverse } = require("./dev-server-utils.cjs");

async function main() {
  const metroConfig = pathToFileURL(resolve(__dirname, "..", "metro.config.js")).href;
  process.env.EXPO_OVERRIDE_METRO_CONFIG = metroConfig;

  const { port, autoSelected } = await resolvePort();
  const portString = String(port);

  if (autoSelected) {
    console.log(`[dev] Port 8081 is busy, using ${portString} instead`);
  }

  let host = process.env.EXPO_DEV_HOST;
  let adbOk = false;

  if (!host) {
    adbOk = tryAdbReverse(portString);
    host = adbOk ? "127.0.0.1" : "10.0.2.2";
  }

  const serverUrl = `http://${host}:${portString}`;
  console.log(`[dev] Expo dev server: ${serverUrl} (adb reverse ${adbOk ? "ok" : "off"})`);

  process.env.EXPO_DEV_CLIENT_SERVER_URL = serverUrl;
  process.env.EXPO_PACKAGER_PROXY_URL = serverUrl;
  process.env.EXPO_PACKAGER_HOSTNAME = host;
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = host;
  process.env.EXPO_DEV_PORT = portString;

  const defaultArgs = ["expo", "start", "--clear", "--dev-client", "--host", "localhost", "--port", portString];
  const extraArgs = process.argv.slice(2);

  const result = spawnSync("npx", [...defaultArgs, ...extraArgs], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
