// JSCAD Rack Mounts Common - Shared configuration and base modules
// Translated from OpenSCAD rack_mounts/common.scad

import { primitives, booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { EPS, DEFAULT_SEGMENTS, RADIUS_XY_SLACK } from '../constants';

const { cuboid, cylinder } = primitives;
const { union, subtract } = booleans;
const { translate } = transforms;

// Common rack mount constants
export const RAIL_FRONT_THICKNESS = 8;
export const RAIL_SCREW_HOLE_TO_INNER = 5;
export const RAIL_SCREW_HOLE_TO_OUTER = 7;
export const FRONT_FACE_WIDTH = 12;

/**
 * Create a base plate with 4 corner mounting holes and optional rounded corners
 */
export function plateBase(
  width: number,
  height: number,
  thickness = 3,
  screwDiameter = 4,
  _cornerRadius = 2,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  // Main plate
  let plate = cuboid({
    size: [width, height, thickness],
    center: [width / 2, height / 2, thickness / 2],
  });

  // Corner screw holes
  const margin = screwDiameter + 3;
  const holeRadius = screwDiameter / 2 + RADIUS_XY_SLACK;
  const positions: [number, number][] = [
    [margin, margin],
    [width - margin, margin],
    [margin, height - margin],
    [width - margin, height - margin],
  ];

  for (const [x, y] of positions) {
    const hole = translate(
      [x, y, -EPS],
      cylinder({
        radius: holeRadius,
        height: thickness + 2 * EPS,
        segments,
        center: [0, 0, (thickness + 2 * EPS) / 2],
      })
    );
    plate = subtract(plate, hole);
  }

  return plate;
}

/**
 * Create a simple rack ear / L-bracket
 */
export function rackEar(
  height: number,
  frontThickness = 3,
  sideThickness = 3,
  frontWidth = 20,
  sideDepth = 50,
  screwDiameter = 4,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  // Front face
  const front = cuboid({
    size: [frontWidth, height, frontThickness],
    center: [frontWidth / 2, height / 2, frontThickness / 2],
  });

  // Side face (extends backward)
  const side = translate(
    [0, 0, frontThickness],
    cuboid({
      size: [sideThickness, height, sideDepth],
      center: [sideThickness / 2, height / 2, sideDepth / 2],
    })
  );

  let ear = union(front, side);

  // Screw hole in front face
  const hole = translate(
    [frontWidth / 2, height / 2, -EPS],
    cylinder({
      radius: screwDiameter / 2 + RADIUS_XY_SLACK,
      height: frontThickness + 2 * EPS,
      segments,
      center: [0, 0, (frontThickness + 2 * EPS) / 2],
    })
  );
  ear = subtract(ear, hole);

  return ear;
}
