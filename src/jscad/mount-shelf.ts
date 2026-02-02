// JSCAD Mount Shelf - Enhanced shelf with honeycomb, standoffs, pull handle
// Translated from OpenSCAD components/mount_shelf.scad

import { primitives, booleans, transforms, extrusions } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import { EPS, DEFAULT_SEGMENTS } from './constants';
import { honeycombCutout, rectVentSlots } from './honeycomb';
import { safeUnion, safeSubtract } from './utilities';

const { cuboid, cylinder, polygon } = primitives;
const { subtract } = booleans;
const { translate, rotate } = transforms;
const { extrudeLinear } = extrusions;

export interface StandoffDef {
  x: number;
  y: number;
  height: number;
  outerDia: number;
  holeDia: number;
}

export interface PCBPresetDef {
  enabled: boolean;
  pcbWidth: number;
  pcbLength: number;
  offsetX: number;
  offsetY: number;
  height: number;
  outerDia: number;
  holeDia: number;
}

export interface EnhancedShelfOptions {
  width: number;
  depth: number;
  height: number;
  thickness?: number;
  solidBottom?: boolean;
  useHoneycomb?: boolean;
  hexDia?: number;
  hexWall?: number;
  notch?: 'none' | 'left' | 'right' | 'center';
  notchWidth?: number;
  screwHoles?: number;
  cableHolesLeft?: number;
  cableHolesRight?: number;
  standoffs?: StandoffDef[];
  standoffCountersink?: boolean;
  standoffReinforced?: boolean;
  pullHandle?: boolean;
  pcbPreset?: PCBPresetDef;
  segments?: number;
}

/**
 * Create a single standoff boss
 */
function renderStandoff(
  x: number,
  y: number,
  height: number,
  outerDia: number,
  holeDia: number,
  countersink = false,
  reinforced = false,
  segments = DEFAULT_SEGMENTS
): Geom3 {
  const parts: Geom3[] = [];

  // Main standoff cylinder
  parts.push(
    translate(
      [x, y, 0],
      cylinder({ radius: outerDia / 2, height, segments, center: [0, 0, height / 2] })
    )
  );

  // Reinforced base (cone)
  if (reinforced) {
    const baseRadius = outerDia / 2 + 2;
    const coneHeight = 2;
    parts.push(
      translate(
        [x, y, 0],
        cylinder({
          radius: baseRadius,
          height: coneHeight,
          segments,
          center: [0, 0, coneHeight / 2],
        })
      )
    );
  }

  let standoff = safeUnion(...parts);

  // Screw hole
  const holeDepth = height + EPS;
  const hole = translate(
    [x, y, -EPS / 2],
    cylinder({ radius: holeDia / 2, height: holeDepth, segments, center: [0, 0, holeDepth / 2] })
  );
  standoff = subtract(standoff, hole);

  // Countersink
  if (countersink) {
    const csinkRadius = holeDia;
    const csinkDepth = 2;
    const csink = translate(
      [x, y, height - csinkDepth],
      cylinder({ radius: csinkRadius, height: csinkDepth + EPS, segments, center: [0, 0, (csinkDepth + EPS) / 2] })
    );
    standoff = subtract(standoff, csink);
  }

  return standoff;
}

/**
 * Get positions for shelf screw holes
 */
function getShelfScrewPositions(
  count: number,
  width: number,
  depth: number
): [number, number][] {
  if (count <= 0) return [];

  const positions: [number, number][] = [];
  const margin = 10;

  if (count === 1) {
    positions.push([width / 2, depth / 2]);
  } else if (count === 2) {
    positions.push([margin, depth / 2]);
    positions.push([width - margin, depth / 2]);
  } else if (count === 3) {
    positions.push([margin, margin]);
    positions.push([width - margin, margin]);
    positions.push([width / 2, depth - margin]);
  } else if (count === 4) {
    positions.push([margin, margin]);
    positions.push([width - margin, margin]);
    positions.push([margin, depth - margin]);
    positions.push([width - margin, depth - margin]);
  } else {
    // 5 holes: 4 corners + center
    positions.push([margin, margin]);
    positions.push([width - margin, margin]);
    positions.push([margin, depth - margin]);
    positions.push([width - margin, depth - margin]);
    positions.push([width / 2, depth / 2]);
  }

  return positions;
}

/**
 * Create a pull handle at the front of the shelf
 */
function pullHandle(
  width: number,
  _thickness: number,
  _segments = DEFAULT_SEGMENTS
): Geom3 {
  const handleWidth = Math.min(width * 0.6, 80);
  const handleHeight = 15;
  const handleDepth = 8;
  const handleThick = 3;

  // Create a C-shaped handle
  const outer = cuboid({
    size: [handleWidth, handleDepth, handleHeight],
    center: [0, -handleDepth / 2, handleHeight / 2],
  });

  const inner = cuboid({
    size: [handleWidth - 2 * handleThick, handleDepth - handleThick, handleHeight - handleThick],
    center: [0, -(handleDepth - handleThick) / 2, (handleHeight - handleThick) / 2 + handleThick],
  });

  return subtract(outer, inner);
}

/**
 * Create an enhanced shelf with all features
 */
export function enhancedShelf(opts: EnhancedShelfOptions): Geom3 {
  const {
    width,
    depth,
    height,
    thickness = 3,
    solidBottom = false,
    useHoneycomb = true,
    hexDia = 8,
    hexWall = 2,
    notch = 'none',
    notchWidth = 100,
    screwHoles = 0,
    cableHolesLeft = 0,
    cableHolesRight = 0,
    standoffs = [],
    standoffCountersink = false,
    standoffReinforced = false,
    pullHandle: addPullHandle = false,
    pcbPreset,
    segments = DEFAULT_SEGMENTS,
  } = opts;

  const parts: Geom3[] = [];
  const cuts: Geom3[] = [];

  // === Base plate (bottom of shelf) ===
  let baseplate: Geom3;
  if (solidBottom) {
    baseplate = cuboid({
      size: [width, depth, thickness],
      center: [width / 2, depth / 2, thickness / 2],
    });
  } else if (useHoneycomb && width > 20 && depth > 20) {
    // Honeycomb ventilated bottom
    const plate = cuboid({
      size: [width, depth, thickness],
      center: [width / 2, depth / 2, thickness / 2],
    });
    const cutout = translate(
      [5, 5, 0],
      honeycombCutout(width - 10, depth - 10, thickness, hexDia, hexWall)
    );
    baseplate = subtract(plate, cutout);
  } else {
    // Rectangular vent slots
    const plate = cuboid({
      size: [width, depth, thickness],
      center: [width / 2, depth / 2, thickness / 2],
    });
    const vents = translate([5, 5, 0], rectVentSlots(width - 10, depth - 10, thickness));
    baseplate = subtract(plate, vents);
  }
  parts.push(baseplate);

  // === Side walls (trapezoidal, extending downward) ===
  const wallHeight = height;
  const wallThick = thickness;

  // Left wall
  const leftWall = cuboid({
    size: [wallThick, depth, wallHeight],
    center: [wallThick / 2, depth / 2, -wallHeight / 2],
  });
  parts.push(leftWall);

  // Right wall
  const rightWall = translate(
    [width - wallThick, 0, 0],
    cuboid({
      size: [wallThick, depth, wallHeight],
      center: [wallThick / 2, depth / 2, -wallHeight / 2],
    })
  );
  parts.push(rightWall);

  // === Support triangles at corners ===
  const triHeight = wallHeight * 0.8;
  const triDepth = depth * 0.3;

  // Small support triangles at the back corners
  const triPoints: [number, number][] = [
    [0, 0],
    [0, -triHeight],
    [triDepth, 0],
  ];
  const triProfile = polygon({ points: triPoints });

  // Left front triangle
  const leftTri = translate(
    [wallThick, 0, 0],
    rotate([0, 0, 0], extrudeLinear({ height: wallThick }, triProfile))
  );

  // Left back triangle
  const leftTriBack = translate(
    [wallThick, depth - triDepth, 0],
    rotate([0, 0, 0], extrudeLinear({ height: wallThick }, triProfile))
  );

  parts.push(leftTri, leftTriBack);

  // Right side triangles (mirrored)
  const rightTri = translate(
    [width - 2 * wallThick, 0, 0],
    rotate([0, 0, 0], extrudeLinear({ height: wallThick }, triProfile))
  );
  const rightTriBack = translate(
    [width - 2 * wallThick, depth - triDepth, 0],
    rotate([0, 0, 0], extrudeLinear({ height: wallThick }, triProfile))
  );
  parts.push(rightTri, rightTriBack);

  // === Screw holes (through the base) ===
  if (screwHoles > 0) {
    const positions = getShelfScrewPositions(screwHoles, width, depth);
    for (const [sx, sy] of positions) {
      cuts.push(
        translate(
          [sx, sy, -EPS],
          cylinder({ radius: 1.6, height: thickness + 2 * EPS, segments, center: [0, 0, (thickness + 2 * EPS) / 2] })
        )
      );
    }
  }

  // === Cable routing holes ===
  const cableHoleRadius = 5;
  const cableHoleSpacing = 15;

  // Left cable holes
  if (cableHolesLeft > 0) {
    for (let i = 0; i < cableHolesLeft; i++) {
      const y = depth / 2 + (i - (cableHolesLeft - 1) / 2) * cableHoleSpacing;
      cuts.push(
        translate(
          [wallThick / 2, y, -EPS],
          cylinder({ radius: cableHoleRadius, height: thickness + 2 * EPS, segments, center: [0, 0, (thickness + 2 * EPS) / 2] })
        )
      );
    }
  }

  // Right cable holes
  if (cableHolesRight > 0) {
    for (let i = 0; i < cableHolesRight; i++) {
      const y = depth / 2 + (i - (cableHolesRight - 1) / 2) * cableHoleSpacing;
      cuts.push(
        translate(
          [width - wallThick / 2, y, -EPS],
          cylinder({ radius: cableHoleRadius, height: thickness + 2 * EPS, segments, center: [0, 0, (thickness + 2 * EPS) / 2] })
        )
      );
    }
  }

  // === LED notch ===
  if (notch !== 'none') {
    const notchDepth = 15;
    const notchH = 5;
    let notchX: number;

    if (notch === 'left') {
      notchX = wallThick;
    } else if (notch === 'right') {
      notchX = width - wallThick - notchWidth;
    } else {
      notchX = (width - notchWidth) / 2;
    }

    cuts.push(
      translate(
        [notchX, -EPS, -notchH],
        cuboid({
          size: [notchWidth, notchDepth, notchH + EPS],
          center: [notchWidth / 2, notchDepth / 2, (notchH + EPS) / 2],
        })
      )
    );
  }

  // === Standoffs ===
  const allStandoffs: StandoffDef[] = [...standoffs];

  // PCB Preset: generate 4 corner standoffs
  if (pcbPreset?.enabled) {
    const { pcbWidth, pcbLength, offsetX, offsetY, height: sHeight, outerDia, holeDia } = pcbPreset;
    const cx = width / 2 + offsetX;
    const cy = depth / 2 + offsetY;

    allStandoffs.push(
      { x: cx - pcbWidth / 2, y: cy - pcbLength / 2, height: sHeight, outerDia, holeDia },
      { x: cx + pcbWidth / 2, y: cy - pcbLength / 2, height: sHeight, outerDia, holeDia },
      { x: cx - pcbWidth / 2, y: cy + pcbLength / 2, height: sHeight, outerDia, holeDia },
      { x: cx + pcbWidth / 2, y: cy + pcbLength / 2, height: sHeight, outerDia, holeDia },
    );
  }

  for (const s of allStandoffs) {
    parts.push(
      translate(
        [0, 0, thickness],
        renderStandoff(s.x, s.y, s.height, s.outerDia, s.holeDia, standoffCountersink, standoffReinforced, segments)
      )
    );
  }

  // === Pull handle ===
  if (addPullHandle) {
    const handle = translate(
      [width / 2, 0, thickness / 2],
      pullHandle(width, thickness, segments)
    );
    parts.push(handle);
  }

  // Combine parts and apply cuts
  let shelf = safeUnion(...parts);
  if (cuts.length > 0) {
    shelf = safeSubtract(shelf, ...cuts);
  }

  return shelf;
}

/**
 * Create an enhanced shelf positioned for the rack generator
 */
export function enhancedShelfPositioned(
  offsetX: number,
  offsetY: number,
  panelWidth: number,
  rackHeight: number,
  deviceWidth: number,
  deviceHeight: number,
  deviceDepth: number,
  shelfOpts: Omit<EnhancedShelfOptions, 'width' | 'depth' | 'height'>,
  plateThickness = 4
): Geom3 {
  const width = deviceWidth + 6; // small margin
  const depth = deviceDepth + 3;
  const height = deviceHeight + 3;

  const cx = panelWidth / 2 + offsetX - width / 2;
  const cy = rackHeight / 2 + offsetY - height / 2;

  const shelf = enhancedShelf({
    width,
    depth,
    height,
    ...shelfOpts,
  });

  return translate([cx, cy, plateThickness], shelf);
}
