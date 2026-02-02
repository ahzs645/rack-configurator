// JSCAD Enclosed Box - Side rail + front plate system
// Translated from OpenSCAD rack_mounts/enclosed_box.scad

import { primitives, booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { EPS, DEFAULT_SEGMENTS, OVERHANG_SLACK } from '../constants';
import { safeUnion } from '../utilities';
import { rectVentSlots } from '../honeycomb';

const { cuboid } = primitives;
const { union, subtract } = booleans;
const { translate, mirror } = transforms;

/**
 * Create a side support rail for an enclosed box
 */
function sideSupportRail(
  _supportedWidth: number,
  supportedHeight: number,
  supportedDepth: number,
  defaultThickness = 2,
  railSideThickness = 4,
  sideVent = true,
  _isLeft = true,
  _segments = DEFAULT_SEGMENTS
): Geom3 {
  const railLength = supportedDepth + defaultThickness;
  const railHeight = supportedHeight + defaultThickness + OVERHANG_SLACK;
  const parts: Geom3[] = [];

  // Bottom plate
  parts.push(cuboid({
    size: [railSideThickness + 10, railLength, defaultThickness],
    center: [(railSideThickness + 10) / 2, railLength / 2, defaultThickness / 2],
  }));

  // Side wall
  parts.push(cuboid({
    size: [railSideThickness, railLength, railHeight],
    center: [railSideThickness / 2, railLength / 2, railHeight / 2],
  }));

  // Top overhang (retention lip)
  parts.push(translate(
    [0, 0, railHeight - defaultThickness],
    cuboid({
      size: [railSideThickness + 5, railLength, defaultThickness],
      center: [(railSideThickness + 5) / 2, railLength / 2, defaultThickness / 2],
    })
  ));

  let rail = safeUnion(...parts);

  // Ventilation slots
  if (sideVent) {
    const ventH = railHeight - 10;
    const ventD = railLength - 20;
    if (ventH > 10 && ventD > 10) {
      const vents = translate(
        [-EPS, 10, 5],
        rectVentSlots(railSideThickness + 2 * EPS, ventD, ventH)
      );
      rail = subtract(rail, vents);
    }
  }

  return rail;
}

/**
 * Create a front box holder plate
 */
function frontBoxHolder(
  supportedWidth: number,
  supportedHeight: number,
  plateThickness = 3,
  supportDepth = 5,
  _segments = DEFAULT_SEGMENTS
): Geom3 {
  const width = supportedWidth + 20; // margin for mounting
  const height = supportedHeight + 10;

  // Base plate
  let plate = cuboid({
    size: [width, height, plateThickness],
    center: [width / 2, height / 2, plateThickness / 2],
  });

  // Device cutout (centered)
  const cutout = translate(
    [(width - supportedWidth) / 2, (height - supportedHeight) / 2, -EPS],
    cuboid({
      size: [supportedWidth, supportedHeight, plateThickness + 2 * EPS],
      center: [supportedWidth / 2, supportedHeight / 2, (plateThickness + 2 * EPS) / 2],
    })
  );
  plate = subtract(plate, cutout);

  // Support ledges on bottom and sides
  const ledgeThick = 2;
  // Bottom ledge
  const bottomLedge = translate(
    [(width - supportedWidth) / 2, (height - supportedHeight) / 2 - ledgeThick, plateThickness],
    cuboid({
      size: [supportedWidth, ledgeThick, supportDepth],
      center: [supportedWidth / 2, ledgeThick / 2, supportDepth / 2],
    })
  );
  plate = union(plate, bottomLedge);

  return plate;
}

export interface EnclosedBoxOptions {
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
  railThickness?: number;
  railSideThickness?: number;
  frontPlateThickness?: number;
  sideVent?: boolean;
  segments?: number;
}

/**
 * Create a complete enclosed box system (2 rails + front plate)
 */
export function enclosedBoxSystem(opts: EnclosedBoxOptions): Geom3 {
  const {
    boxWidth,
    boxHeight,
    boxDepth,
    railThickness = 2,
    railSideThickness = 3,
    frontPlateThickness = 3,
    sideVent = true,
    segments = DEFAULT_SEGMENTS,
  } = opts;

  const parts: Geom3[] = [];

  // Left rail
  const leftRail = sideSupportRail(
    boxWidth, boxHeight, boxDepth,
    railThickness, railSideThickness, sideVent, true, segments
  );
  parts.push(leftRail);

  // Right rail (mirrored to the right side)
  const rightRail = translate(
    [boxWidth + 2 * railSideThickness, 0, 0],
    mirror({ normal: [1, 0, 0] },
      sideSupportRail(
        boxWidth, boxHeight, boxDepth,
        railThickness, railSideThickness, sideVent, false, segments
      )
    )
  );
  parts.push(rightRail);

  // Front holder plate
  const frontPlate = translate(
    [railSideThickness, 0, 0],
    frontBoxHolder(boxWidth, boxHeight, frontPlateThickness, 5, segments)
  );
  parts.push(frontPlate);

  return safeUnion(...parts);
}

/**
 * Create enclosed box positioned for rack generator
 */
export function enclosedBoxPositioned(
  offsetX: number,
  offsetY: number,
  panelWidth: number,
  rackHeight: number,
  deviceWidth: number,
  deviceHeight: number,
  deviceDepth: number,
  plateThickness = 4,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const totalWidth = deviceWidth + 10; // margin
  const totalHeight = deviceHeight + 10;

  const cx = panelWidth / 2 + offsetX - totalWidth / 2;
  const cy = rackHeight / 2 + offsetY - totalHeight / 2;

  const box = enclosedBoxSystem({
    boxWidth: deviceWidth,
    boxHeight: deviceHeight,
    boxDepth: deviceDepth,
    segments,
  });

  return translate([cx, cy, plateThickness], box);
}
