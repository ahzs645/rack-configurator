// JSCAD Screws - Screw hole dimensions and hex nut pocket modules
// Translated from OpenSCAD components/screws.scad

import { primitives, booleans, transforms, extrusions } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { EPS, RADIUS_XY_SLACK, DEFAULT_SEGMENTS } from './constants';

const { cylinder, polygon } = primitives;
const { union } = booleans;
const { translate } = transforms;
const { extrudeLinear } = extrusions;

// Screw dimensions: [clearance_dia, head_dia, head_height, hex_flats, hex_thickness]
export const SCREW_DATA: Record<string, {
  clearanceDia: number;
  headDia: number;
  headHeight: number;
  hexFlats: number;
  hexThickness: number;
}> = {
  'M2':     { clearanceDia: 2.4,  headDia: 3.8,  headHeight: 1.2, hexFlats: 4.0,  hexThickness: 1.6 },
  'M2.5':   { clearanceDia: 2.9,  headDia: 4.7,  headHeight: 1.7, hexFlats: 5.0,  hexThickness: 2.0 },
  'M3':     { clearanceDia: 3.4,  headDia: 5.5,  headHeight: 2.0, hexFlats: 5.5,  hexThickness: 2.4 },
  'M4':     { clearanceDia: 4.5,  headDia: 7.0,  headHeight: 2.8, hexFlats: 7.0,  hexThickness: 3.2 },
  'M5':     { clearanceDia: 5.5,  headDia: 8.5,  headHeight: 3.5, hexFlats: 8.0,  hexThickness: 4.0 },
  'M6':     { clearanceDia: 6.6,  headDia: 10.0, headHeight: 4.0, hexFlats: 10.0, hexThickness: 5.0 },
  '4-40':   { clearanceDia: 3.26, headDia: 5.0,  headHeight: 1.5, hexFlats: 6.35, hexThickness: 2.38 },
  '6-32':   { clearanceDia: 3.80, headDia: 6.0,  headHeight: 2.0, hexFlats: 7.94, hexThickness: 2.78 },
  '8-32':   { clearanceDia: 4.37, headDia: 7.0,  headHeight: 2.5, hexFlats: 8.73, hexThickness: 3.18 },
  '10-24':  { clearanceDia: 5.11, headDia: 8.0,  headHeight: 2.8, hexFlats: 9.53, hexThickness: 3.18 },
  '10-32':  { clearanceDia: 5.11, headDia: 8.0,  headHeight: 2.8, hexFlats: 9.53, hexThickness: 3.18 },
  '1/4-20': { clearanceDia: 6.76, headDia: 10.0, headHeight: 4.0, hexFlats: 11.11, hexThickness: 5.56 },
};

export function getScrewData(screwType: string) {
  return SCREW_DATA[screwType] ?? SCREW_DATA['M5'];
}

export function flatsToCorners(flats: number): number {
  return flats / Math.cos(Math.PI / 6);
}

export function cornersToFlats(corners: number): number {
  return corners * Math.cos(Math.PI / 6);
}

export function screwRadiusSlacked(screwType: string): number {
  const data = getScrewData(screwType);
  return data.clearanceDia / 2 + RADIUS_XY_SLACK;
}

export function hexNutCornersSlacked(screwType: string): number {
  const data = getScrewData(screwType);
  return flatsToCorners(data.hexFlats) / 2 + RADIUS_XY_SLACK;
}

/**
 * Create a screw clearance hole
 */
export function screwHole(
  screwType = 'M5',
  depth = 20,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const radius = screwRadiusSlacked(screwType);
  return cylinder({ radius, height: depth + EPS, segments, center: [0, 0, depth / 2] });
}

/**
 * Create a countersunk screw hole
 */
export function countersunkHole(
  screwType = 'M5',
  screwDepth = 20,
  headExtension = 10,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const data = getScrewData(screwType);
  const shaftRadius = data.clearanceDia / 2 + RADIUS_XY_SLACK;
  const headRadius = data.headDia / 2 + RADIUS_XY_SLACK;
  const headHeight = data.headHeight;

  const shaft = cylinder({ radius: shaftRadius, height: screwDepth, segments, center: [0, 0, screwDepth / 2] });
  // Simpler: just use a cylinder for the countersink area
  const headCyl = translate(
    [0, 0, screwDepth - EPS],
    cylinder({ radius: headRadius, height: headHeight + headExtension, segments, center: [0, 0, (headHeight + headExtension) / 2] })
  );

  return union(shaft, headCyl);
}

/**
 * Create a hex nut shape (2D profile extruded)
 */
export function hexNutShape(
  screwType = 'M5',
  height?: number,
  _segments = 6
): Geom3 {
  const data = getScrewData(screwType);
  const h = height ?? data.hexThickness;
  const radius = flatsToCorners(data.hexFlats) / 2 + RADIUS_XY_SLACK;

  // Create hexagonal profile
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  const hex2d = polygon({ points });
  return extrudeLinear({ height: h }, hex2d);
}

/**
 * Create a hex nut pocket (for embedding nuts in prints)
 */
export function hexNutPocket(
  screwType = 'M5',
  openSide = true,
  backSpace = 20,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const data = getScrewData(screwType);
  const nutHeight = data.hexThickness + 0.4; // slack
  const nutRadius = flatsToCorners(data.hexFlats) / 2 + RADIUS_XY_SLACK;
  const screwRadius = data.clearanceDia / 2 + RADIUS_XY_SLACK;

  const parts: Geom3[] = [];

  // Hex nut cavity
  parts.push(hexNutShape(screwType, nutHeight));

  // Through-hole for screw
  parts.push(
    cylinder({ radius: screwRadius, height: backSpace + nutHeight + EPS, segments, center: [0, 0, (backSpace + nutHeight + EPS) / 2 - backSpace / 2] })
  );

  // Open side slot for sliding nut in
  if (openSide) {
    const slotWidth = data.hexFlats + RADIUS_XY_SLACK * 2;
    const slotDepth = nutRadius + 5;
    parts.push(
      translate(
        [0, slotDepth / 2, nutHeight / 2],
        primitives.cuboid({ size: [slotWidth, slotDepth, nutHeight] })
      )
    );
  }

  return union(...parts);
}

/**
 * Create a screw with nut pattern (through-hole + nut pocket on back)
 */
export function screwWithNut(
  screwType = 'M5',
  totalDepth = 10,
  nutSide: 'front' | 'back' = 'back',
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const data = getScrewData(screwType);
  const screwRadius = data.clearanceDia / 2 + RADIUS_XY_SLACK;

  // Through-hole
  const hole = cylinder({ radius: screwRadius, height: totalDepth + 2 * EPS, segments, center: [0, 0, totalDepth / 2] });

  // Nut pocket on specified side
  const nutZ = nutSide === 'back' ? 0 : totalDepth - data.hexThickness - 0.4;
  const nut = translate([0, 0, nutZ], hexNutPocket(screwType, true, 0, segments));

  return union(hole, nut);
}
