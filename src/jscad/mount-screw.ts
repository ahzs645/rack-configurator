// JSCAD Mount Screw - Standoff mount plates for SBCs and drives
// Translated from OpenSCAD components/mount_screw.scad

import { primitives, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { EPS, DEFAULT_SEGMENTS } from './constants';
import { safeUnion, safeSubtract } from './utilities';

const { cuboid, cylinder } = primitives;
const { translate } = transforms;

/**
 * Create a screw mount plate with standoffs
 */
export function screwMount(
  deviceWidth: number,
  deviceDepth: number,
  screwPositions: [number, number][] = [],
  screwDiameter = 3,
  thickness = 3,
  standoffHeight = 5,
  standoffDiameter = 6,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const parts: Geom3[] = [];
  const cuts: Geom3[] = [];

  // Base plate
  parts.push(cuboid({
    size: [deviceWidth, deviceDepth, thickness],
    center: [deviceWidth / 2, deviceDepth / 2, thickness / 2],
  }));

  // Standoffs at each screw position
  for (const [sx, sy] of screwPositions) {
    // Standoff cylinder
    parts.push(translate(
      [sx, sy, thickness],
      cylinder({
        radius: standoffDiameter / 2,
        height: standoffHeight,
        segments,
        center: [0, 0, standoffHeight / 2],
      })
    ));

    // Screw hole through standoff and plate
    cuts.push(translate(
      [sx, sy, -EPS],
      cylinder({
        radius: screwDiameter / 2,
        height: thickness + standoffHeight + 2 * EPS,
        segments,
        center: [0, 0, (thickness + standoffHeight + 2 * EPS) / 2],
      })
    ));
  }

  // Optional ventilation if device area is large enough
  if (deviceWidth > 50 && deviceDepth > 50 && screwPositions.length > 0) {
    // Add some rectangular vent slots in the base
    const ventMargin = 15;
    const slotWidth = 4;
    const slotSpacing = 8;
    const ventArea = deviceWidth - 2 * ventMargin;
    const numSlots = Math.floor((deviceDepth - 2 * ventMargin) / (slotWidth + slotSpacing));

    for (let i = 0; i < numSlots; i++) {
      const y = ventMargin + i * (slotWidth + slotSpacing);
      cuts.push(translate(
        [ventMargin, y, -EPS],
        cuboid({
          size: [ventArea, slotWidth, thickness + 2 * EPS],
          center: [ventArea / 2, slotWidth / 2, (thickness + 2 * EPS) / 2],
        })
      ));
    }
  }

  let mount = safeUnion(...parts);
  if (cuts.length > 0) {
    mount = safeSubtract(mount, ...cuts);
  }

  return mount;
}

/**
 * SBC mount with standard SBC mounting patterns
 */
export function sbcMount(
  deviceWidth: number,
  deviceDepth: number,
  holeSpacingX: number,
  holeSpacingY: number,
  screwDiameter = 2.5,
  standoffHeight = 5,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  // Center the screw pattern on the device
  const cx = deviceWidth / 2;
  const cy = deviceDepth / 2;

  const positions: [number, number][] = [
    [cx - holeSpacingX / 2, cy - holeSpacingY / 2],
    [cx + holeSpacingX / 2, cy - holeSpacingY / 2],
    [cx - holeSpacingX / 2, cy + holeSpacingY / 2],
    [cx + holeSpacingX / 2, cy + holeSpacingY / 2],
  ];

  return screwMount(deviceWidth, deviceDepth, positions, screwDiameter, 3, standoffHeight, 6, segments);
}

/**
 * HDD mount for 2.5" or 3.5" drives
 */
export function hddMount(
  driveType: '25' | '35' = '25',
  segments = DEFAULT_SEGMENTS
): Geom3 {
  if (driveType === '25') {
    // 2.5" SATA drive: 70mm x 100mm, holes at 61.72mm x 76.6mm spacing
    return screwMount(70, 100, [
      [(70 - 61.72) / 2, (100 - 76.6) / 2],
      [(70 + 61.72) / 2, (100 - 76.6) / 2],
      [(70 - 61.72) / 2, (100 + 76.6) / 2],
      [(70 + 61.72) / 2, (100 + 76.6) / 2],
    ], 3, 3, 5, 6, segments);
  } else {
    // 3.5" SATA drive: 101.6mm x 147mm, holes at 95.25mm x 101.6mm spacing
    return screwMount(101.6, 147, [
      [(101.6 - 95.25) / 2, (147 - 101.6) / 2],
      [(101.6 + 95.25) / 2, (147 - 101.6) / 2],
      [(101.6 - 95.25) / 2, (147 + 101.6) / 2],
      [(101.6 + 95.25) / 2, (147 + 101.6) / 2],
    ], 3, 3, 5, 6, segments);
  }
}

/**
 * Position screw mount for rack generator
 */
export function screwMountPositioned(
  offsetX: number,
  offsetY: number,
  panelWidth: number,
  rackHeight: number,
  deviceWidth: number,
  deviceDepth: number,
  plateThickness = 4,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const cx = panelWidth / 2 + offsetX - deviceWidth / 2;
  const cy = rackHeight / 2 + offsetY - deviceDepth / 2;

  // Default screw pattern: 4 corners
  const margin = 5;
  const positions: [number, number][] = [
    [margin, margin],
    [deviceWidth - margin, margin],
    [margin, deviceDepth - margin],
    [deviceWidth - margin, deviceDepth - margin],
  ];

  const mount = screwMount(deviceWidth, deviceDepth, positions, 3, 3, 5, 6, segments);
  return translate([cx, cy, plateThickness], mount);
}
