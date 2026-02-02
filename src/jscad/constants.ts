// JSCAD Constants - EIA-310 rack standards and shared dimensions
// Translated from OpenSCAD components/constants.scad

export const EIA_UNIT_HEIGHT = 44.45; // mm per 1U
export const INCH_TO_MM = 25.4;

// EIA-310 screw hole spacing within each U (from bottom of each U)
export const EIA_SCREW_SPACING = [6.35, 22.225, 38.1]; // mm

// Rack widths
export const EIA_19_FACEPLATE_WIDTH = 482.6; // mm (19")
export const EIA_19_PANEL_WIDTH = 450.85; // mm (17.75")
export const EIA_10_FACEPLATE_WIDTH = 254.0; // mm (10")
export const EIA_10_PANEL_WIDTH = 222.25; // mm
export const EIA_23_FACEPLATE_WIDTH = 584.2; // mm (23")
export const EIA_23_PANEL_WIDTH = 535.0; // mm

// Hole sizes for various fastener types
// Format: [clearance_dia, tap_dia, heatset_dia]
export const HOLE_OPTIONS: Record<string, [number, number, number]> = {
  'M2': [2.4, 1.6, 3.2],
  'M2.5': [2.9, 2.05, 3.6],
  'M3': [3.4, 2.5, 4.0],
  'M4': [4.5, 3.3, 5.6],
  'M5': [5.5, 4.2, 6.4],
  'M6': [6.6, 5.0, 8.0],
  '4-40': [3.26, 2.26, 4.0],
  '6-32': [3.80, 2.69, 4.8],
  '8-32': [4.37, 3.45, 5.5],
  '10-24': [5.11, 3.80, 6.4],
  '10-32': [5.11, 4.09, 6.4],
  '1/4-20': [6.76, 5.11, 8.0],
};

// Keystone dimensions
export const KEYSTONE_WIDTH = 14.5;
export const KEYSTONE_HEIGHT = 16.0;
export const KEYSTONE_SPACING = 19.0;

// Fan dimensions: size -> screw center distance
export const FAN_SCREW_CENTERS: Record<number, number> = {
  30: 24,
  40: 32,
  60: 50,
  80: 71.5,
};

// Print tolerance constants
export const XY_SLACK = 0.25;
export const RADIUS_XY_SLACK = 0.125;
export const Z_SLACK = 0.0;
export const OVERHANG_SLACK = 0.5;
export const DOVETAIL_SLACK = 0.25;
export const DEFAULT_LAYER_HEIGHT = 0.3;
export const NOZZLE_DIAMETER = 0.4;
export const MIN_WALL_THICKNESS = 0.8;
export const EPS = 0.001;
export const INF = 1000;

// Default quality settings
export const DEFAULT_SEGMENTS = 32;
export const FINE_SEGMENTS = 64;

// Helper functions
export function rackHeight(u: number): number {
  return u * EIA_UNIT_HEIGHT;
}

export function faceplateHeight(u: number): number {
  return u * EIA_UNIT_HEIGHT - 0.79;
}

export function getClearanceHole(screwType: string): number {
  return HOLE_OPTIONS[screwType]?.[0] ?? 5.5;
}

export function getTapHole(screwType: string): number {
  return HOLE_OPTIONS[screwType]?.[1] ?? 4.2;
}

export function getHeatSetHole(screwType: string): number {
  return HOLE_OPTIONS[screwType]?.[2] ?? 6.4;
}
