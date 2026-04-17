const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, "locales");
const SOURCE_LOCALE = "en.json";
const TARGET_LOCALES = ["fr.json", "es.json", "ru.json", "sv.json", "zh-Hans.json", "pt.json"];

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, filename), "utf8"));
}

function flattenKeys(value, prefix = "", output = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenKeys(item, `${prefix}[${index}]`, output);
    });
    if (!value.length && prefix) {
      output.push(prefix);
    }
    return output;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length && prefix) {
      output.push(prefix);
    }
    for (const [key, nestedValue] of entries) {
      flattenKeys(nestedValue, prefix ? `${prefix}.${key}` : key, output);
    }
    return output;
  }

  if (prefix) {
    output.push(prefix);
  }

  return output;
}

const sourceKeys = new Set(flattenKeys(readJson(SOURCE_LOCALE)));
let hasMissingKeys = false;

for (const locale of TARGET_LOCALES) {
  const localeKeys = new Set(flattenKeys(readJson(locale)));
  const missingKeys = [...sourceKeys].filter((key) => !localeKeys.has(key));

  if (!missingKeys.length) {
    console.log(`${locale}: OK`);
    continue;
  }

  hasMissingKeys = true;
  console.log(`${locale}: missing ${missingKeys.length} keys`);
  missingKeys.forEach((key) => console.log(`  - ${key}`));
}

if (hasMissingKeys) {
  process.exitCode = 1;
}
