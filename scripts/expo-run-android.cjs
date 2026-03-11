const fs = require("fs");
const { spawnSync } = require("child_process");
const { resolve } = require("path");
const { pathToFileURL } = require("url");

const projectRoot = resolve(__dirname, "..");
const metroConfig = pathToFileURL(resolve(projectRoot, "metro.config.js")).href;
process.env.EXPO_OVERRIDE_METRO_CONFIG = metroConfig;

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

const result = spawnSync("npx", ["expo", "run:android"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
