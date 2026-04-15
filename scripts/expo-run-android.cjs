const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
const { resolve } = require("path");
const { pathToFileURL } = require("url");
const { getExpoDevServerStatus, prewarmExpoAndroidBundle, resolvePort, setupAdbReverse, waitForExpoDevServer } = require("./dev-server-utils.cjs");

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

function startMetroInBackground({ projectRoot, env, hostMode, portString }) {
  const args = ["expo", "start", "--dev-client", "--host", hostMode, "--port", portString, "--non-interactive"];

  if (process.platform === "win32") {
    const child = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npx ${args.join(" ")}`], {
      cwd: projectRoot,
      env,
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return;
  }

  const child = spawn("npx", args, {
    cwd: projectRoot,
    env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function resolveAndroidDevClientScheme(projectRoot) {
  const manifestPath = resolve(projectRoot, "android", "app", "src", "main", "AndroidManifest.xml");
  if (fs.existsSync(manifestPath)) {
    const manifest = fs.readFileSync(manifestPath, "utf8");
    const match = manifest.match(/android:scheme="(exp\+[^"]+)"/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "exp+darkor-ai";
}

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

  const expoHostMode = adbOk ? "localhost" : "lan";

  if (existingServer.isExpoServer && port === preferredPort) {
    console.log(`[dev] Reusing existing Expo dev server on port ${portString}.`);
  } else {
    console.log(`[dev] Metro is not running on port ${portString}; starting it in the background.`);
    startMetroInBackground({
      projectRoot,
      env: process.env,
      hostMode: expoHostMode,
      portString,
    });

    const ready = await waitForExpoDevServer(port, { timeoutMs: 120000 });
    if (!ready) {
      console.error(`[dev] Metro did not become ready on port ${portString}.`);
      process.exit(1);
    }
  }

  const prewarmPromise = prewarmExpoAndroidBundle(port, { timeoutMs: 180000 });

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
    props = patchProp(props, "EX_DEV_CLIENT_NETWORK_INSPECTOR", "false");
    fs.writeFileSync(gradlePropsPath, props);
  }

  const androidDir = resolve(projectRoot, "android");
  run("cmd", ["/c", "gradlew.bat", "app:installDebug"], {
    cwd: androidDir,
    env: process.env,
  });

  const prewarmed = await prewarmPromise;
  if (!prewarmed) {
    console.warn(`[dev] Android bundle prewarm timed out on port ${portString}; launching anyway.`);
  }

  const devClientScheme = resolveAndroidDevClientScheme(projectRoot);
  run("adb", [
    "shell",
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    `${devClientScheme}://expo-development-client/?url=${encodeURIComponent(serverUrl)}`,
  ], {
    cwd: projectRoot,
    env: process.env,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

