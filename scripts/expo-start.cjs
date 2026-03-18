const { spawnSync } = require("child_process");
const { resolve } = require("path");
const { pathToFileURL } = require("url");

const metroConfig = pathToFileURL(resolve(__dirname, "..", "metro.config.js")).href;
process.env.EXPO_OVERRIDE_METRO_CONFIG = metroConfig;

const host = process.env.EXPO_DEV_HOST || "127.0.0.1";
const port = process.env.EXPO_DEV_PORT || "8081";
const serverUrl = `http://${host}:${port}`;

process.env.EXPO_DEV_CLIENT_SERVER_URL = serverUrl;
process.env.EXPO_PACKAGER_HOSTNAME = host;
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = host;

const defaultArgs = ["expo", "start", "--clear", "--dev-client", "--host", "localhost", "--port", port];
const extraArgs = process.argv.slice(2);

const result = spawnSync("npx", [...defaultArgs, ...extraArgs], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
