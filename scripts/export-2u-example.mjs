import { build } from 'esbuild';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import OpenSCAD from '../public/openscad.js';

const require = createRequire(import.meta.url);
await mkdir('.test-build', { recursive: true });
const temp = await mkdtemp('.test-build/export-');
const output = 'artifacts/rack-2u';
await mkdir(output, { recursive: true });
try {
  await build({ stdin: { contents: `
    export { DEFAULT_RACK_CONFIG } from './src/state/types';
    export { fitTo2U, validateLayout, activeDevices } from './src/utils/layout-fit';
    export { getPlacedDeviceDimensions, generateScadCode, generateScadCodeForSide } from './src/utils/scad-generator';
    export { generateBundledScadCode } from './src/utils/scad-bundler';
  `, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: `${temp}/api.cjs`, define: { 'import.meta.env.BASE_URL': '"/"' } });
  const api = require(resolve(`${temp}/api.cjs`));
  const original = JSON.parse(await readFile('tests/fixtures/four-devices.json', 'utf8'));
  const result = api.fitTo2U({ ...api.DEFAULT_RACK_CONFIG, ...original }, { allowRotation: true, allowCompact: true, allowShared: true });
  assert.ok(result.config, result.message);
  assert.deepEqual(api.validateLayout(result.config), []);
  await mkdir('public/examples', { recursive: true });
  await writeFile('public/examples/four-devices-2u.json', JSON.stringify(result.config, null, 2) + '\n');
  await writeFile(`${output}/rack-2u.json`, JSON.stringify(result.config, null, 2) + '\n');
  const zip = await JSZip.loadAsync(await readFile('public/rack-scad.zip'));
  const files = [];
  for (const [name, entry] of Object.entries(zip.files)) if (!entry.dir) files.push([name, await entry.async('uint8array')]);
  const wasmBinary = await readFile('public/openscad.wasm');
  async function render(code, name, printOrientation = false, expectEmpty = false) {
    const logs = [];
    const scad = await OpenSCAD({ noInitialRun: true, wasmBinary, print: s => logs.push(s), printErr: s => logs.push(s) });
    scad.FS.mkdir('/components'); scad.FS.mkdir('/rack_mounts');
    for (const [path, data] of files) scad.FS.writeFile(`/${path}`, data);
    scad.FS.writeFile('/main.scad', code);
    const start = Date.now();
    const exit = scad.callMain(['--backend=manifold', '--export-format=asciistl', '-o', '/out.stl', '/main.scad']);
    assert.ok(!logs.some(l => /ERROR:|WARNING:/.test(l)), logs.join('\n'));
    if (expectEmpty) {
      assert.ok(logs.some(l => /top level object is empty/i.test(l)), `Device cavity is obstructed: ${name}\n${logs.join('\n')}`);
      console.log(`${name}: device insertion volume is unobstructed`);
      return { name, empty: true };
    }
    assert.equal(exit, 0, logs.join('\n'));
    const data = scad.FS.readFile('/out.stl');
    await writeFile(`${output}/${name}.stl`, data);
    await writeFile(`${output}/${name}.scad`, code);
    const vertices = [...new TextDecoder().decode(data).matchAll(/vertex\s+([-\d.e+]+)\s+([-\d.e+]+)\s+([-\d.e+]+)/g)].map(m => m.slice(1).map(Number));
    assert.ok(vertices.length > 0, 'Expected nonempty ASCII STL');
    // Count connected surface components after welding STL's duplicated vertices.
    const ids = new Map(); const parent = [];
    const root = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (let i = 0; i < vertices.length; i += 3) {
      const triangle = vertices.slice(i, i + 3).map(v => {
        const key = v.map(n => n.toFixed(5)).join(',');
        if (!ids.has(key)) { ids.set(key, parent.length); parent.push(parent.length); }
        return ids.get(key);
      });
      parent[root(triangle[1])] = root(triangle[0]); parent[root(triangle[2])] = root(triangle[0]);
    }
    const components = new Set(parent.map((_,i) => root(i))).size;
    assert.equal(components, 1, `${name} has detached geometry`);
    const bounds = [0,1,2].map(axis => vertices.reduce((b,v) => [Math.min(b[0],v[axis]),Math.max(b[1],v[axis])], [Infinity,-Infinity]));
    const heightBounds = printOrientation ? [-bounds[1][1], -bounds[1][0]] : bounds[2];
    assert.ok(heightBounds[0] >= -0.01 && heightBounds[1] <= 88.91, `STL exceeds 2U height: ${JSON.stringify(bounds)}`);
    console.log(name, JSON.stringify({ bytes:data.length, vertices:vertices.length, bounds, renderMs:Date.now()-start }));
    const warnings = logs.filter(l => /WARNING|ERROR|Volumes/.test(l));
    if (warnings.length) console.log(warnings.join('\n'));
    return { name, bounds, components, vertices: vertices.length, bytes: data.length, logs };
  }
  const reports = [];
  for (const side of ['left','right']) reports.push(await render(api.generateScadCodeForSide(result.config, side), `rack-2u-${side}`, true));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => new Response(await readFile(`public${url}`, 'utf8'));
  let bundled;
  try { bundled = await api.generateBundledScadCode(result.config); } finally { globalThis.fetch = originalFetch; }
  reports.push(await render(bundled, 'rack-2u-bundled'));
  const assembly = api.generateScadCode(result.config, false);
  for (const device of api.activeDevices(result.config)) {
    const dims = api.getPlacedDeviceDimensions(device);
    const x = result.config.panelWidth/2 + device.offsetX - dims.width/2;
    const z = 88.9/2 + device.offsetY - dims.height/2;
    const intersection = `use <components/rack_generator.scad>\nintersection() {\n${assembly.replace(/^(?:use|include)\s+<[^>]+>\s*$/gm, '')}\ntranslate([${x}, -1, ${z}]) cube([${dims.width}, ${dims.depth + result.config.plateThickness + 1}, ${dims.height}]);\n}`;
    reports.push(await render(intersection, `cavity-${device.deviceId}`, false, true));
  }
  await writeFile(`${output}/validation.json`, JSON.stringify({ changes: result.changes, reports }, null, 2));
  console.log(`Saved verified 2U exports in ${output}`);
} finally { await rm(temp, { recursive: true, force: true }); }
