const fs = require("fs");
const { spawnSync } = require("child_process");
const { resolve } = require("path");
const { pathToFileURL } = require("url");
const { resolvePort, setupAdbReverse } = require("./dev-server-utils.cjs");

async function main() {
  const projectRoot = resolve(__dirname, "..");
  const metroConfig = pathToFileURL(resolve(projectRoot, "metro.config.js")).href;
  process.env.EXPO_OVERRIDE_METRO_CONFIG = metroConfig;

  const { port, autoSelected } = await resolvePort();
  const portString = String(port);

  if (autoSelected) {
    console.log(`[dev] Port 8081 is busy, using ${portString} instead`);
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

  console.log(`[dev] Android dev server: http://${host}:${portString} (adb reverse ${adbOk ? "ok" : "off"})`);
  process.env.EXPO_DEV_CLIENT_SERVER_URL = `http://${host}:${portString}`;
  process.env.EXPO_PACKAGER_PROXY_URL = `http://${host}:${portString}`;
  process.env.EXPO_PACKAGER_HOSTNAME = host;
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = host;
  process.env.EXPO_DEV_PORT = portString;
  process.env.EXPO_ANDROID_ARCHITECTURES = "x86_64";
  process.env.REACT_NATIVE_DISABLE_LTO = "1";

  const envKeys = [
    "GEMINI_API_KEY",
    "EXPO_PUBLIC_API_BASE_URL",
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "EXPO_PUBLIC_CONVEX_URL",
    "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
    "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
  ];
  const present = envKeys.filter((key) => !!process.env[key]);
  console.log(`env: verified ${present.length ? present.join(" ") : "none"}`);

  const gradlePropsPath = resolve(projectRoot, "android", "gradle.properties");
  if (fs.existsSync(gradlePropsPath)) {
    const patchProp = (content, key, value) => {
      const line = `${key}=${value}`;
      if (new RegExp(`^${key}=`, "m").test(content)) {
        return content.replace(new RegExp(`^${key}=.*$`, "m"), line);
      }
      return content.trimEnd() + "\n" + line + "\n";
    };

    let props = fs.readFileSync(gradlePropsPath, "utf8");
    props = patchProp(
      props,
      "org.gradle.jvmargs",
      "-Xmx1536m -Xms128m -XX:MaxMetaspaceSize=384m -XX:ReservedCodeCacheSize=128m -Dfile.encoding=UTF-8 -Dkotlin.daemon.jvm.options=-Xmx768m",
    );
    props = patchProp(props, "org.gradle.workers.max", "1");
    props = patchProp(props, "org.gradle.parallel", "false");
    props = patchProp(props, "org.gradle.daemon", "false");
    props = patchProp(props, "reactNativeArchitectures", "x86_64");
    props = patchProp(props, "newArchEnabled", "false");
    fs.writeFileSync(gradlePropsPath, props);
  }

  const result = spawnSync("npx", ["expo", "run:android", "--port", portString], {
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
