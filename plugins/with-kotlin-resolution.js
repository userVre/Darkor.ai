const {
  withProjectBuildGradle,
  createRunOncePlugin,
} = require("@expo/config-plugins");

const KOTLIN_BLOCK = `
    configurations.all {
        resolutionStrategy.eachDependency { details ->
            if (details.requested.group == "org.jetbrains.kotlin") {
                details.useVersion(rootProject.ext.kotlinVersion)
                details.because("Force Kotlin stdlib to match the compiler version")
            }
        }
    }
`;

function insertKotlinResolution(contents) {
  if (contents.includes("Force Kotlin stdlib to match the compiler version")) {
    return contents;
  }

  const marker = "allprojects {";
  const start = contents.indexOf(marker);
  if (start === -1) {
    return contents;
  }

  let braceCount = 0;
  for (let i = start; i < contents.length; i += 1) {
    const ch = contents[i];
    if (ch === "{") {
      braceCount += 1;
    } else if (ch === "}") {
      braceCount -= 1;
      if (braceCount === 0) {
        return `${contents.slice(0, i)}${KOTLIN_BLOCK}${contents.slice(i)}`;
      }
    }
  }

  return contents;
}

const withKotlinResolution = (config) =>
  withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      return config;
    }

    config.modResults.contents = insertKotlinResolution(
      config.modResults.contents
    );
    return config;
  });

module.exports = createRunOncePlugin(
  withKotlinResolution,
  "with-kotlin-resolution",
  "1.0.0"
);
