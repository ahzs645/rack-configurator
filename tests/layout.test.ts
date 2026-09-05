import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_RACK_CONFIG } from '../src/state/types';
import type { RackConfig, PlacedDevice } from '../src/state/types';
import fixture from './fixtures/four-devices.json';
import { activeDevices, fitTo2U, getMountEnvelope, validateLayout } from '../src/utils/layout-fit';
import { getPlacedDeviceDimensions } from '../src/utils/device-geometry';
import { generateScadCode, exportConfigJson, parseConfigJson } from '../src/utils/scad-generator';
import { generateBundledScadCode, clearComponentCache } from '../src/utils/scad-bundler';
import { compressConfig, decompressConfig } from '../src/utils/url-sharing';
import { useRackStore } from '../src/state/rack-store';
import { PerspectiveCamera, Vector3 } from 'three';
import { fitViewerCamera, zoomViewerCamera } from '../src/utils/viewer-camera';

const source: RackConfig = { ...DEFAULT_RACK_CONFIG, ...fixture } as RackConfig;
const options = { allowRotation: true, allowCompact: true, allowShared: true };
const device = (overrides: Partial<PlacedDevice> = {}): PlacedDevice => ({ id: 'a', deviceId: 'custom', customWidth: 30, customHeight: 20, customDepth: 60, mountType: 'compact', offsetX: 0, offsetY: 0, ...overrides });

test('view zoom preserves a panned target and the viewing angle, with distance limits', () => {
  const camera = new PerspectiveCamera(45, 1.5, 0.1, 10000);
  const target = new Vector3(120, -30, 15);
  const direction = new Vector3(3, 2, 4).normalize();
  camera.position.copy(target).addScaledVector(direction, 500);
  zoomViewerCamera(camera, target, 0.5, 5, 5000);
  assert.ok(Math.abs(camera.position.distanceTo(target) - 250) < 1e-9);
  assert.ok(camera.position.clone().sub(target).normalize().distanceTo(direction) < 1e-9);
  assert.deepEqual(target.toArray(), [120, -30, 15]);
  zoomViewerCamera(camera, target, 0.0001, 5, 5000);
  assert.ok(Math.abs(camera.position.distanceTo(target) - 5) < 1e-9);
  zoomViewerCamera(camera, target, 1e6, 5, 5000);
  assert.ok(Math.abs(camera.position.distanceTo(target) - 5000) < 1e-9);
});

test('Fit view recenters a close-up and includes the model in a narrow viewport', () => {
  const camera = new PerspectiveCamera(45, 0.5, 0.1, 2000);
  const target = new Vector3(120, 30, -40);
  fitViewerCamera(camera, target, 250);
  assert.deepEqual(target.toArray(), [0, 0, 0]);
  const halfHorizontalFov = Math.atan(Math.tan(Math.PI / 8) * 0.5);
  assert.ok(camera.position.length() * Math.sin(halfHorizontalFov) >= 250);
});

test('the supplied link has cage collisions and panel-edge violations', () => {
  const messages = validateLayout(source).map(i => i.message).join('\n');
  assert.match(messages, /top panel edge/);
  assert.match(messages, /bottom panel edge/);
  assert.match(messages, /overlaps/);
  assert.equal(getMountEnvelope(source.leftDevices[0], source).height, 46);
});

test('all four devices fit 2U without deletion, side changes or input mutation', () => {
  const before = JSON.stringify(source);
  const result = fitTo2U(source, options);
  assert.ok(result.config, result.message);
  assert.equal(result.config.rackU, 2);
  assert.deepEqual(validateLayout(result.config), []);
  assert.equal(JSON.stringify(source), before);
  for (const side of ['leftDevices', 'rightDevices'] as const) assert.deepEqual(result.config[side].map(d => d.id).sort(), source[side].map(d => d.id).sort());
  const pi = result.config.rightDevices.find(d => d.deviceId === 'raspberry_pi_5_waveshare_poe')!;
  assert.equal(pi.orientation, 'side');
  assert.equal(getPlacedDeviceDimensions(pi).width, 30);
  assert.equal(getPlacedDeviceDimensions(pi).height, 66);
  assert.equal(getPlacedDeviceDimensions(pi).depth, 97);
  assert.ok(result.config.leftDevices.every(d => d.mountType === 'compact' && d.sharedMountGroup));
  console.log('Fitted layout:', JSON.stringify(activeDevices(result.config).map(d => ({ name: d.deviceId, x: d.offsetX, y: d.offsetY, mount: d.mountType, orientation: d.orientation }))));
});

test('rotation alone cannot fit this stack, and split lock is respected', () => {
  assert.equal(fitTo2U(source, { ...options, allowCompact: false }).config, null);
  const locked = fitTo2U({ ...source, splitLocked: true }, options);
  assert.ok(locked.config);
  assert.equal(locked.config.splitPosition, 20);
  assert.equal(fitTo2U({ ...source, splitPosition: -100, splitLocked: true }, options).config, null);
});

test('only aligned compact walls in the same group can overlap', () => {
  const a = device({ sharedMountGroup: 'stack', offsetY: -12.5 });
  const b = device({ id: 'b', sharedMountGroup: 'stack', offsetY: 12.5 });
  const config = { ...DEFAULT_RACK_CONFIG, devices: [a, b] };
  assert.deepEqual(validateLayout(config), []);
  for (const change of [{ sharedMountGroup: undefined }, { offsetX: 2 }, { offsetY: 11 }, { mountType: 'cage' as const }]) {
    assert.ok(validateLayout({ ...config, devices: [a, { ...b, ...change }] }).some(i => i.message.includes('overlaps')));
  }
});

test('orientation and shared mounts survive JSON and share links and reach SCAD', async () => {
  const c = fitTo2U(source, options).config!;
  assert.deepEqual(parseConfigJson(exportConfigJson(c)), JSON.parse(JSON.stringify(c)));
  assert.deepEqual(await decompressConfig(await compressConfig(c)), JSON.parse(JSON.stringify(c)));
  const code = generateScadCode({ ...c, heavyDevice: 2 }, false);
  assert.match(code, /\[30, 66, 97\]/);
  assert.match(code, /"compact"/);
  assert.match(code, /heavy_device = 2/);
  assert.match(code, /show_preview = false/);
});

test('manual controls swap orientation, align shared walls and migrate older configs', () => {
  const store = useRackStore;
  store.getState().loadConfig(source);
  const pi = source.rightDevices[1];
  store.getState().updateDeviceOrientation(pi.id, 'side');
  assert.equal(getPlacedDeviceDimensions(store.getState().config.rightDevices[1]).width, 30);
  store.getState().stackDeviceAbove(source.leftDevices[1].id, source.leftDevices[0].id);
  const [a, b] = store.getState().config.leftDevices;
  assert.equal(a.offsetX, b.offsetX);
  assert.equal(b.offsetY - a.offsetY, 40);
  assert.equal(a.sharedMountGroup, b.sharedMountGroup);
  store.getState().updateDevicePosition(a.id, a.offsetX + 3, a.offsetY + 2);
  const moved = store.getState().config.leftDevices;
  assert.equal(moved[1].offsetY - moved[0].offsetY, 40);
  assert.equal(moved[0].offsetX, moved[1].offsetX);
  store.getState().detachSharedMount(b.id);
  assert.equal(store.getState().config.leftDevices[1].sharedMountGroup, undefined);
  store.getState().updateDeviceMountType(pi.id, 'shelf');
  assert.equal(store.getState().config.rightDevices[1].orientation, undefined);
});

test('every catalog device exports its resolved dimensions, including the Comet X', () => {
  const code = generateScadCode(source, false);
  assert.match(code, /\[213, 30, 128\]/);
  assert.match(code, /\[170, 40, 90\]/);
  assert.match(code, /\[127.5, 58, 125.5\]/);
  assert.match(code, /\[66, 30, 97\]/);
});

test('fit undo survives view changes and refuses to overwrite later edits', () => {
  const store = useRackStore;
  store.getState().loadConfig(source);
  store.getState().applyFittedLayout(fitTo2U(source, options).config!);
  store.getState().selectDevice(source.rightDevices[1].id);
  store.getState().undoFittedLayout();
  assert.deepEqual(store.getState().config, source);
  store.getState().applyFittedLayout(fitTo2U(source, options).config!);
  store.getState().setSplitPosition(10);
  store.getState().undoFittedLayout();
  assert.equal(store.getState().config.splitPosition, 10);
});

test('thicker walls, joiner reserves and panel edges affect fitting', () => {
  assert.equal(fitTo2U({ ...source, heavyDevice: 2 }, options).config, null);
  const narrow = { ...source, panelWidth: 300 };
  assert.equal(fitTo2U(narrow, options).config, null);
  const edge = { ...DEFAULT_RACK_CONFIG, devices: [device({ offsetX: 220 })] };
  assert.ok(validateLayout(edge).some(i => /right panel edge/.test(i.message)));
});

test('search fails clearly for unsupported or impossible devices and handles single panels', () => {
  const huge = { ...DEFAULT_RACK_CONFIG, devices: [device({ customHeight: 500, customWidth: 500 })] };
  assert.equal(fitTo2U(huge, options).config, null);
  assert.equal(fitTo2U({ ...huge, devices: [device({ mountType: 'shelf' })] }, options).config, null);
  const single = fitTo2U({ ...DEFAULT_RACK_CONFIG, devices: [device()] }, options);
  assert.ok(single.config);
  assert.deepEqual(validateLayout(single.config), []);
  assert.equal(fitTo2U({ ...DEFAULT_RACK_CONFIG, devices: [] }, options).config, null);
});

test('standalone export resolves nested SCAD files and uses oriented dimensions', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async input => {
    try { return new Response(await readFile(`public${input}`, 'utf8')); }
    catch { return new Response('', { status: 404 }); }
  };
  try {
    clearComponentCache();
    const code = await generateBundledScadCode(fitTo2U(source, options).config!);
    assert.match(code, /module compact_cage/);
    assert.match(code, /module rack_faceplate_split/);
    assert.match(code, /\[30, 66, 97\]/);
    assert.doesNotMatch(code, /^\s*(use|include)\s+</m);
  } finally { globalThis.fetch = original; clearComponentCache(); }
});

test('share links decode raw deflate and older zlib wrappers without browser compression APIs', async () => {
  const { deflateRawSync, deflateSync } = await import('node:zlib');
  const expected = JSON.parse(JSON.stringify(source));
  for (const encode of [deflateRawSync, deflateSync]) {
    const encoded = encode(JSON.stringify(expected)).toString('base64url');
    assert.deepEqual(await decompressConfig(encoded), expected);
  }
  await assert.rejects(decompressConfig('truncated-link'));
});

test('working racks survive reload, including an intentionally cleared layout, and denied storage is safe', async () => {
  const { readWorkingRack, saveWorkingRack } = await import('../src/utils/working-rack');
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } });
    assert.equal(readWorkingRack(), null);
    const rack = fitTo2U(source, options).config!;
    assert.equal(saveWorkingRack(rack), true);
    assert.deepEqual(readWorkingRack(), JSON.parse(JSON.stringify(rack)));
    const empty = { ...rack, devices: [], leftDevices: [], rightDevices: [] };
    saveWorkingRack(empty);
    assert.deepEqual(readWorkingRack(), JSON.parse(JSON.stringify(empty)));
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage denied'); } });
    assert.equal(readWorkingRack(), null);
    assert.equal(saveWorkingRack(rack), false);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('missing links return no config, but invalid or unavailable shared racks raise an error', async () => {
  const { loadConfigFromUrl } = await import('../src/utils/url-sharing');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalFetch = globalThis.fetch;
  const location = { search: '' };
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location } });
    assert.equal(await loadConfigFromUrl(), null);
    location.search = '?c=broken-link';
    await assert.rejects(loadConfigFromUrl());
    location.search = '?url=examples/my-2u-rack.json';
    globalThis.fetch = async () => new Response(JSON.stringify(source));
    assert.deepEqual(await loadConfigFromUrl(), JSON.parse(JSON.stringify(source)));
    globalThis.fetch = async () => new Response('{}');
    await assert.rejects(loadConfigFromUrl());
    globalThis.fetch = async () => new Response('', { status: 404 });
    await assert.rejects(loadConfigFromUrl());
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('mobile split export prepares a downloadable ZIP containing both unchanged STL files', async () => {
  const { createSplitStlZip, generateFilename } = await import('../src/utils/scad-generator');
  const { default: JSZip } = await import('jszip');
  const left = new TextEncoder().encode('solid left\nendsolid left').buffer;
  const right = new TextEncoder().encode('solid right\nendsolid right').buffer;
  const blob = await createSplitStlZip(left, right, source);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.deepEqual(Object.keys(zip.files).sort(), [generateFilename(source, 'stl', 'left'), generateFilename(source, 'stl', 'right')].sort());
  assert.deepEqual(await zip.file(generateFilename(source, 'stl', 'left'))!.async('arraybuffer'), left);
  assert.deepEqual(await zip.file(generateFilename(source, 'stl', 'right'))!.async('arraybuffer'), right);
});

test('shallow mobile racks open enlarged from the left and both edges remain reachable', async () => {
  const { getMobileRackView, getMobilePanLimits } = await import('../src/utils/mobile-rack-view');
  const { getRackBoundsSvg } = await import('../src/utils/coordinates');
  for (const width of [320, 393, 430]) {
    const height = 550;
    const initial = getMobileRackView(width, height, 2, 440.5);
    const limits = getMobilePanLimits(width, height, 2, 440.5, initial.zoom);
    const view = { svgWidth: width, svgHeight: height, rackU: 2, panelWidth: 440.5, padding: 40, ...initial };
    const left = getRackBoundsSvg(view);
    const right = getRackBoundsSvg({ ...view, panX: -limits.maxPanX });
    assert.ok(initial.zoom > 2);
    assert.ok(left.height >= 170 && left.height <= 250);
    assert.ok(left.width > width);
    assert.ok(Math.abs(left.x - 40) < 1e-8);
    assert.ok(Math.abs(right.x + right.width - (width - 40)) < 1e-8);
    assert.equal(limits.maxPanY, 0, 'horizontal swipes cannot lose the shallow rack vertically');
  }
});

test('taller racks retain an overview and narrow/short viewports have finite bounded zoom', async () => {
  const { getMobileRackView, getMobilePanLimits } = await import('../src/utils/mobile-rack-view');
  for (const rackU of [5, 6]) {
    const view = getMobileRackView(393, 550, rackU, 440.5);
    assert.equal(view.zoom, 1);
    assert.equal(view.panX, 0);
    assert.equal(getMobilePanLimits(393, 550, rackU, 440.5, view.zoom).maxPanX, 0);
  }
  const zooms = [2, 3, 4, 5, 6].map(u => getMobileRackView(393, 550, u, 440.5).zoom);
  assert.deepEqual(zooms, [...zooms].sort((a, b) => b - a));
  for (const [width, height] of [[320, 250], [800, 180], [0, 0]]) {
    const view = getMobileRackView(width, height, 2, 440.5);
    assert.ok(Number.isFinite(view.zoom) && view.zoom >= 0.25 && view.zoom <= 4);
    assert.ok(Number.isFinite(view.panX));
  }
});
