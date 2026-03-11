const { spawnSync } = require("child_process");
const { resolve } = require("path");
const { pathToFileURL } = require("url");

const metroConfig = pathToFileURL(resolve(__dirname, "..", "metro.config.js")).href;
process.env.EXPO_OVERRIDE_METRO_CONFIG = metroConfig;

const defaultArgs = ["expo", "start", "--clear", "--dev-client", "--host", "lan", "--port", "8081"];
const extraArgs = process.argv.slice(2);

const result = spawnSync("npx", [...defaultArgs, ...extraArgs], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
