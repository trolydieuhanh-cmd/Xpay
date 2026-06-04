const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "mobile-www");

const files = [
  "index.html",
  "privacy.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "service-worker.js",
  "robots.txt"
];

const directories = ["assets", "vendor"];

function isLocalDuplicate(source) {
  const name = path.basename(source);
  return name.startsWith("._") || name.endsWith(".icloud") || /\s[0-9]+\./.test(name);
}

async function copyFile(name) {
  await fs.copyFile(path.join(root, name), path.join(outDir, name));
}

async function copyDirectory(name) {
  await fs.cp(path.join(root, name), path.join(outDir, name), {
    recursive: true,
    force: true,
    filter: (source) => !isLocalDuplicate(source)
  });
}

async function main() {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  await Promise.all(files.map(copyFile));
  await Promise.all(directories.map(copyDirectory));
  console.log(`Prepared Capacitor web assets in ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
