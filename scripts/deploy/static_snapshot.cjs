const fs = require("node:fs");
const path = require("node:path");

const localOrigin = process.env.SNAPSHOT_ORIGIN ?? "http://127.0.0.1:3100";
const publicOrigin =
  process.env.SNAPSHOT_PUBLIC_ORIGIN ?? "https://www.gongmozip.com";
const outDir = path.resolve(process.env.SNAPSHOT_OUT_DIR ?? "cloudflare-static");
const staticFiles = ["/ads.txt", "/robots.txt", "/sitemap.xml", "/favicon.ico"];

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function outputPathFor(pathname) {
  const decoded = decodeURIComponent(pathname);
  if (decoded === "/") {
    return path.join(outDir, "index.html");
  }

  const relativePath = decoded.replace(/^\/+/, "");
  const ext = path.extname(decoded);
  if (ext) {
    return path.join(outDir, relativePath);
  }

  return path.join(outDir, relativePath, "index.html");
}

function decodeImageUrl(match, encodedUrl) {
  try {
    return decodeURIComponent(encodedUrl.replaceAll("&amp;", "&"));
  } catch {
    return match;
  }
}

function rewriteHtml(html) {
  return html
    .replaceAll(`${localOrigin}/`, `${publicOrigin}/`)
    .replace(
      /\/_next\/image\?url=([^"&]+?)(?:&amp;|&)w=\d+(?:&amp;|&)q=\d+/g,
      decodeImageUrl
    );
}

async function fetchBody(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function discoverPaths() {
  const sitemap = (await fetchBody(`${localOrigin}/sitemap.xml`)).toString("utf8");
  const paths = new Set();
  const locPattern = /<loc>([^<]+)<\/loc>/g;

  for (const match of sitemap.matchAll(locPattern)) {
    const url = new URL(match[1]);
    if (url.origin === publicOrigin) {
      paths.add(`${url.pathname}${url.search}`);
    }
  }

  for (const file of staticFiles) {
    paths.add(file);
  }

  return [...paths].sort();
}

async function writeSnapshotPath(routePath) {
  const url = new URL(routePath, localOrigin);
  const body = await fetchBody(url.href);
  const isHtml =
    routePath === "/" || (!path.extname(url.pathname) && !routePath.includes("."));
  const outputPath = outputPathFor(url.pathname);
  ensureParent(outputPath);

  if (isHtml) {
    fs.writeFileSync(outputPath, rewriteHtml(body.toString("utf8")));
    return;
  }

  fs.writeFileSync(outputPath, body);
}

async function main() {
  fs.rmSync(outDir, { force: true, recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  if (fs.existsSync("public")) {
    fs.cpSync("public", outDir, { recursive: true });
  }

  fs.mkdirSync(path.join(outDir, "_next"), { recursive: true });
  fs.cpSync(".next/static", path.join(outDir, "_next/static"), {
    recursive: true,
  });

  const paths = await discoverPaths();
  const failures = [];

  for (const routePath of paths) {
    try {
      await writeSnapshotPath(routePath);
      process.stdout.write(`snapshotted ${routePath}\n`);
    } catch (error) {
      failures.push(`${routePath}: ${error.message}`);
    }
  }

  fs.writeFileSync(
    path.join(outDir, "_headers"),
    ["/_next/static/*", "  Cache-Control: public, max-age=31536000, immutable", ""].join("\n")
  );

  if (failures.length > 0) {
    throw new Error(`Snapshot failed:\n${failures.join("\n")}`);
  }

  process.stdout.write(`Wrote ${paths.length} routes to ${outDir}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
