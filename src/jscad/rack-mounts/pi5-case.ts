// JSCAD Pi5 Case - Raspberry Pi 5 case mount
// Translated from OpenSCAD rack_mounts/pi5_case.scad

import { primitives, booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { EPS, DEFAULT_SEGMENTS, RADIUS_XY_SLACK } from '../constants';

const { cuboid, cylinder } = primitives;
const { union, subtract } = booleans;
const { translate } = transforms;

// Pi 5 dimensions
const PI5_BOARD_W = 85;
const PI5_BOARD_H = 56;
const PI5_BOARD_THICK = 1.6;
const PI5_WALL = 2;
const PI5_STANDOFF_H = 5;
const PI5_CASE_DEPTH = 35;
const PI5_HOLE_SPACING_X = 58;
const PI5_HOLE_SPACING_Y = 49;
const PI5_SCREW_DIA = 2.5;

const PI5_CASE_FACE_W = PI5_BOARD_W + 2 * (PI5_WALL + 1); // ~93mm
const PI5_CASE_FACE_H = PI5_BOARD_H + 2 * (PI5_WALL + 1); // ~64mm

/**
 * Create the Pi 5 case body
 */
function pi5CaseBody(segments = DEFAULT_SEGMENTS): Geom3 {
  const outerW = PI5_CASE_FACE_W;
  const outerH = PI5_CASE_FACE_H;
  const outerD = PI5_CASE_DEPTH;

  // Outer shell
  const outer = cuboid({
    size: [outerW, outerH, outerD],
    center: [outerW / 2, outerH / 2, outerD / 2],
  });

  // Inner cavity
  const innerW = PI5_BOARD_W + 2; // 1mm clearance each side
  const innerH = PI5_BOARD_H + 2;
  const innerD = outerD - PI5_WALL; // wall thickness on back

  const inner = translate(
    [(outerW - innerW) / 2, (outerH - innerH) / 2, -EPS],
    cuboid({
      size: [innerW, innerH, innerD + EPS],
      center: [innerW / 2, innerH / 2, (innerD + EPS) / 2],
    })
  );

  let body = subtract(outer, inner);

  // Standoffs for the Pi board
  const standoffRadius = 3;
  const holeRadius = PI5_SCREW_DIA / 2 + RADIUS_XY_SLACK;
  const cx = outerW / 2;
  const cy = outerH / 2;

  const standoffPositions: [number, number][] = [
    [cx - PI5_HOLE_SPACING_X / 2, cy - PI5_HOLE_SPACING_Y / 2],
    [cx + PI5_HOLE_SPACING_X / 2, cy - PI5_HOLE_SPACING_Y / 2],
    [cx - PI5_HOLE_SPACING_X / 2, cy + PI5_HOLE_SPACING_Y / 2],
    [cx + PI5_HOLE_SPACING_X / 2, cy + PI5_HOLE_SPACING_Y / 2],
  ];

  const standoffs: Geom3[] = [];
  const holes: Geom3[] = [];

  for (const [sx, sy] of standoffPositions) {
    // Standoff
    standoffs.push(translate(
      [sx, sy, PI5_WALL],
      cylinder({
        radius: standoffRadius,
        height: PI5_STANDOFF_H,
        segments,
        center: [0, 0, PI5_STANDOFF_H / 2],
      })
    ));

    // Screw hole through standoff
    holes.push(translate(
      [sx, sy, -EPS],
      cylinder({
        radius: holeRadius,
        height: PI5_WALL + PI5_STANDOFF_H + 2 * EPS,
        segments,
        center: [0, 0, (PI5_WALL + PI5_STANDOFF_H + 2 * EPS) / 2],
      })
    ));
  }

  body = union(body, ...standoffs);
  body = subtract(body, ...holes);

  // Port openings on the sides
  // USB/Ethernet side (right)
  const usbOpening = translate(
    [outerW - PI5_WALL - EPS, outerH * 0.2, PI5_WALL + PI5_STANDOFF_H + PI5_BOARD_THICK],
    cuboid({
      size: [PI5_WALL + 2 * EPS, outerH * 0.6, 18],
      center: [(PI5_WALL + 2 * EPS) / 2, outerH * 0.3, 9],
    })
  );
  body = subtract(body, usbOpening);

  // Power/HDMI side (opposite)
  const hdmiOpening = translate(
    [-EPS, outerH * 0.15, PI5_WALL + PI5_STANDOFF_H + PI5_BOARD_THICK],
    cuboid({
      size: [PI5_WALL + 2 * EPS, outerH * 0.7, 12],
      center: [(PI5_WALL + 2 * EPS) / 2, outerH * 0.35, 6],
    })
  );
  body = subtract(body, hdmiOpening);

  // Top ventilation
  const ventSlots: Geom3[] = [];
  const numSlots = 5;
  for (let i = 0; i < numSlots; i++) {
    const x = outerW * 0.2 + i * (outerW * 0.6 / (numSlots - 1)) - 2;
    ventSlots.push(translate(
      [x, outerH * 0.15, outerD - PI5_WALL - EPS],
      cuboid({
        size: [4, outerH * 0.7, PI5_WALL + 2 * EPS],
        center: [2, outerH * 0.35, (PI5_WALL + 2 * EPS) / 2],
      })
    ));
  }
  body = subtract(body, ...ventSlots);

  return body;
}

/**
 * Create Pi5 case mount positioned for rack generator
 */
export function pi5CaseMountPositioned(
  offsetX: number,
  offsetY: number,
  panelWidth: number,
  rackHeight: number,
  plateThickness = 4,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const cx = panelWidth / 2 + offsetX - PI5_CASE_FACE_W / 2;
  const cy = rackHeight / 2 + offsetY - PI5_CASE_FACE_H / 2;

  // Mounting flange (attached behind the faceplate)
  const flangeWidth = PI5_CASE_FACE_W + 10;
  const flangeHeight = PI5_CASE_FACE_H + 10;
  const flangeThick = 3;

  let flange = cuboid({
    size: [flangeWidth, flangeHeight, flangeThick],
    center: [flangeWidth / 2, flangeHeight / 2, flangeThick / 2],
  });

  // Cutout in flange matching case opening
  const flangeCutout = translate(
    [5, 5, -EPS],
    cuboid({
      size: [PI5_CASE_FACE_W, PI5_CASE_FACE_H, flangeThick + 2 * EPS],
      center: [PI5_CASE_FACE_W / 2, PI5_CASE_FACE_H / 2, (flangeThick + 2 * EPS) / 2],
    })
  );
  flange = subtract(flange, flangeCutout);

  // Case body
  const caseBody = translate(
    [5, 5, flangeThick],
    pi5CaseBody(segments)
  );

  const assembly = union(flange, caseBody);
  return translate([cx - 5, cy - 5, plateThickness], assembly);
}
