// JSCAD Patch Panel - Keystone jack panel
// Translated from OpenSCAD rack_mounts/patch_panel.scad

import { primitives, booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { KEYSTONE_WIDTH, KEYSTONE_HEIGHT, KEYSTONE_SPACING, EPS, DEFAULT_SEGMENTS } from '../constants';

const { cuboid } = primitives;
const { subtract } = booleans;
const { translate } = transforms;

/**
 * Create a keystone jack cutout (for subtraction)
 */
function keystoneCutout(thickness: number): Geom3 {
  // Main opening

  return primitives.cuboid({
    size: [KEYSTONE_WIDTH + 1, KEYSTONE_HEIGHT + 1, thickness + 2 * EPS],
    center: [0, 0, thickness / 2],
  });
}

/**
 * Create a patch panel with keystone slots
 */
export function patchPanel(
  portCount = 6,
  plateThickness = 3,
  panelHeight = 30,
  _segments = DEFAULT_SEGMENTS
): Geom3 {
  const panelWidth = portCount * KEYSTONE_SPACING + 10; // 5mm margin each side

  // Base plate
  let plate = cuboid({
    size: [panelWidth, panelHeight, plateThickness],
    center: [panelWidth / 2, panelHeight / 2, plateThickness / 2],
  });

  // Keystone cutouts
  for (let i = 0; i < portCount; i++) {
    const x = 5 + KEYSTONE_SPACING / 2 + i * KEYSTONE_SPACING;
    const y = panelHeight / 2;

    const cutout = translate(
      [x, y, -EPS],
      keystoneCutout(plateThickness)
    );
    plate = subtract(plate, cutout);
  }

  return plate;
}

/**
 * Create a patch panel positioned for the rack generator
 */
export function patchPanelPositioned(
  offsetX: number,
  offsetY: number,
  panelWidth: number,
  rackHeight: number,
  portCount = 6,
  plateThickness = 4,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const ppWidth = portCount * KEYSTONE_SPACING + 10;
  const ppHeight = 30;

  const cx = panelWidth / 2 + offsetX - ppWidth / 2;
  const cy = rackHeight / 2 + offsetY - ppHeight / 2;

  const panel = patchPanel(portCount, 3, ppHeight, segments);
  return translate([cx, cy, plateThickness], panel);
}
