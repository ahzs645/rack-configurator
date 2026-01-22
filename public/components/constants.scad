/*
 * CageMaker PRCG - Constants and Configuration
 * Modular Component: Shared constants and lookup tables
 *
 * Based on CageMaker PRCG v0.21 by WebMaka
 * Original: https://github.com/WebMaka/CageMakerPRCG
 * License: CC BY-NC-SA 4.0
 */

// EIA-310 Standard Unit Height (mm)
EIA_UNIT_HEIGHT = 44.45;

// Standard screw spacing for EIA-310 (mm) - 1/2-5/8-5/8 pattern
EIA_SCREW_SPACING = [6.35, 22.225, 38.1];

// Rack width options (inches to mm conversion factor)
INCH_TO_MM = 25.4;

// ============================================================================
// EIA-310 RACK DIMENSIONS
// ============================================================================

// 19" Rack (most common)
EIA_19_FACEPLATE_WIDTH = 482.6;        // 19" total width
EIA_19_MOUNT_HOLE_SPACING = 450.85;    // 17.75" between mounting holes
EIA_19_EAR_WIDTH = (EIA_19_FACEPLATE_WIDTH - EIA_19_MOUNT_HOLE_SPACING) / 2 + 8;
EIA_19_PANEL_WIDTH = EIA_19_MOUNT_HOLE_SPACING;  // Usable width between ears

// 10" Rack (half-width)
EIA_10_FACEPLATE_WIDTH = 254.0;        // 10" total width
EIA_10_MOUNT_HOLE_SPACING = 222.25;    // ~8.75" between mounting holes
EIA_10_EAR_WIDTH = (EIA_10_FACEPLATE_WIDTH - EIA_10_MOUNT_HOLE_SPACING) / 2 + 8;
EIA_10_PANEL_WIDTH = EIA_10_MOUNT_HOLE_SPACING;

// 23" Rack (telco/broadcast)
EIA_23_FACEPLATE_WIDTH = 584.2;        // 23" total width
EIA_23_MOUNT_HOLE_SPACING = 552.45;    // ~21.75" between mounting holes
EIA_23_EAR_WIDTH = (EIA_23_FACEPLATE_WIDTH - EIA_23_MOUNT_HOLE_SPACING) / 2 + 8;
EIA_23_PANEL_WIDTH = EIA_23_MOUNT_HOLE_SPACING;

// Helper function to calculate rack height from U count
function rack_height(u) = u * EIA_UNIT_HEIGHT;

// Faceplate ear options lookup table
// [rack_width, ear_type]
FACEPLATE_EAR_OPTIONS = [
    [5, "One Side"],       // Half-width 10" rack
    [6, "None"],           // 6" micro-rack
    [6.33, "One Side"],    // Outer third-width 19" rack
    [6.33001, "Both Sides"], // Center third-width 19" rack
    [7, "None"],           // 7" micro-rack
    [9.5, "One Side"],     // Half-width 19" rack
    [10, "None"],          // 10" mini-rack
    [19, "None"],          // Full 19" rack
];

// Fastener hole diameter lookup table
// [tap_or_heat_set_diameter, clearance_diameter]
HOLE_OPTIONS = [
    // Clearance holes
    [3.15, 3.15],  // M3 Clearance
    [4.20, 4.20],  // M4 Clearance
    [5.25, 5.25],  // M5 Clearance (DEFAULT)
    [6.30, 6.30],  // M6 Clearance
    [2.95, 2.95],  // 4-40 Clearance
    [3.66, 3.66],  // 6-32 Clearance
    [4.31, 4.31],  // 8-32 Clearance
    [4.98, 4.98],  // 10-24/10-32 Clearance
    [6.53, 6.53],  // 1/4-20 Clearance

    // Tapped holes
    [2.60, 3.15],  // M3 Tapped
    [3.50, 4.20],  // M4 Tapped
    [4.40, 5.25],  // M5 Tapped
    [5.00, 6.30],  // M6 Tapped
    [2.07, 2.95],  // 4-40 Tapped
    [2.53, 3.66],  // 6-32 Tapped
    [3.19, 4.31],  // 8-32 Tapped
    [3.53, 4.98],  // 10-24/10-32 Tapped
    [4.79, 6.53],  // 1/4-20 Tapped

    // Heat-set inserts
    [3.98, 3.15],  // M3 Heat-Set (4mm)
    [4.10, 3.15],  // M3 Heat-Set (4.1mm)
    [4.80, 3.15],  // M3 Heat-Set (4.8mm)
    [5.60, 4.20],  // M4 Heat-Set (5.6mm)
    [5.70, 4.20],  // M4 Heat-Set (5.7mm)
    [6.40, 5.25],  // M5 Heat-Set (6.4mm)
    [6.50, 5.25],  // M5 Heat-Set (6.5mm)
    [8.00, 6.30],  // M6 Heat-Set (8mm)
    [8.10, 6.30],  // M6 Heat-Set (8.1mm)
    [3.99, 2.95],  // 4-40 Heat-Set
    [4.03, 2.95],  // 4-40 Heat-Set
    [4.76, 3.66],  // 6-32 Heat-Set
    [4.85, 3.66],  // 6-32 Heat-Set
    [5.61, 4.31],  // 8-32 Heat-Set
    [5.74, 4.31],  // 8-32 Heat-Set
    [6.41, 4.98],  // 10-24/10-32 Heat-Set
    [6.51, 4.98],  // 10-24/10-32 Heat-Set
    [8.01, 6.53],  // 1/4-20 Heat-Set
    [8.11, 6.53],  // 1/4-20 Heat-Set

    // Default fallback
    [0.00, 5.25],  // Default M5/#10
];

// Modification (Keystone/Fan) width lookup table
MOD_WIDTHS = [
    ["None", 0],
    ["1x1Keystone", 25],
    ["2x1Keystone", 50],
    ["3x1Keystone", 75],
    ["1x2Keystone", 25],
    ["2x2Keystone", 50],
    ["3x2Keystone", 75],
    ["30mmFan", 35],
    ["40mmFan", 45],
    ["60mmFan", 65],
    ["80mmFan", 85],
];

// Modification (Keystone/Fan) height lookup table
MOD_HEIGHTS = [
    ["None", 0],
    ["1x1Keystone", 30],
    ["2x1Keystone", 30],
    ["3x1Keystone", 30],
    ["1x2Keystone", 60],
    ["2x2Keystone", 60],
    ["3x2Keystone", 60],
    ["30mmFan", 35],
    ["40mmFan", 45],
    ["60mmFan", 65],
    ["80mmFan", 85],
];

// Fan screw hole centers (distance between mounting holes)
FAN_SCREW_CENTERS = [
    ["30mmFan", 24],
    ["40mmFan", 32],
    ["60mmFan", 50],
    ["80mmFan", 71.5],
];

// Helper function to get clearance hole diameter
function get_clearance_hole(tap_diameter) =
    HOLE_OPTIONS[search(tap_diameter, HOLE_OPTIONS)[0]][1];

// Helper function to get faceplate ear type
function get_faceplate_ears(rack_width) =
    FACEPLATE_EAR_OPTIONS[search(rack_width, FACEPLATE_EAR_OPTIONS)[0]][1];

// Helper function to get mod width
function get_mod_width(mod_type) =
    MOD_WIDTHS[search([mod_type], MOD_WIDTHS)[0]][1];

// Helper function to get mod height
function get_mod_height(mod_type) =
    MOD_HEIGHTS[search([mod_type], MOD_HEIGHTS)[0]][1];

// Helper function to get fan screw centers
function get_fan_screw_centers(fan_type) =
    FAN_SCREW_CENTERS[search([fan_type], FAN_SCREW_CENTERS)[0]][1];
