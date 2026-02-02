// JSCAD Utilities - Basic shape generation helpers
// Translated from OpenSCAD components/utilities.scad

import { primitives, booleans, transforms, extrusions, hulls } from '@jscad/modeling';
import type { Geom3, Geom2 } from '@jscad/modeling/src/geometries/types';
import { EPS, DEFAULT_SEGMENTS } from './constants';

const { cuboid, cylinder, circle, rectangle } = primitives;
const { union, subtract } = booleans;
const { translate, rotate } = transforms;
const { extrudeLinear } = extrusions;

/**
 * Create a plate with 4 rounded corners
 */
export function fourRoundedCornerPlate(
  width: number,
  height: number,
  thickness: number,
  cornerRadius: number,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  if (cornerRadius <= 0) {
    return cuboid({ size: [width, height, thickness], center: [width / 2, height / 2, thickness / 2] });
  }

  const r = Math.min(cornerRadius, width / 2, height / 2);
  // Create 2D rounded rectangle by placing circles at corners and using hull
  const corners: Geom2[] = [
    circle({ radius: r, center: [r, r], segments }),
    circle({ radius: r, center: [width - r, r], segments }),
    circle({ radius: r, center: [width - r, height - r], segments }),
    circle({ radius: r, center: [r, height - r], segments }),
  ];

  const profile = hulls.hull(...corners);
  return extrudeLinear({ height: thickness }, profile);
}

/**
 * Create a plate with 2 rounded corners (left side only)
 */
export function twoRoundedCornerPlate(
  width: number,
  height: number,
  thickness: number,
  cornerRadius: number,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  if (cornerRadius <= 0) {
    return cuboid({ size: [width, height, thickness], center: [width / 2, height / 2, thickness / 2] });
  }

  const r = Math.min(cornerRadius, width / 2, height / 2);
  // Right side: rounded. Left side: square
  const shapes: Geom2[] = [
    rectangle({ size: [EPS, EPS], center: [EPS / 2, EPS / 2] }),
    rectangle({ size: [EPS, EPS], center: [EPS / 2, height - EPS / 2] }),
    circle({ radius: r, center: [width - r, r], segments }),
    circle({ radius: r, center: [width - r, height - r], segments }),
  ];

  const profile = hulls.hull(...shapes);
  return extrudeLinear({ height: thickness }, profile);
}

/**
 * Create a simple cylindrical hole (for subtraction)
 */
export function simpleHole(
  x: number,
  y: number,
  z: number,
  diameter: number,
  depth: number,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  return translate(
    [x, y, z],
    cylinder({ radius: diameter / 2, height: depth + EPS, segments, center: [0, 0, depth / 2] })
  );
}

/**
 * Create a faceplate screw hole slot (elongated M5 slot)
 */
export function faceplatesScrewHoleSlot(
  x: number,
  y: number,
  z: number,
  thickness: number,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const slotRadius = 2.75; // M5 slot radius
  const slotLength = 2.0; // elongation

  const c1 = circle({ radius: slotRadius, center: [0, -slotLength / 2], segments });
  const c2 = circle({ radius: slotRadius, center: [0, slotLength / 2], segments });
  const profile = hulls.hull(c1, c2);

  return translate(
    [x, y, z - EPS],
    extrudeLinear({ height: thickness + 2 * EPS }, profile)
  );
}

/**
 * Create an alignment pin hole
 */
export function alignmentPinHole(
  x: number,
  y: number,
  z: number,
  diameter = 1.75,
  depth = 6,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  return translate(
    [x, y, z],
    rotate(
      [0, Math.PI / 2, 0],
      cylinder({ radius: diameter / 2, height: depth, segments, center: [0, 0, depth / 2] })
    )
  );
}

/**
 * Create a cuboid at a position (not centered, positioned at corner)
 */
export function positionedCuboid(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number
): Geom3 {
  return translate(
    [x, y, z],
    cuboid({ size: [width, height, depth], center: [width / 2, height / 2, depth / 2] })
  );
}

/**
 * Create a centered cuboid (like OpenSCAD cube(center=true))
 */
export function centeredCuboid(
  width: number,
  height: number,
  depth: number
): Geom3 {
  return cuboid({ size: [width, height, depth] });
}

/**
 * Mirror a geometry on the X axis
 */
export function mirrorX(geom: Geom3): Geom3 {
  return transforms.mirror({ normal: [1, 0, 0] }, geom);
}

/**
 * Mirror a geometry on the Y axis
 */
export function mirrorY(geom: Geom3): Geom3 {
  return transforms.mirror({ normal: [0, 1, 0] }, geom);
}

/**
 * Mirror a geometry on the Z axis
 */
export function mirrorZ(geom: Geom3): Geom3 {
  return transforms.mirror({ normal: [0, 0, 1] }, geom);
}

/**
 * Convenience: create a union of multiple geometries, filtering out nulls
 */
export function safeUnion(...geoms: (Geom3 | null | undefined)[]): Geom3 {
  const valid = geoms.filter((g): g is Geom3 => g != null);
  if (valid.length === 0) {
    return cuboid({ size: [0, 0, 0] }); // empty placeholder
  }
  if (valid.length === 1) return valid[0];
  return union(...valid);
}

/**
 * Convenience: subtract multiple geometries from a base
 */
export function safeSubtract(base: Geom3, ...cuts: (Geom3 | null | undefined)[]): Geom3 {
  const valid = cuts.filter((g): g is Geom3 => g != null);
  if (valid.length === 0) return base;
  return subtract(base, ...valid);
}
