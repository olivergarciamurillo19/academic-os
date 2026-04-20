import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const outdir = `${root}dist`;
const watch = process.argv.includes("--watch");

const entries = {
  "content-script": `${root}src/content/content-script.ts`,
  background: `${root}src/background/background.ts`,
  popup: `${root}src/popup/popup.ts`,
};

async function copyStatic() {
  await mkdir(`${outdir}/icons`, { recursive: true });
  await cp(`${root}public`, outdir, { recursive: true });
  if (existsSync(`${root}icons`)) {
    await cp(`${root}icons`, `${outdir}/icons`, { recursive: true });
  }
}

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

const common = {
  entryPoints: entries,
  bundle: true,
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  target: "chrome120",
  format: "iife",
  outdir,
  logLevel: "info",
};

if (watch) {
  const ctx = await context(common);
  await ctx.watch();
  await copyStatic();
  console.log("[extension] watching…");
} else {
  await build(common);
  await copyStatic();
  console.log(`[extension] built → ${outdir}`);
}
