// JSCAD Cage - Full protective cage with ventilation
// Translated from OpenSCAD components/cage.scad

import { primitives, booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { EPS, DEFAULT_SEGMENTS } from './constants';
import { twoRoundedCornerPlate, positionedCuboid, safeUnion } from './utilities';
import { honeycombCutout, rectVentSlots } from './honeycomb';

const { cuboid } = primitives;
const { subtract } = booleans;
const { translate, rotate } = transforms;

/**
 * Create a reinforcing block behind the faceplate (support structure)
 */
/**
 * Create a side plate with optional ventilation
 */
function sidePlate(
  height: number,
  depth: number,
  thickness: number,
  deviceHeight: number,
  deviceDepth: number,
  cutoutEdge: number,
  cutoutRadius: number,
  _isLeft: boolean,
  useHoneycomb: boolean,
  hexDia: number,
  hexWall: number,
  frontOffset: number,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  // Create the side plate (positioned as a wall extending backward from faceplate)
  let plate = twoRoundedCornerPlate(depth, height, thickness, cutoutRadius, segments);

  // Add ventilation cutout if device area is big enough
  const ventWidth = deviceDepth - 6 - cutoutEdge;
  const ventHeight = deviceHeight - 6;

  if (ventWidth > 10 && ventHeight > 10) {
    const ventX = frontOffset + 3;
    const ventY = (height - ventHeight) / 2;

    if (useHoneycomb) {
      const vent = translate(
        [ventX, ventY, -EPS],
        honeycombCutout(ventWidth, ventHeight, thickness + 2 * EPS, hexDia, hexWall)
      );
      plate = subtract(plate, vent);
    } else {
      const vent = translate(
        [ventX, ventY, -EPS],
        rectVentSlots(ventWidth, ventHeight, thickness + 2 * EPS)
      );
      plate = subtract(plate, vent);
    }
  }

  return plate;
}

/**
 * Create top or bottom plate with optional ventilation
 */
function topBottomPlate(
  width: number,
  depth: number,
  thickness: number,
  useHoneycomb: boolean,
  hexDia: number,
  hexWall: number,
  frontOffset: number
): Geom3 {
  let plate = cuboid({
    size: [width, depth, thickness],
    center: [width / 2, depth / 2, thickness / 2],
  });

  const ventWidth = width - 10;
  const ventDepth = depth - frontOffset - 10;

  if (ventWidth > 10 && ventDepth > 10) {
    if (useHoneycomb) {
      const vent = translate(
        [5, frontOffset + 5, -EPS],
        honeycombCutout(ventWidth, ventDepth, thickness + 2 * EPS, hexDia, hexWall)
      );
      plate = subtract(plate, vent);
    } else {
      const vent = translate(
        [5, frontOffset + 5, -EPS],
        rectVentSlots(ventWidth, ventDepth, thickness + 2 * EPS)
      );
      plate = subtract(plate, vent);
    }
  }

  return plate;
}

/**
 * Create a back plate with optional ventilation
 */
function backPlate(
  width: number,
  height: number,
  thickness: number,
  useHoneycomb: boolean,
  hexDia: number,
  hexWall: number
): Geom3 {
  let plate = cuboid({
    size: [width, height, thickness],
    center: [width / 2, height / 2, thickness / 2],
  });

  const ventWidth = width - 10;
  const ventHeight = height - 10;

  if (ventWidth > 10 && ventHeight > 10) {
    if (useHoneycomb) {
      const vent = translate(
        [5, 5, -EPS],
        honeycombCutout(ventWidth, ventHeight, thickness + 2 * EPS, hexDia, hexWall)
      );
      plate = subtract(plate, vent);
    } else {
      const vent = translate(
        [5, 5, -EPS],
        rectVentSlots(ventWidth, ventHeight, thickness + 2 * EPS)
      );
      plate = subtract(plate, vent);
    }
  }

  return plate;
}

export interface CageOptions {
  offsetX: number;
  offsetY: number;
  deviceWidth: number;
  deviceHeight: number;
  deviceDepth: number;
  deviceClearance: number;
  heavyDevice?: 0 | 1 | 2;
  useHoneycomb?: boolean;
  backOpen?: boolean;
  noBack?: boolean;
  openFrame?: boolean;
  noFront?: boolean;
  hexDia?: number;
  hexWall?: number;
  cutoutEdge?: number;
  cutoutRadius?: number;
  plateThickness?: number;
  segments?: number;
}

/**
 * Create a complete cage structure for a device
 * The cage is positioned centered on the device cutout and extends backward
 */
export function cageStructure(opts: CageOptions): Geom3 {
  const {
    deviceWidth,
    deviceHeight,
    deviceDepth,
    deviceClearance,
    heavyDevice = 0,
    useHoneycomb = true,
    backOpen = false,
    noBack = false,
    openFrame = false,
    noFront = false,
    hexDia = 8,
    hexWall = 2,
    cutoutEdge = 5,
    cutoutRadius = 5,
    plateThickness = 4,
    segments = DEFAULT_SEGMENTS,
  } = opts;

  const wallThick = plateThickness + heavyDevice;
  const clearance = deviceClearance;

  // Total cage dimensions including walls
  const totalWidth = deviceWidth + 2 * wallThick + 2 * clearance;
  const totalHeight = deviceHeight + 2 * wallThick + 2 * clearance;
  const totalDepth = deviceDepth + wallThick + clearance;

  const frontOffset = 11; // Reinforcing block depth

  const parts: Geom3[] = [];

  // Front reinforcing block (behind the faceplate)
  if (!noFront) {
    parts.push(
      positionedCuboid(0, 0, 0, totalWidth, totalHeight, frontOffset)
    );
  }

  if (!openFrame) {
    // Left side plate
    const leftSide = rotate(
      [Math.PI / 2, 0, Math.PI / 2],
      sidePlate(
        totalHeight, totalDepth, wallThick,
        deviceHeight + 2 * clearance, deviceDepth,
        cutoutEdge, cutoutRadius, true,
        useHoneycomb, hexDia, hexWall, frontOffset, segments
      )
    );
    parts.push(translate([0, 0, 0], leftSide));

    // Right side plate
    const rightSide = rotate(
      [Math.PI / 2, 0, Math.PI / 2],
      sidePlate(
        totalHeight, totalDepth, wallThick,
        deviceHeight + 2 * clearance, deviceDepth,
        cutoutEdge, cutoutRadius, false,
        useHoneycomb, hexDia, hexWall, frontOffset, segments
      )
    );
    parts.push(translate([totalWidth - wallThick, 0, 0], rightSide));

    // Top plate
    const top = rotate(
      [Math.PI / 2, 0, 0],
      topBottomPlate(totalWidth, totalDepth, wallThick, useHoneycomb, hexDia, hexWall, frontOffset)
    );
    parts.push(translate([0, totalHeight - wallThick, 0], top));

    // Bottom plate
    const bottom = rotate(
      [Math.PI / 2, 0, 0],
      topBottomPlate(totalWidth, totalDepth, wallThick, useHoneycomb, hexDia, hexWall, frontOffset)
    );
    parts.push(translate([0, 0, 0], bottom));
  } else {
    // Open frame: just side walls, no top/bottom
    const leftWall = positionedCuboid(0, 0, 0, wallThick, totalHeight, totalDepth);
    const rightWall = positionedCuboid(totalWidth - wallThick, 0, 0, wallThick, totalHeight, totalDepth);
    parts.push(leftWall, rightWall);
  }

  // Back plate (unless open or explicitly removed)
  if (!backOpen && !noBack) {
    const back = backPlate(totalWidth, totalHeight, wallThick, useHoneycomb, hexDia, hexWall);
    parts.push(translate([0, 0, totalDepth - wallThick], back));
  }

  return safeUnion(...parts);
}

/**
 * Create a cage structure positioned for the rack generator
 * Translates from rack coordinate system to cage position
 */
export function cageStructurePositioned(
  offsetX: number,
  offsetY: number,
  panelWidth: number,
  rackHeight: number,
  deviceWidth: number,
  deviceHeight: number,
  deviceDepth: number,
  clearance: number,
  heavyDevice: 0 | 1 | 2 = 0,
  useHoneycomb = true,
  backStyle: 'solid' | 'vent' | 'none' = 'vent',
  hexDia = 8,
  hexWall = 2,
  cutoutEdge = 5,
  cutoutRadius = 5,
  plateThickness = 4,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const wallThick = plateThickness + heavyDevice;
  const totalWidth = deviceWidth + 2 * wallThick + 2 * clearance;
  const totalHeight = deviceHeight + 2 * wallThick + 2 * clearance;

  // Calculate position: center on the device position
  const cx = panelWidth / 2 + offsetX - totalWidth / 2;
  const cy = rackHeight / 2 + offsetY - totalHeight / 2;

  const cage = cageStructure({
    offsetX: 0,
    offsetY: 0,
    deviceWidth,
    deviceHeight,
    deviceDepth,
    deviceClearance: clearance,
    heavyDevice,
    useHoneycomb,
    backOpen: backStyle === 'none',
    noBack: backStyle === 'none',
    hexDia,
    hexWall,
    cutoutEdge,
    cutoutRadius,
    plateThickness,
    segments,
  });

  // Position behind the faceplate (extending in +Z)
  return translate([cx, cy, plateThickness], cage);
}
