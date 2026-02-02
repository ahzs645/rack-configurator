// JSCAD Mount Passthrough - Thin frame for keystones and dongles
// Translated from OpenSCAD components/mount_passthrough.scad

import { primitives, booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { EPS } from './constants';

const { cuboid } = primitives;
const { subtract } = booleans;
const { translate } = transforms;

/**
 * Create a passthrough frame (thin frame with rectangular opening)
 */
export function passthroughFrame(
  deviceWidth: number,
  deviceHeight: number,
  frameDepth = 8,
  wall = 3,
  clearance = 1.0
): Geom3 {
  const innerW = deviceWidth + 2 * clearance;
  const innerH = deviceHeight + 2 * clearance;
  const outerW = innerW + 2 * wall;
  const outerH = innerH + 2 * wall;

  const outer = cuboid({
    size: [outerW, outerH, frameDepth],
    center: [outerW / 2, outerH / 2, frameDepth / 2],
  });

  const inner = translate(
    [wall, wall, -EPS],
    cuboid({
      size: [innerW, innerH, frameDepth + 2 * EPS],
      center: [innerW / 2, innerH / 2, (frameDepth + 2 * EPS) / 2],
    })
  );

  return subtract(outer, inner);
}

/**
 * Create a passthrough frame positioned for the rack generator
 */
export function passthroughFramePositioned(
  offsetX: number,
  offsetY: number,
  panelWidth: number,
  rackHeight: number,
  deviceWidth: number,
  deviceHeight: number,
  frameDepth = 8,
  wall = 3,
  clearance = 1.0,
  plateThickness = 4
): Geom3 {
  const outerW = deviceWidth + 2 * clearance + 2 * wall;
  const outerH = deviceHeight + 2 * clearance + 2 * wall;

  const cx = panelWidth / 2 + offsetX - outerW / 2;
  const cy = rackHeight / 2 + offsetY - outerH / 2;

  const frame = passthroughFrame(deviceWidth, deviceHeight, frameDepth, wall, clearance);
  return translate([cx, cy, plateThickness], frame);
}
