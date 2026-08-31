import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const requiredRepoFiles = [
  'privacy.html',
  'licenses.html',
  'manifest.webmanifest',
  'store-listing/short-description.txt',
  'store-listing/full-description.txt',
  'store-listing/data-safety.md',
  'store-listing/content-rating-notes.md',
  'store-listing/app-access.md',
  'store-listing/release-notes.txt'
];

const requiredDistFiles = [
  'index.html',
  'vendor/playcanvas.mjs',
  'assets/models/Soldier.glb',
  'assets/models/Xbot.glb',
  'assets/models/Michelle.glb',
  'privacy.html',
  'licenses.html'
];

async function mustExist(base, files) {
  for (const file of files) {
    const path = join(base, file);
    try { await access(path); }
    catch { throw new Error(`Required release file missing: ${file}`); }
  }
}

async function collectTextFiles(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await collectTextFiles(path, out);
    else if (/\.(?:html|js|css|json|webmanifest)$/i.test(entry.name)) out.push(path);
  }
  return out;
}

await mustExist(ROOT, requiredRepoFiles);
await mustExist(DIST, requiredDistFiles);

const textFiles = await collectTextFiles(DIST);
const forbiddenRuntimeDependencies = [
  'cdn.jsdelivr.net/npm/playcanvas',
  'raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb',
  'raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb',
  'raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Michelle.glb'
];

for (const file of textFiles) {
  const text = await readFile(file, 'utf8');
  for (const forbidden of forbiddenRuntimeDependencies) {
    if (text.includes(forbidden)) {
      throw new Error(`Android bundle still contains forbidden remote runtime dependency '${forbidden}' in ${file.replace(ROOT, '')}`);
    }
  }
}

const shortDescription = (await readFile(join(ROOT, 'store-listing', 'short-description.txt'), 'utf8')).trim();
if (shortDescription.length > 80) throw new Error(`Play short description is ${shortDescription.length} characters; maximum is 80.`);

const packageConfig = JSON.parse(await readFile(join(ROOT, 'capacitor.config.json'), 'utf8'));
if (packageConfig.appId !== 'com.asemahle2004.streethustle') throw new Error('Unexpected Android package ID.');
if (packageConfig.appName !== 'Street Hustle') throw new Error('Unexpected Android app name.');

const modelSizes = {};
for (const model of ['Soldier.glb','Xbot.glb','Michelle.glb']) {
  const info = await stat(join(DIST, 'assets', 'models', model));
  if (info.size < 100_000) throw new Error(`${model} appears incomplete (${info.size} bytes).`);
  modelSizes[model] = Math.round(info.size / 1024);
}

console.log('Street Hustle release audit passed.');
console.log(`Package: ${packageConfig.appId}`);
console.log(`Short description: ${shortDescription.length}/80 characters`);
console.log('Bundled humanoid model sizes (KB):', modelSizes);
