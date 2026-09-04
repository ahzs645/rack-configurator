import type { PlacedDevice, RackConfig } from '../state/types';
import { getRackHeight } from '../state/types';
import { getDevice } from '../data/devices';
import { canOrientDevice, getPlacedDeviceDimensions } from './device-geometry';

const EPS = 0.01;
export const EDGE_GAP = 1; // Keep material inside the panel, beyond the mount envelope.
export const DEVICE_GAP = 1;
export const activeDevices = (c: RackConfig) => c.isSplit ? [...c.leftDevices, ...c.rightDevices] : c.devices;
export const compactWall = (c: RackConfig) => 4 + c.heavyDevice;

// Match joiners.scad; retain a 2 mm assembly buffer outside the joiner wall.
export function getSplitMargin(c: RackConfig): number {
  if (c.joinerType === 'dovetail') return 6;
  const depths: Record<string, number> = { M3: 2.8, M4: 3.6, M5: 4.5, M6: 5.5, '4-40': 2.8, '6-32': 3.2, '8-32': 3.6, '10-24': 3.6, '1/4-20': 5 };
  return Math.max(4, (depths[c.joinerScrewType] ?? 4.5) + (c.joinerNutFloor ?? 0) + 1.5) + 2;
}

export function getMountEnvelope(d: PlacedDevice, c: RackConfig) {
  const dims = getPlacedDeviceDimensions(d);
  const exact = ['cage', 'cage_rect', 'cage_open', 'compact', 'none'].includes(d.mountType);
  const extra = d.mountType === 'none' ? c.clearance
    : d.mountType === 'compact' ? c.clearance + 2 * compactWall(c)
    : Math.max(16 + 2 * c.heavyDevice, c.clearance + 2 * compactWall(c) + 0.002);
  return { ...dims, width: dims.width + extra, height: dims.height + extra, exact };
}

export function mountBounds(d: PlacedDevice, c: RackConfig) {
  const e = getMountEnvelope(d, c);
  return { left: d.offsetX - e.width / 2, right: d.offsetX + e.width / 2,
    bottom: d.offsetY - e.height / 2, top: d.offsetY + e.height / 2 };
}

export function sharesDivider(a: PlacedDevice, b: PlacedDevice, c: RackConfig): boolean {
  if (a.mountType !== 'compact' || b.mountType !== 'compact' || !a.sharedMountGroup || a.sharedMountGroup !== b.sharedMountGroup) return false;
  if (Math.abs(a.offsetX - b.offsetX) > EPS) return false;
  const da = getPlacedDeviceDimensions(a), db = getPlacedDeviceDimensions(b);
  const separation = (da.height + db.height) / 2 + c.clearance + compactWall(c);
  return Math.abs(Math.abs(a.offsetY - b.offsetY) - separation) < EPS;
}

export interface FitIssue { deviceIds: string[]; severity: 'error' | 'warning'; message: string }
export function validateLayout(c: RackConfig): FitIssue[] {
  const issues: FitIssue[] = [];
  const devices = activeDevices(c), halfW = c.panelWidth / 2, halfH = getRackHeight(c.rackU) / 2;
  if (![c.panelWidth, c.clearance, c.rackU].every(Number.isFinite) || c.panelWidth <= 0 || c.clearance < 0) {
    return [{ deviceIds: devices.map(d => d.id), severity: 'error', message: 'Panel dimensions and clearance must be valid positive measurements.' }];
  }
  for (const d of devices) {
    const e = getMountEnvelope(d, c), b = mountBounds(d, c), name = e.name;
    const error = (message: string) => issues.push({ deviceIds: [d.id], severity: 'error', message: `${name}: ${message}` });
    if (![d.offsetX, d.offsetY, e.width, e.height, e.depth].every(Number.isFinite) || Math.min(e.width, e.height, e.depth) <= 0) {
      error('invalid position or dimensions.'); continue;
    }
    if (d.deviceId !== 'custom' && !getDevice(d.deviceId)) error('unknown device; choose a library device or enter measured dimensions.');
    if (d.orientation === 'side' && !canOrientDevice(d)) error('this mount cannot be rotated; use a generic cage.');
    if (!e.exact) issues.push({ deviceIds: [d.id], severity: 'warning', message: `${name}: this specialty mount needs a manual 3D fit check; its outline is approximate.` });
    for (const [edge, excess] of [['left', -halfW - b.left], ['right', b.right - halfW], ['bottom', -halfH - b.bottom], ['top', b.top - halfH]] as const) {
      if (excess > EPS) error(`extends past the ${edge} panel edge by ${excess.toFixed(1)} mm.`);
    }
    if (c.isSplit) {
      const left = c.leftDevices.some(x => x.id === d.id);
      const excess = left ? b.right - (c.splitPosition - getSplitMargin(c)) : c.splitPosition + getSplitMargin(c) - b.left;
      if (excess > EPS) error(`enters the ${left ? 'left' : 'right'} joiner reserve by ${excess.toFixed(1)} mm.`);
    }
  }
  for (let i = 0; i < devices.length; i++) for (let j = i + 1; j < devices.length; j++) {
    const a = devices[i], b = devices[j], ba = mountBounds(a, c), bb = mountBounds(b, c);
    const x = Math.min(ba.right, bb.right) - Math.max(ba.left, bb.left);
    const y = Math.min(ba.top, bb.top) - Math.max(ba.bottom, bb.bottom);
    const sameSide = !c.isSplit || c.leftDevices.some(d => d.id === a.id) === c.leftDevices.some(d => d.id === b.id);
    if (x > EPS && y > EPS && !(sameSide && sharesDivider(a, b, c))) issues.push({ deviceIds: [a.id, b.id], severity: 'error',
      message: `${getPlacedDeviceDimensions(a).name} overlaps ${getPlacedDeviceDimensions(b).name} by ${Math.min(x, y).toFixed(1)} mm.` });
  }
  for (const group of new Set(devices.map(d => d.sharedMountGroup).filter(Boolean))) {
    const members = devices.filter(d => d.sharedMountGroup === group);
    const connected = new Set([members[0].id]);
    for (let pass = 0; pass < members.length; pass++) for (const a of members) for (const b of members) {
      if (connected.has(a.id) && sharesDivider(a, b, c)) connected.add(b.id);
    }
    if (members.length < 2 || connected.size !== members.length) issues.push({ deviceIds: members.map(d => d.id), severity: 'warning',
      message: 'Shared support is no longer connected. Stack its devices again or detach them from the shared support.' });
  }
  return issues;
}

interface Block { width: number; height: number; devices: PlacedDevice[]; cost: number; stack: boolean }
export interface FitOptions { allowRotation: boolean; allowCompact: boolean; allowShared: boolean }
export interface FitResult { config: RackConfig | null; message: string; changes: string[] }

// Bounded slicing-floorplan search. Keep several Pareto-optimal sizes, never claim
// that failure proves impossibility. Positions use exact mm, independently of UI grid.
function pack(devices: PlacedDevice[], c: RackConfig, options: FitOptions): Block[] {
  if (!devices.length) return [{ width: 0, height: 0, devices: [], cost: 0, stack: false }];
  const cache = new Map<number, Block[]>();
  const prune = (blocks: Block[]) => {
    const out: Block[] = [];
    blocks.sort((a, b) => a.cost - b.cost || a.width * a.height - b.width * b.height);
    for (const b of blocks) {
      if (b.height > getRackHeight(c.rackU) - 2 * EDGE_GAP + EPS || b.width > c.panelWidth - 2 * EDGE_GAP) continue;
      if (out.some(a => a.width <= b.width + EPS && a.height <= b.height + EPS && a.cost <= b.cost && (a.stack || !b.stack))) continue;
      out.push(b);
      if (out.length >= 80) break;
    }
    return out;
  };
  const solve = (mask: number): Block[] => {
    if (cache.has(mask)) return cache.get(mask)!;
    const indices = devices.map((_, i) => i).filter(i => mask & (1 << i));
    let result: Block[] = [];
    if (indices.length === 1) {
      const source = devices[indices[0]];
      const orientations = options.allowRotation && canOrientDevice(source) ? ['normal', 'side'] as const : [source.orientation ?? 'normal'];
      const mounts = options.allowCompact && ['cage', 'cage_rect', 'cage_open'].includes(source.mountType) ? [source.mountType, 'compact'] as const : [source.mountType];
      for (const mountType of mounts) for (const orientation of orientations) {
        const d = { ...source, mountType, orientation, sharedMountGroup: undefined } as PlacedDevice;
        const e = getMountEnvelope(d, c);
        result.push({ width: e.width, height: e.height, devices: [{ ...d, offsetX: e.width / 2, offsetY: e.height / 2 }],
          cost: (mountType === source.mountType ? 0 : 4) + (orientation === (source.orientation ?? 'normal') ? 0 : 1), stack: mountType === 'compact' });
      }
    } else {
      const first = 1 << indices[0];
      for (let aMask = (mask - 1) & mask; aMask; aMask = (aMask - 1) & mask) {
        if (!(aMask & first) || aMask === mask) continue;
        for (const a of solve(aMask)) for (const b of solve(mask ^ aMask)) {
          for (const mode of ['horizontal', 'vertical', 'shared'] as const) {
            const shared = mode === 'shared';
            if (shared && (!options.allowShared || !a.stack || !b.stack)) continue;
            const horizontal = mode === 'horizontal';
            const gap = shared ? -compactWall(c) : DEVICE_GAP;
            const width = horizontal ? a.width + b.width + gap : Math.max(a.width, b.width);
            const height = horizontal ? Math.max(a.height, b.height) : a.height + b.height + gap;
            if (height > getRackHeight(c.rackU) - 2 * EDGE_GAP + EPS || width > c.panelWidth) continue;
            const group = shared ? `shared-${[...a.devices, ...b.devices].map(d => d.id).sort().join('-')}` : undefined;
            const shift = (block: Block, x: number, y: number) => block.devices.map(d => ({ ...d, offsetX: d.offsetX + x, offsetY: d.offsetY + y,
              sharedMountGroup: group ?? d.sharedMountGroup }));
            result.push({ width, height, cost: a.cost + b.cost + (shared ? 0.5 : 0), stack: shared,
              devices: [...shift(a, horizontal ? 0 : (width - a.width) / 2, horizontal ? (height - a.height) / 2 : 0),
                ...shift(b, horizontal ? a.width + gap : (width - b.width) / 2, horizontal ? (height - b.height) / 2 : a.height + gap)] });
          }
        }
        if (result.length > 5000) result = prune(result);
      }
    }
    result = prune(result); cache.set(mask, result); return result;
  };
  return solve((1 << devices.length) - 1);
}

export function fitTo2U(source: RackConfig, options: FitOptions): FitResult {
  const fail = (message: string): FitResult => ({ config: null, message, changes: [] });
  const devices = activeDevices(source);
  if (!devices.length) return fail('Add devices before trying to fit them.');
  const sides = source.isSplit ? [source.leftDevices, source.rightDevices] : [source.devices];
  if (sides.some(s => s.length > 6)) return fail('Automatic fitting supports up to six devices per panel half. Arrange larger layouts manually.');
  if (devices.some(d => !getMountEnvelope(d, source).exact || (!getDevice(d.deviceId) && d.deviceId !== 'custom') || (d.orientation === 'side' && !canOrientDevice(d))))
    return fail('Automatic fitting supports generic cages and cutouts. Check specialty mounts manually.');
  const c: RackConfig = { ...source, rackU: 2, toollessHookPattern: source.toollessHookPattern.slice(0, 2), toollessHookTrimPattern: source.toollessHookTrimPattern.slice(0, 2) };
  const blocks = sides.map(s => pack(s, c, options));
  let best: { config: RackConfig; score: number } | null = null;
  const place = (b: Block, left: number, right: number) => b.devices.map(d => ({ ...d, offsetX: d.offsetX + (left + right - b.width) / 2, offsetY: d.offsetY - b.height / 2 }));
  const halfW = c.panelWidth / 2;
  for (const a of blocks[0]) for (const b of (c.isSplit ? blocks[1] : [{ width: 0, height: 0, devices: [], cost: 0, stack: false }])) {
    let split = c.splitPosition;
    if (c.isSplit) {
      const min = -halfW + EDGE_GAP + a.width + getSplitMargin(c);
      const max = halfW - EDGE_GAP - b.width - getSplitMargin(c);
      if (min > max + EPS) continue;
      if (c.splitLocked && (split < min - EPS || split > max + EPS)) continue;
      if (!c.splitLocked) split = Math.max(min, Math.min(max, split));
    } else if (a.width > c.panelWidth - 2 * EDGE_GAP) continue;
    const candidate: RackConfig = { ...c, splitPosition: split, devices: c.isSplit ? [] : place(a, -halfW + EDGE_GAP, halfW - EDGE_GAP),
      leftDevices: c.isSplit ? place(a, -halfW + EDGE_GAP, split - getSplitMargin(c)) : [],
      rightDevices: c.isSplit ? place(b, split + getSplitMargin(c), halfW - EDGE_GAP) : [] };
    if (validateLayout(candidate).some(i => i.severity === 'error')) continue;
    const score = a.cost + b.cost + Math.abs(split - source.splitPosition) * 0.02;
    if (!best || score < best.score) best = { config: candidate, score };
  }
  if (!best) return fail('No 2U arrangement found with these options. Try allowing rotation, compact cages and shared dividers, or unlock the split. No devices were removed.');
  const result = best.config;
  const changes: string[] = [];
  if (source.rackU !== 2) changes.push(`Rack height: ${source.rackU}U → 2U`);
  if (Math.abs(result.splitPosition - source.splitPosition) > EPS) changes.push(`Split: ${source.splitPosition.toFixed(1)} → ${result.splitPosition.toFixed(1)} mm`);
  for (const d of activeDevices(result)) {
    const old = devices.find(x => x.id === d.id)!;
    const name = getPlacedDeviceDimensions(d).name;
    if ((old.orientation ?? 'normal') !== d.orientation) changes.push(`${name}: ${d.orientation === 'side' ? 'rotate onto its side' : 'return to normal orientation'}`);
    if (old.mountType !== d.mountType) changes.push(`${name}: compact cage`);
  }
  const groups = new Set(activeDevices(result).map(d => d.sharedMountGroup).filter(Boolean));
  for (const group of groups) changes.push(`Shared divider: ${activeDevices(result).filter(d => d.sharedMountGroup === group).map(d => getPlacedDeviceDimensions(d).name).join(' + ')}`);
  changes.push('Reposition devices within their current panel sides; retain every device.');
  return { config: result, changes, message: '2U arrangement found. Mounts clear the panel edges and joiner reserves.' };
}
