// JSCAD Dovetail - Parametric dovetail snap-fit connectors
// Translated from OpenSCAD components/dovetail.scad

import { primitives, booleans, transforms, extrusions } from '@jscad/modeling';
import type { Geom3, Geom2 } from '@jscad/modeling/src/geometries/types';
import { DOVETAIL_SLACK, EPS } from './constants';

const { polygon, cuboid } = primitives;
const { union, subtract } = booleans;
const { translate, rotate } = transforms;
const { extrudeLinear } = extrusions;

/**
 * Create a 2D dovetail face profile (trapezoid)
 */
function dovetailFace(
  topWidth: number,
  bottomWidth: number,
  height: number,
  baseExtension = 0
): Geom2 {
  const halfTop = topWidth / 2;
  const halfBottom = bottomWidth / 2;

  const points: [number, number][] = [];

  if (baseExtension > 0) {
    points.push([-halfBottom - baseExtension, 0]);
  }
  points.push([-halfBottom, 0]);
  points.push([-halfTop, height]);
  points.push([halfTop, height]);
  points.push([halfBottom, 0]);
  if (baseExtension > 0) {
    points.push([halfBottom + baseExtension, 0]);
  }

  return polygon({ points });
}

/**
 * Create a dovetail male connector
 */
export function dovetail(
  topWidth = 8,
  bottomWidth = 12,
  height = 6,
  length = 20,
  baseExtension = 0
): Geom3 {
  const profile = dovetailFace(topWidth, bottomWidth, height, baseExtension);
  return rotate(
    [Math.PI / 2, 0, 0],
    extrudeLinear({ height: length }, profile)
  );
}

/**
 * Create a dovetail socket (female, with slack for fit)
 */
export function dovetailSocket(
  topWidth = 8,
  bottomWidth = 12,
  height = 6,
  length = 20,
  slack = DOVETAIL_SLACK
): Geom3 {
  return dovetail(
    topWidth + 2 * slack,
    bottomWidth + 2 * slack,
    height + slack,
    length + 2 * slack,
    0
  );
}

/**
 * Create a dovetail rail (T-slot style channel)
 */
export function dovetailRail(
  length = 100,
  width = 20,
  height = 8,
  dovetailDepth = 4,
  dovetailTopWidth = 6,
  dovetailBottomWidth = 10
): Geom3 {
  const rail = cuboid({
    size: [width, length, height],
    center: [width / 2, length / 2, height / 2],
  });

  // Cut the dovetail channel along the length
  const channel = translate(
    [width / 2, 0, 0],
    rotate(
      [Math.PI / 2, 0, 0],
      extrudeLinear(
        { height: length + EPS },
        dovetailFace(
          dovetailTopWidth + 2 * DOVETAIL_SLACK,
          dovetailBottomWidth + 2 * DOVETAIL_SLACK,
          dovetailDepth + DOVETAIL_SLACK
        )
      )
    )
  );

  return subtract(rail, translate([0, -EPS / 2, 0], channel));
}

/**
 * Create a dovetail slider (block that fits in rail)
 */
export function dovetailSlider(
  length = 20,
  width = 20,
  height = 8,
  dovetailDepth = 4,
  dovetailTopWidth = 6,
  dovetailBottomWidth = 10
): Geom3 {
  const block = cuboid({
    size: [width, length, height - dovetailDepth],
    center: [width / 2, length / 2, (height - dovetailDepth) / 2 + dovetailDepth],
  });

  const tail = translate(
    [width / 2, 0, 0],
    rotate(
      [Math.PI / 2, 0, 0],
      extrudeLinear(
        { height: length },
        dovetailFace(dovetailTopWidth, dovetailBottomWidth, dovetailDepth)
      )
    )
  );

  return union(block, tail);
}
