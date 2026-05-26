#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

os.hostname = () => "ptliv-pc";
process.env.COMPUTERNAME = "ptliv-pc";
process.env.USERDOMAIN = "ptliv-pc";
process.env.USERDOMAIN_ROAMINGPROFILE = "ptliv-pc";

function findVercelCli() {
  const candidates = [];
  const npxRoot = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");

  try {
    for (const dir of fs.readdirSync(npxRoot)) {
      const vcPath = path.join(npxRoot, dir, "node_modules", "vercel", "dist", "vc.js");
      if (fs.existsSync(vcPath)) {
        candidates.push({
          file: vcPath,
          mtime: fs.statSync(vcPath).mtimeMs,
        });
      }
    }
  } catch {
    // Fall through to require.resolve below.
  }

  if (candidates.length > 0) {
    return candidates.sort((a, b) => b.mtime - a.mtime)[0].file;
  }

  return require.resolve("vercel/dist/vc.js");
}

const vcPath = findVercelCli();
process.argv = [process.execPath, "vercel", ...process.argv.slice(2)];

import(pathToFileURL(vcPath).href).catch((error) => {
  console.error(error);
  process.exit(1);
});
