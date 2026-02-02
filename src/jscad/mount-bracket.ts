// JSCAD Mount Bracket - L-bracket cage and simple box enclosure
// Translated from OpenSCAD components/mount_bracket.scad

import { primitives, booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { EPS } from './constants';
import { rectVentSlots } from './honeycomb';
import { safeUnion } from './utilities';

const { cuboid } = primitives;
const { union, subtract } = booleans;
const { translate } = transforms;

/**
 * Create an angle bracket cage (two L-brackets with ventilation slots)
 */
export function angleBracketCage(
  deviceWidth: number,
  deviceHeight: number,
  deviceDepth: number,
  wall = 3,
  maxDepth = 140,
  ventSlotWidth = 10,
  ventSlotSpacing = 20
): Geom3 {
  const depth = Math.min(deviceDepth + wall, maxDepth);
  const totalWidth = deviceWidth + 2 * wall;
  const totalHeight = deviceHeight + 2 * wall;

  const parts: Geom3[] = [];

  // Left L-bracket: bottom plate + side wall
  const leftBottom = cuboid({
    size: [wall + 15, depth, wall],
    center: [(wall + 15) / 2, depth / 2, wall / 2],
  });
  const leftSide = cuboid({
    size: [wall, depth, totalHeight],
    center: [wall / 2, depth / 2, totalHeight / 2],
  });

  let leftBracket = union(leftBottom, leftSide);

  // Add ventilation to left side
  const ventHeight = totalHeight - 10;
  const ventDepth = depth - 10;
  if (ventHeight > 10 && ventDepth > 10) {
    const vents = translate(
      [-EPS, 5, 5],
      rectVentSlots(wall + 2 * EPS, ventDepth, ventHeight, ventSlotWidth, ventSlotSpacing)
    );
    leftBracket = subtract(leftBracket, vents);
  }

  parts.push(leftBracket);

  // Right L-bracket (mirrored)
  const rightBottom = translate(
    [totalWidth - wall - 15, 0, 0],
    cuboid({
      size: [wall + 15, depth, wall],
      center: [(wall + 15) / 2, depth / 2, wall / 2],
    })
  );
  const rightSide = translate(
    [totalWidth - wall, 0, 0],
    cuboid({
      size: [wall, depth, totalHeight],
      center: [wall / 2, depth / 2, totalHeight / 2],
    })
  );

  let rightBracket = union(rightBottom, rightSide);
  if (ventHeight > 10 && ventDepth > 10) {
    const vents = translate(
      [totalWidth - wall - EPS, 5, 5],
      rectVentSlots(wall + 2 * EPS, ventDepth, ventHeight, ventSlotWidth, ventSlotSpacing)
    );
    rightBracket = subtract(rightBracket, vents);
  }

  parts.push(rightBracket);

  return safeUnion(...parts);
}

/**
 * Create a simple box cage (closed rectangular box)
 */
export function simpleBoxCage(
  deviceWidth: number,
  deviceHeight: number,
  deviceDepth: number,
  wall = 3,
  maxDepth = 140
): Geom3 {
  const depth = Math.min(deviceDepth + wall, maxDepth);
  const totalWidth = deviceWidth + 2 * wall;
  const totalHeight = deviceHeight + 2 * wall;

  const outer = cuboid({
    size: [totalWidth, totalHeight, depth],
    center: [totalWidth / 2, totalHeight / 2, depth / 2],
  });

  const inner = translate(
    [wall, wall, -EPS],
    cuboid({
      size: [deviceWidth, deviceHeight, depth - wall + EPS],
      center: [deviceWidth / 2, deviceHeight / 2, (depth - wall + EPS) / 2],
    })
  );

  return subtract(outer, inner);
}

/**
 * Create angle bracket positioned for rack generator
 */
export function angleBracketCagePositioned(
  offsetX: number,
  offsetY: number,
  panelWidth: number,
  rackHeight: number,
  deviceWidth: number,
  deviceHeight: number,
  deviceDepth: number,
  wall = 3,
  plateThickness = 4
): Geom3 {
  const totalWidth = deviceWidth + 2 * wall;
  const totalHeight = deviceHeight + 2 * wall;

  const cx = panelWidth / 2 + offsetX - totalWidth / 2;
  const cy = rackHeight / 2 + offsetY - totalHeight / 2;

  const bracket = angleBracketCage(deviceWidth, deviceHeight, deviceDepth, wall);
  return translate([cx, cy, plateThickness], bracket);
}

/**
 * Create simple box positioned for rack generator
 */
export function simpleBoxCagePositioned(
  offsetX: number,
  offsetY: number,
  panelWidth: number,
  rackHeight: number,
  deviceWidth: number,
  deviceHeight: number,
  deviceDepth: number,
  wall = 3,
  plateThickness = 4
): Geom3 {
  const totalWidth = deviceWidth + 2 * wall;
  const totalHeight = deviceHeight + 2 * wall;

  const cx = panelWidth / 2 + offsetX - totalWidth / 2;
  const cy = rackHeight / 2 + offsetY - totalHeight / 2;

  const box = simpleBoxCage(deviceWidth, deviceHeight, deviceDepth, wall);
  return translate([cx, cy, plateThickness], box);
}
