// JSCAD Mount Tray - Open tray mounts and USB dongle holders
// Translated from OpenSCAD components/mount_tray.scad

import { primitives, booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { EPS } from './constants';
import { safeUnion } from './utilities';

const { cuboid } = primitives;
const { union, subtract } = booleans;
const { translate } = transforms;

/**
 * Create a tray mount with optional lips for retention
 */
export function trayMount(
  deviceWidth: number,
  deviceHeight: number,
  deviceDepth: number,
  wall = 3,
  lipHeight = 0,
  lipStyle: 'full' | 'sides' | 'back' = 'sides'
): Geom3 {
  const totalWidth = deviceWidth + 2 * wall;
  const totalDepth = deviceDepth + wall;

  // Base tray
  const base = cuboid({
    size: [totalWidth, totalDepth, wall],
    center: [totalWidth / 2, totalDepth / 2, wall / 2],
  });

  const parts: Geom3[] = [base];

  // Side walls
  const leftWall = cuboid({
    size: [wall, totalDepth, deviceHeight + wall],
    center: [wall / 2, totalDepth / 2, (deviceHeight + wall) / 2],
  });
  parts.push(leftWall);

  const rightWall = translate(
    [totalWidth - wall, 0, 0],
    cuboid({
      size: [wall, totalDepth, deviceHeight + wall],
      center: [wall / 2, totalDepth / 2, (deviceHeight + wall) / 2],
    })
  );
  parts.push(rightWall);

  // Lips for retention
  const effectiveLip = lipHeight > 0 ? lipHeight : 3;

  if (lipStyle === 'full' || lipStyle === 'sides') {
    // Left lip (overhang at top of left wall)
    const leftLip = translate(
      [wall, 0, deviceHeight + wall - effectiveLip],
      cuboid({
        size: [2, totalDepth, effectiveLip],
        center: [1, totalDepth / 2, effectiveLip / 2],
      })
    );
    parts.push(leftLip);

    // Right lip
    const rightLip = translate(
      [totalWidth - wall - 2, 0, deviceHeight + wall - effectiveLip],
      cuboid({
        size: [2, totalDepth, effectiveLip],
        center: [1, totalDepth / 2, effectiveLip / 2],
      })
    );
    parts.push(rightLip);
  }

  if (lipStyle === 'full' || lipStyle === 'back') {
    // Back lip
    const backLip = translate(
      [wall, totalDepth - wall, deviceHeight + wall - effectiveLip],
      cuboid({
        size: [deviceWidth, wall, effectiveLip],
        center: [deviceWidth / 2, wall / 2, effectiveLip / 2],
      })
    );
    parts.push(backLip);
  }

  return safeUnion(...parts);
}

/**
 * Create a USB dongle holder channel
 */
export function usbDongleHolder(
  deviceWidth: number,
  deviceHeight: number,
  deviceDepth: number,
  wall = 2,
  clipHeight = 3,
  clipInset = 1.5
): Geom3 {
  const totalWidth = deviceWidth + 2 * wall;
  const totalHeight = deviceHeight + 2 * wall;

  // Outer block
  const outer = cuboid({
    size: [totalWidth, deviceDepth, totalHeight],
    center: [totalWidth / 2, deviceDepth / 2, totalHeight / 2],
  });

  // Inner channel (through-cut)
  const channel = translate(
    [wall, -EPS, wall],
    cuboid({
      size: [deviceWidth, deviceDepth + 2 * EPS, deviceHeight],
      center: [deviceWidth / 2, (deviceDepth + 2 * EPS) / 2, deviceHeight / 2],
    })
  );

  let holder = subtract(outer, channel);

  // Retention clips (small inward protrusions)
  const clipLeft = translate(
    [wall - clipInset, deviceDepth * 0.3, wall + deviceHeight - clipHeight],
    cuboid({
      size: [clipInset, deviceDepth * 0.4, clipHeight],
      center: [clipInset / 2, deviceDepth * 0.2, clipHeight / 2],
    })
  );
  const clipRight = translate(
    [totalWidth - wall, deviceDepth * 0.3, wall + deviceHeight - clipHeight],
    cuboid({
      size: [clipInset, deviceDepth * 0.4, clipHeight],
      center: [clipInset / 2, deviceDepth * 0.2, clipHeight / 2],
    })
  );

  holder = union(holder, clipLeft, clipRight);
  return holder;
}

/**
 * Create a storage tray with walls and optional dividers
 */
export function storageTray(
  width: number,
  depth: number,
  wallHeight = 30,
  wallThickness = 2,
  baseThickness = 3,
  dividers = 0
): Geom3 {
  const totalWidth = width + 2 * wallThickness;
  const totalDepth = depth + wallThickness; // open front

  // Outer box
  const outer = cuboid({
    size: [totalWidth, totalDepth, wallHeight + baseThickness],
    center: [totalWidth / 2, totalDepth / 2, (wallHeight + baseThickness) / 2],
  });

  // Inner cavity
  const inner = translate(
    [wallThickness, -EPS, baseThickness],
    cuboid({
      size: [width, depth + EPS, wallHeight + EPS],
      center: [width / 2, (depth + EPS) / 2, (wallHeight + EPS) / 2],
    })
  );

  let tray = subtract(outer, inner);

  // Dividers
  if (dividers > 0) {
    const divSpacing = width / (dividers + 1);
    for (let i = 1; i <= dividers; i++) {
      const divider = translate(
        [wallThickness + i * divSpacing - wallThickness / 2, 0, baseThickness],
        cuboid({
          size: [wallThickness, totalDepth, wallHeight],
          center: [wallThickness / 2, totalDepth / 2, wallHeight / 2],
        })
      );
      tray = union(tray, divider);
    }
  }

  return tray;
}

/**
 * Position tray mount for rack generator
 */
export function trayMountPositioned(
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

  const tray = trayMount(deviceWidth, deviceHeight, deviceDepth, wall);
  // Rotate so tray extends backward from faceplate
  return translate([cx, cy, plateThickness], tray);
}

/**
 * Position storage tray for rack generator
 */
export function storageTrayPositioned(
  offsetX: number,
  offsetY: number,
  panelWidth: number,
  rackHeight: number,
  deviceWidth: number,
  deviceHeight: number,
  deviceDepth: number,
  plateThickness = 4
): Geom3 {
  const totalWidth = deviceWidth + 4;
  const totalHeight = deviceHeight + 4;

  const cx = panelWidth / 2 + offsetX - totalWidth / 2;
  const cy = rackHeight / 2 + offsetY - totalHeight / 2;

  const tray = storageTray(deviceWidth, deviceDepth);
  return translate([cx, cy, plateThickness], tray);
}
