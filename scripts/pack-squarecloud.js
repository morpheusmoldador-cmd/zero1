const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const outFile = path.join(root, "zer01regras.zip");

const includes = [
  "package.json",
  "server.js",
  "squarecloud.app",
  "SETUP.md",
  "README.md",
  ".env.example",
  "src",
  "public",
  path.join("data", "original.html"),
];

if (fs.existsSync(path.join(root, "data", "site.json"))) {
  includes.push(path.join("data", "site.json"));
}
if (fs.existsSync(path.join(root, "data", "staff.json"))) {
  includes.push(path.join("data", "staff.json"));
}

try {
  fs.unlinkSync(outFile);
} catch {
  /* ignore */
}

const result = spawnSync("tar", ["-a", "-c", "-f", outFile, ...includes], {
  cwd: root,
  encoding: "utf8",
  shell: false,
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "Falha ao gerar o zip");
  process.exit(result.status || 1);
}

const size = fs.statSync(outFile).size;
const downloads = path.join(process.env.USERPROFILE || "", "Downloads", "zer01regras.zip");
if (process.env.USERPROFILE) {
  try {
    fs.copyFileSync(outFile, downloads);
  } catch {
    /* ignore */
  }
}
console.log(`Zip pronto: ${outFile}`);
if (fs.existsSync(downloads)) console.log(`Cópia: ${downloads}`);
console.log(`Tamanho: ${(size / 1024).toFixed(1)} KB`);
console.log("Envie este arquivo em https://squarecloud.app como SITE (não bot).");
