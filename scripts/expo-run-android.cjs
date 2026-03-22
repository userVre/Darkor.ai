const fs = require("fs");
const { spawnSync } = require("child_process");
const { resolve } = require("path");
const { pathToFileURL } = require("url");
const { resolvePort, setupAdbReverse } = require("./dev-server-utils.cjs");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  const projectRoot = resolve(__dirname, "..");
  const metroConfig = pathToFileURL(resolve(projectRoot, "metro.config.js")).href;
  process.env.EXPO_OVERRIDE_METRO_CONFIG = metroConfig;
  process.env.EXPO_DEV_PORT = process.env.EXPO_DEV_PORT || "8081";

  const { port, autoSelected } = await resolvePort();
  const portString = String(port);

  if (autoSelected) {
    console.error(`[dev] Port 8081 is unavailable; stop the conflicting process before running Android.`);
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
  console.log(`[dev] Android dev server: ${serverUrl} (adb reverse ${adbOk ? "ok" : "off"})`);
  process.env.EXPO_DEV_CLIENT_SERVER_URL = serverUrl;
  process.env.EXPO_PACKAGER_PROXY_URL = serverUrl;
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
      return `${content.trimEnd()}\n${line}\n`;
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
    props = patchProp(props, "EX_DEV_CLIENT_NETWORK_INSPECTOR", "false");
    fs.writeFileSync(gradlePropsPath, props);
  }

  const androidDir = resolve(projectRoot, "android");
  run("cmd", ["/c", "gradlew.bat", "app:installDebug"], {
    cwd: androidDir,
    env: process.env,
  });

  run("adb", [
    "shell",
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    `exp+darkor-ai://expo-development-client/?url=${encodeURIComponent(serverUrl)}`,
  ], {
    cwd: projectRoot,
    env: process.env,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
