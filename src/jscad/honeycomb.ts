// JSCAD Honeycomb - Hexagonal ventilation patterns
// Translated from OpenSCAD components/honeycomb.scad

import { primitives, booleans, transforms, extrusions } from '@jscad/modeling';
import type { Geom3, Geom2 } from '@jscad/modeling/src/geometries/types';

const { polygon } = primitives;
const { union, subtract, intersect } = booleans;
const { translate } = transforms;
const { extrudeLinear } = extrusions;

/**
 * Create a single hexagon (2D)
 */
export function hexagon2D(diameter: number, segments = 6): Geom2 {
  const r = diameter / 2;
  const points: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6; // 30 deg offset for flat-top
    points.push([r * Math.cos(angle), r * Math.sin(angle)]);
  }
  return polygon({ points });
}

/**
 * Generate honeycomb hole pattern (3D) for subtraction from a panel
 * Creates staggered hexagonal holes filling a rectangular area
 */
export function honeycombCutout(
  width: number,
  height: number,
  thickness: number,
  hexDia: number,
  hexWall: number,
  hexOffset: [number, number] = [0, 0]
): Geom3 {
  const smallDia = hexDia * Math.cos(Math.PI / 6); // cos(30°)
  const projWall = hexWall * Math.cos(Math.PI / 6);

  const yStep = smallDia + hexWall;
  const xStep = hexDia * 1.5 + projWall * 2;

  const hexes: Geom3[] = [];

  const cols = Math.ceil(width / xStep) + 2;
  const rows = Math.ceil(height / yStep) + 2;

  const startX = -xStep + hexOffset[0];
  const startY = -yStep + hexOffset[1];

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const x = startX + col * xStep;
      const yOffset = (col % 2 === 0) ? 0 : yStep / 2;
      const y = startY + row * yStep + yOffset;

      // Only include if within bounds (with some margin)
      if (x > -hexDia && x < width + hexDia && y > -hexDia && y < height + hexDia) {
        const hex2d = hexagon2D(hexDia);
        const hex3d = extrudeLinear({ height: thickness + 0.2 }, hex2d);
        hexes.push(translate([x, y, -0.1], hex3d));
      }
    }
  }

  if (hexes.length === 0) {
    return primitives.cuboid({ size: [0, 0, 0] });
  }

  // Create bounding box for intersection
  const bounds = primitives.cuboid({
    size: [width, height, thickness + 0.4],
    center: [width / 2, height / 2, thickness / 2],
  });

  return intersect(bounds, union(...hexes));
}

/**
 * Create a honeycomb panel (3D solid with honeycomb holes)
 */
export function honeycombPanel(
  width: number,
  height: number,
  thickness: number,
  border: number,
  hexDia: number,
  hexWall: number,
  hexOffset: [number, number] = [0, 0]
): Geom3 {
  const plate = primitives.cuboid({
    size: [width, height, thickness],
    center: [width / 2, height / 2, thickness / 2],
  });

  if (width <= 2 * border || height <= 2 * border) {
    return plate; // Too small for honeycomb
  }

  const cutout = honeycombCutout(
    width - 2 * border,
    height - 2 * border,
    thickness,
    hexDia,
    hexWall,
    hexOffset
  );

  return subtract(plate, translate([border, border, 0], cutout));
}

/**
 * Create a centered honeycomb panel
 */
export function honeycombPanelCentered(
  width: number,
  height: number,
  thickness: number,
  border: number,
  hexDia: number,
  hexWall: number,
  hexOffset: [number, number] = [0, 0]
): Geom3 {
  const panel = honeycombPanel(width, height, thickness, border, hexDia, hexWall, hexOffset);
  return translate([-width / 2, -height / 2, 0], panel);
}

/**
 * Create rectangular vent slots (alternative to honeycomb)
 */
export function rectVentSlots(
  width: number,
  height: number,
  thickness: number,
  slotWidth = 6,
  slotSpacing = 10,
  border = 5
): Geom3 {
  const slots: Geom3[] = [];

  const usableWidth = width - 2 * border;
  const usableHeight = height - 2 * border;

  if (usableWidth <= 0 || usableHeight <= 0) {
    return primitives.cuboid({ size: [0, 0, 0] });
  }

  const numSlots = Math.floor(usableHeight / (slotWidth + slotSpacing));

  for (let i = 0; i < numSlots; i++) {
    const y = border + i * (slotWidth + slotSpacing) + slotSpacing / 2;
    slots.push(
      translate(
        [border, y, -0.1],
        primitives.cuboid({
          size: [usableWidth, slotWidth, thickness + 0.2],
          center: [usableWidth / 2, slotWidth / 2, (thickness + 0.2) / 2],
        })
      )
    );
  }

  return slots.length > 0 ? union(...slots) : primitives.cuboid({ size: [0, 0, 0] });
}
