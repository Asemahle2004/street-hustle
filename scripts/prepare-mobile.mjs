import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const MODEL_URLS = {
  'Soldier.glb': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb',
  'Xbot.glb': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb',
  'Michelle.glb': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Michelle.glb'
};

async function copyWebSource() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const entries = await readdir(ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    const allowed = ext === '.html' || ext === '.css' || ext === '.webmanifest' || entry.name === 'sw.js';
    if (allowed) await cp(join(ROOT, entry.name), join(DIST, entry.name));
  }

  await cp(join(ROOT, 'src'), join(DIST, 'src'), { recursive: true });
}

async function bundlePlayCanvas() {
  const source = join(ROOT, 'node_modules', 'playcanvas', 'build', 'playcanvas.mjs');
  const targetDir = join(DIST, 'vendor');
  await mkdir(targetDir, { recursive: true });
  await cp(source, join(targetDir, 'playcanvas.mjs'));

  const indexPath = join(DIST, 'index.html');
  let html = await readFile(indexPath, 'utf8');
  html = html.replace(
    /https:\/\/cdn\.jsdelivr\.net\/npm\/playcanvas@[^"']+\/build\/playcanvas\.mjs/g,
    './vendor/playcanvas.mjs'
  );
  await writeFile(indexPath, html);
}

async function download(url, target) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Street-Hustle-Android-Build/1.0' }
  });
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
  console.log(`Bundled ${target.replace(ROOT, '')} (${Math.round(bytes.length / 1024)} KB)`);
}

async function bundleCharacterModels() {
  const modelDir = join(DIST, 'assets', 'models');
  await mkdir(modelDir, { recursive: true });

  for (const [filename, url] of Object.entries(MODEL_URLS)) {
    await download(url, join(modelDir, filename));
  }

  const srcDir = join(DIST, 'src');
  const scripts = await readdir(srcDir);
  const replacements = Object.entries(MODEL_URLS).map(([filename, remote]) => [remote, `assets/models/${filename}`]);

  for (const filename of scripts) {
    if (!filename.endsWith('.js')) continue;
    const path = join(srcDir, filename);
    let source = await readFile(path, 'utf8');
    let changed = false;
    for (const [remote, local] of replacements) {
      if (source.includes(remote)) {
        source = source.split(remote).join(local);
        changed = true;
      }
    }
    if (changed) await writeFile(path, source);
  }
}

async function writeBuildStamp() {
  const stamp = {
    platform: 'android',
    builtAt: new Date().toISOString(),
    version: process.env.VERSION_NAME || '0.10.0',
    offlineModels: Object.keys(MODEL_URLS)
  };
  await writeFile(join(DIST, 'build-info.json'), `${JSON.stringify(stamp, null, 2)}\n`);
}

await copyWebSource();
await bundlePlayCanvas();
await bundleCharacterModels();
await writeBuildStamp();

console.log('Street Hustle mobile web bundle prepared in dist/.');
