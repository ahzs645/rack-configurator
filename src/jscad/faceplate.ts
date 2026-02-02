// JSCAD Faceplate - EIA-310 standard faceplate generation
// Translated from OpenSCAD components/faceplate.scad

import { primitives, booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import {
  EIA_UNIT_HEIGHT, EIA_SCREW_SPACING, EPS,
  DEFAULT_SEGMENTS, faceplateHeight,
} from './constants';
import { fourRoundedCornerPlate, faceplatesScrewHoleSlot } from './utilities';

const { cuboid } = primitives;
const { union, subtract } = booleans;
const { translate } = transforms;

/**
 * Create the faceplate screw holes (EIA-310 standard slotted holes)
 * These are the standard rack mounting holes along both sides
 */
function faceplatesScrewHoles(
  panelWidth: number,
  rackU: number,
  thickness: number
): Geom3[] {
  const holes: Geom3[] = [];
  const earWidth = (482.6 - panelWidth) / 2; // Standard 19" ear width

  for (let u = 0; u < rackU; u++) {
    const yBase = u * EIA_UNIT_HEIGHT;
    for (const spacing of EIA_SCREW_SPACING) {
      const y = yBase + spacing;
      // Left side holes
      holes.push(faceplatesScrewHoleSlot(-earWidth / 2, y, 0, thickness));
      // Right side holes
      holes.push(faceplatesScrewHoleSlot(panelWidth + earWidth / 2, y, 0, thickness));
    }
  }

  return holes;
}

/**
 * Create a blank faceplate with standard EIA-310 mounting holes
 */
export function createBlankFaceplate(
  panelWidth: number,
  rackU: number,
  earStyle: 'none' | 'toolless' | 'fusion' | 'simple' = 'none',
  heavyDevice: 0 | 1 | 2 = 0,
  cornerRadius = 0,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const height = faceplateHeight(rackU);
  const thickness = 4 + heavyDevice;

  // Main panel body
  let plate: Geom3;
  if (cornerRadius > 0) {
    plate = fourRoundedCornerPlate(panelWidth, height, thickness, cornerRadius, segments);
  } else {
    plate = cuboid({
      size: [panelWidth, height, thickness],
      center: [panelWidth / 2, height / 2, thickness / 2],
    });
  }

  // Ear extensions (if not toolless - toolless ears are handled separately)
  if (earStyle === 'simple' || earStyle === 'fusion') {
    const earWidth = (482.6 - panelWidth) / 2;
    if (earWidth > 0) {
      // Left ear
      const leftEar = cuboid({
        size: [earWidth, height, thickness],
        center: [-earWidth / 2, height / 2, thickness / 2],
      });
      // Right ear
      const rightEar = cuboid({
        size: [earWidth, height, thickness],
        center: [panelWidth + earWidth / 2, height / 2, thickness / 2],
      });

      plate = union(plate, leftEar, rightEar);

      // Add screw holes
      const holes = faceplatesScrewHoles(panelWidth, rackU, thickness);
      if (holes.length > 0) {
        plate = subtract(plate, ...holes);
      }
    }
  }

  return plate;
}

/**
 * Create a faceplate with a device cutout
 */
export function createFaceplateWithCutout(
  panelWidth: number,
  rackU: number,
  cutoutX: number,
  cutoutY: number,
  cutoutWidth: number,
  cutoutHeight: number,
  thickness: number,
  cornerRadius = 0,
  _cutoutEdge = 5,
  cutoutRadius = 5,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const height = faceplateHeight(rackU);

  // Main faceplate
  let plate: Geom3;
  if (cornerRadius > 0) {
    plate = fourRoundedCornerPlate(panelWidth, height, thickness, cornerRadius, segments);
  } else {
    plate = cuboid({
      size: [panelWidth, height, thickness],
      center: [panelWidth / 2, height / 2, thickness / 2],
    });
  }

  // Device cutout (centered on the faceplate coordinates)
  const cx = panelWidth / 2 + cutoutX;
  const cy = height / 2 + cutoutY;

  let cutout: Geom3;
  if (cutoutRadius > 0) {
    cutout = translate(
      [cx - cutoutWidth / 2, cy - cutoutHeight / 2, -EPS],
      fourRoundedCornerPlate(cutoutWidth, cutoutHeight, thickness + 2 * EPS, cutoutRadius, segments)
    );
  } else {
    cutout = translate(
      [cx - cutoutWidth / 2, cy - cutoutHeight / 2, -EPS],
      cuboid({
        size: [cutoutWidth, cutoutHeight, thickness + 2 * EPS],
        center: [cutoutWidth / 2, cutoutHeight / 2, (thickness + 2 * EPS) / 2],
      })
    );
  }

  return subtract(plate, cutout);
}
