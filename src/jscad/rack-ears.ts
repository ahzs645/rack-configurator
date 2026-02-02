// JSCAD Rack Ears - Toolless hooks, L-bracket ears, fusion ears
// Translated from OpenSCAD components/rack_ears.scad

import { primitives, booleans, transforms, extrusions } from '@jscad/modeling';
import type { Geom3, Geom2 } from '@jscad/modeling/src/geometries/types';
import { EPS, DEFAULT_SEGMENTS, faceplateHeight } from './constants';

const { cuboid, cylinder, polygon } = primitives;
const { union, subtract } = booleans;
const { translate, rotate, mirror } = transforms;
const { extrudeLinear } = extrusions;

// Toolless hook constants
const HOOK_HEIGHT = 30.4;
const HOOK_SPACING = 47.625; // 1.875" = standard rack hole spacing
const EAR_THICKNESS = 2.9;
const EAR_BOTTOM_DEPTH = 22;

// Countersink hole dimensions
const HOLE_RADIUS = 2.25;
const COUNTERSINK_RADIUS = 4;

/**
 * Create the backplate profile for toolless hooks (2D polygon)
 * This is the cross-section of the hook that grips the rack
 */
function backplateProfile(scaleFactor = 1.0): Geom2 {
  // Hook profile polygon - simplified version of the OpenSCAD profile
  const s = scaleFactor;
  const points: [number, number][] = [
    [0, 0],
    [0, HOOK_HEIGHT * s],
    [1.5 * s, HOOK_HEIGHT * s],
    [1.5 * s, (HOOK_HEIGHT - 2) * s],
    [3.5 * s, (HOOK_HEIGHT - 4) * s],
    [3.5 * s, (HOOK_HEIGHT - 8) * s],
    [2.0 * s, (HOOK_HEIGHT - 10) * s],
    [2.0 * s, 10 * s],
    [3.5 * s, 8 * s],
    [3.5 * s, 4 * s],
    [1.5 * s, 2 * s],
    [1.5 * s, 0],
  ];
  return polygon({ points });
}

/**
 * Create a single toolless rack hook
 */
function rackHook(
  thickness = EAR_THICKNESS,
  _segments = DEFAULT_SEGMENTS
): Geom3 {
  const profile = backplateProfile();
  return rotate(
    [Math.PI / 2, 0, Math.PI / 2],
    extrudeLinear({ height: thickness }, profile)
  );
}

/**
 * Create a countersink hole (M5 hole with countersink cone)
 */
function countersinkHole(
  holeRadius = HOLE_RADIUS,
  countersinkRadius = COUNTERSINK_RADIUS,
  depth = 7,
  countersinkDepth = 2.75,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const shaft = cylinder({
    radius: holeRadius,
    height: depth + EPS,
    segments,
    center: [0, 0, (depth + EPS) / 2],
  });
  const csink = translate(
    [0, 0, depth - countersinkDepth],
    cylinder({
      radius: countersinkRadius,
      height: countersinkDepth + EPS,
      segments,
      center: [0, 0, (countersinkDepth + EPS) / 2],
    })
  );
  return union(shaft, csink);
}

/**
 * Create a simple L-bracket rack ear (left side)
 */
function simpleRackEar(
  height: number,
  thickness = EAR_THICKNESS,
  sideWidth = 15.875, // 5/8" standard
  bottomDepth = 22,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  // Side panel (vertical)
  const side = cuboid({
    size: [sideWidth, height, thickness],
    center: [-sideWidth / 2, height / 2, thickness / 2],
  });

  // Bottom panel (horizontal, extends backward)
  const bottom = cuboid({
    size: [sideWidth, thickness, bottomDepth],
    center: [-sideWidth / 2, thickness / 2, bottomDepth / 2],
  });

  // Screw hole in the center of the side panel
  const hole = translate(
    [-sideWidth / 2, height / 2, 0],
    countersinkHole(HOLE_RADIUS, COUNTERSINK_RADIUS, thickness + EPS, thickness * 0.8, segments)
  );

  return subtract(union(side, bottom), hole);
}

/**
 * Create patterned toolless hooks along one side
 * hookPattern: array of booleans indicating which positions have hooks
 * trimPattern: array of booleans indicating which disabled positions are trimmed
 */
function patternedRackHooks(
  rackU: number,
  hookPattern: boolean[],
  trimPattern: boolean[],
  thickness = EAR_THICKNESS,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const height = faceplateHeight(rackU);
  const hookCount = Math.floor((height - HOOK_HEIGHT) / HOOK_SPACING) + 1;

  const hooks: Geom3[] = [];

  // Base side panel
  let sidePanel = cuboid({
    size: [thickness, height, EAR_BOTTOM_DEPTH],
    center: [thickness / 2, height / 2, EAR_BOTTOM_DEPTH / 2],
  });

  for (let i = 0; i < hookCount; i++) {
    const patIdx = i % Math.max(1, hookPattern.length);
    const isEnabled = hookPattern[patIdx] !== false;
    const y = i * HOOK_SPACING;

    if (isEnabled) {
      const hook = translate(
        [0, y, 0],
        rackHook(thickness, segments)
      );
      hooks.push(hook);
    } else {
      // Check if this position should be trimmed
      const trimIdx = i % Math.max(1, trimPattern.length);
      if (trimPattern[trimIdx]) {
        // Trim section: remove material where hook would have been
        const trimBlock = translate(
          [-EPS, y, -EPS],
          cuboid({
            size: [thickness + 2 * EPS, HOOK_HEIGHT, EAR_BOTTOM_DEPTH + 2 * EPS],
            center: [(thickness + 2 * EPS) / 2, HOOK_HEIGHT / 2, (EAR_BOTTOM_DEPTH + 2 * EPS) / 2],
          })
        );
        sidePanel = subtract(sidePanel, trimBlock);
      }
    }
  }

  if (hooks.length > 0) {
    return union(sidePanel, ...hooks);
  }
  return sidePanel;
}

/**
 * Create rack ears for the full rack
 * Returns the complete ear assembly (left + right or single side)
 */
export function createRackEars(
  panelWidth: number,
  rackU: number,
  earStyle: 'toolless' | 'fusion' | 'simple' | 'none',
  _earPosition: 'bottom' | 'top' | 'center' = 'bottom',
  earThickness = EAR_THICKNESS,
  hookPattern: boolean[] = [true],
  trimPattern: boolean[] = [],
  segments = DEFAULT_SEGMENTS
): Geom3 | null {
  if (earStyle === 'none') return null;

  const height = faceplateHeight(rackU);
  const parts: Geom3[] = [];

  if (earStyle === 'toolless') {
    // Left side hooks
    const leftHooks = translate(
      [-earThickness, 0, 0],
      patternedRackHooks(rackU, hookPattern, trimPattern, earThickness, segments)
    );
    parts.push(leftHooks);

    // Right side hooks (mirrored)
    const rightHooks = translate(
      [panelWidth, 0, 0],
      patternedRackHooks(rackU, hookPattern, trimPattern, earThickness, segments)
    );
    parts.push(rightHooks);
  } else if (earStyle === 'simple') {
    // Simple L-bracket ears
    const leftEar = simpleRackEar(height, earThickness, 15.875, EAR_BOTTOM_DEPTH, segments);
    parts.push(leftEar);

    const rightEar = translate(
      [panelWidth, 0, 0],
      mirror({ normal: [-1, 0, 0] }, simpleRackEar(height, earThickness, 15.875, EAR_BOTTOM_DEPTH, segments))
    );
    parts.push(rightEar);
  } else if (earStyle === 'fusion') {
    // Fusion-style ears (wider L-bracket with more material)
    const earWidth = (482.6 - panelWidth) / 2;
    const leftEar = simpleRackEar(height, earThickness, earWidth, EAR_BOTTOM_DEPTH, segments);
    parts.push(leftEar);

    const rightEar = translate(
      [panelWidth, 0, 0],
      mirror({ normal: [-1, 0, 0] }, simpleRackEar(height, earThickness, earWidth, EAR_BOTTOM_DEPTH, segments))
    );
    parts.push(rightEar);
  }

  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0] : union(...parts);
}
