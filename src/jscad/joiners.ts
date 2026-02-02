// JSCAD Joiners - Bolt-together joint connectors for split faceplates
// Translated from OpenSCAD components/joiners.scad

import { primitives, booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import {
  EIA_UNIT_HEIGHT, EPS, DEFAULT_SEGMENTS, RADIUS_XY_SLACK,
} from './constants';
import { getScrewData, flatsToCorners, hexNutShape } from './screws';
import { dovetail, dovetailSocket } from './dovetail';

const { cuboid, cylinder } = primitives;
const { union, subtract } = booleans;
const { translate, rotate, mirror } = transforms;
// Joiner constants
const BASE_WALL_THICKNESS = 4;
const BASE_WALL_HEIGHT = 15;
const SCREW_TOP_HEIGHT = 10;
const SCREW_BOTTOM_HEIGHT = 4;

/**
 * Calculate joiner wall thickness based on screw type and nut floor
 */
function joinerWallThickness(
  _screwType: string,
  nutDepth: number,
  nutFloor: number
): number {
  const minThickness = nutFloor + nutDepth + 1.0 + 0.5;
  return Math.max(BASE_WALL_THICKNESS, minThickness);
}

/**
 * Calculate spread distance for screw triangle pattern
 */
function joinerScrewSpread(screwType: string): number {
  const data = getScrewData(screwType);
  return flatsToCorners(data.hexFlats) + 3;
}

/**
 * Get screw positions in triangle pattern for each U
 * Returns positions as [x, y] relative to the wall
 */
function getTriangleScrewPositions(
  rackU: number,
  _wallHeight: number,
  screwType: string
): [number, number][] {
  const spread = joinerScrewSpread(screwType);
  const positions: [number, number][] = [];

  for (let u = 0; u < rackU; u++) {
    const yBase = u * EIA_UNIT_HEIGHT + EIA_UNIT_HEIGHT / 2;

    // Two top screws (spread apart)
    positions.push([-spread / 2, yBase + SCREW_TOP_HEIGHT / 2]);
    positions.push([spread / 2, yBase + SCREW_TOP_HEIGHT / 2]);

    // One bottom screw (centered)
    positions.push([0, yBase - SCREW_BOTTOM_HEIGHT]);
  }

  return positions;
}

/**
 * Create a joiner wall (thin vertical wall at joint edge)
 * The wall has a hull shape with rounded top
 */
function joinerWall(
  rackU: number,
  wallThickness: number,
  wallHeight: number,
  _segments = DEFAULT_SEGMENTS
): Geom3 {
  const height = rackU * EIA_UNIT_HEIGHT - 0.79; // faceplateHeight

  // Simple wall shape
  return cuboid({
    size: [wallThickness, height, wallHeight],
    center: [wallThickness / 2, height / 2, wallHeight / 2],
  });
}

/**
 * Create left side faceplate joiner (wall + screw holes + nut pockets)
 */
export function faceplateJoinerLeft(
  rackU: number,
  screwType = 'M5',
  nutSide: 'left' | 'right' = 'right',
  nutDepth = 4.5,
  nutFloor = 0,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const data = getScrewData(screwType);
  const wallThick = joinerWallThickness(screwType, nutDepth, nutFloor);
  const wallHeight = BASE_WALL_HEIGHT + data.hexFlats;

  // Main wall
  let wall = joinerWall(rackU, wallThick, wallHeight, segments);

  // Get screw positions
  const positions = getTriangleScrewPositions(rackU, wallHeight, screwType);

  // Add screw holes and nut pockets
  for (const [sx, sy] of positions) {
    // Through-hole
    const hole = translate(
      [wallThick / 2 + sx, sy, -EPS],
      cylinder({
        radius: data.clearanceDia / 2 + RADIUS_XY_SLACK,
        height: wallHeight + 2 * EPS,
        segments,
        center: [0, 0, (wallHeight + 2 * EPS) / 2],
      })
    );
    wall = subtract(wall, hole);

    // Hex nut pocket on specified side
    const nutZ = nutSide === 'right' ? wallHeight - nutDepth - data.hexThickness : nutFloor;
    const nut = translate(
      [wallThick / 2 + sx, sy, nutZ],
      hexNutShape(screwType, data.hexThickness + 0.4)
    );
    wall = subtract(wall, nut);
  }

  return wall;
}

/**
 * Create right side faceplate joiner (mirrored)
 */
export function faceplateJoinerRight(
  rackU: number,
  screwType = 'M5',
  nutSide: 'left' | 'right' = 'right',
  nutDepth = 4.5,
  nutFloor = 0,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const left = faceplateJoinerLeft(rackU, screwType, nutSide, nutDepth, nutFloor, segments);
  return mirror({ normal: [1, 0, 0] }, left);
}

/**
 * Create a dovetail joiner (left side - male)
 */
export function dovetailJoinerLeft(
  rackU: number,
  _segments = DEFAULT_SEGMENTS
): Geom3 {
  const height = rackU * EIA_UNIT_HEIGHT - 0.79;
  const wallThick = 6;
  const dovetailLength = height * 0.8; // 80% of panel height

  // Base wall
  const wall = cuboid({
    size: [wallThick, height, BASE_WALL_HEIGHT],
    center: [wallThick / 2, height / 2, BASE_WALL_HEIGHT / 2],
  });

  // Dovetail (male connector extending from wall)
  const dt = translate(
    [wallThick, (height - dovetailLength) / 2, BASE_WALL_HEIGHT / 2 - 3],
    rotate(
      [0, 0, Math.PI / 2],
      dovetail(8, 12, 6, dovetailLength)
    )
  );

  return union(wall, dt);
}

/**
 * Create a dovetail joiner (right side - female)
 */
export function dovetailJoinerRight(
  rackU: number,
  _segments = DEFAULT_SEGMENTS
): Geom3 {
  const height = rackU * EIA_UNIT_HEIGHT - 0.79;
  const wallThick = 6;
  const dovetailLength = height * 0.8;

  // Base wall
  let wall = cuboid({
    size: [wallThick, height, BASE_WALL_HEIGHT],
    center: [wallThick / 2, height / 2, BASE_WALL_HEIGHT / 2],
  });

  // Dovetail socket (female, cut into wall)
  const socket = translate(
    [0, (height - dovetailLength) / 2, BASE_WALL_HEIGHT / 2 - 3],
    rotate(
      [0, 0, Math.PI / 2],
      dovetailSocket(8, 12, 6, dovetailLength)
    )
  );

  wall = subtract(wall, socket);
  return wall;
}
