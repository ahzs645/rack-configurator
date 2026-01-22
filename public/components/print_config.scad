/*
 * Rack Scad - Print Configuration and Snap-Fit Sizing
 * Tolerance/slack management for 3D printing precision
 *
 * Philosophy: Subtract space from sockets, while not modifying plugs.
 * Values are signed - positive values remove material from sockets.
 * These values depend on print orientation (parts should be printed in recommended orientations).
 */

// ============================================================================
// SLACK/TOLERANCE CONFIGURATION
// ============================================================================

// XY plane tolerance - for horizontal dimensions
// Adjust this based on your printer's accuracy
xySlack = 0.25;

// Radius slack for cylindrical features in XY plane
radiusXYSlack = xySlack / 2;

// Z-axis tolerance - for vertical dimensions
// Usually less than XY due to layer height control
zSlack = 0.0;

// Overhang slack - for unsupported overhanging surfaces
// Typically larger due to drooping/sagging
overhangSlack = 0.5;

// Supported overhang slack - for supported overhanging surfaces
supportedOverhangSlack = 0.5;

// Special case: dovetail connections between bars
dovetailSlack = xySlack;

// ============================================================================
// PRINTER/SLICER CONFIGURATION
// ============================================================================

// Default layer height - used for calculating bridge layers
defaultLayerHeight = 0.3;

// Nozzle diameter - affects minimum feature size
nozzleDiameter = 0.4;

// Minimum wall thickness for structural integrity
minWallThickness = nozzleDiameter * 2;

// ============================================================================
// PROFILE PRESETS
// For different printer types or tolerance requirements
// ============================================================================

// Tight fit profile - for high-precision printers
PROFILE_TIGHT = [
    ["xySlack", 0.15],
    ["radiusXYSlack", 0.075],
    ["zSlack", 0.0],
    ["overhangSlack", 0.3],
];

// Standard fit profile - default for most printers
PROFILE_STANDARD = [
    ["xySlack", 0.25],
    ["radiusXYSlack", 0.125],
    ["zSlack", 0.0],
    ["overhangSlack", 0.5],
];

// Loose fit profile - for lower-precision printers or easy assembly
PROFILE_LOOSE = [
    ["xySlack", 0.4],
    ["radiusXYSlack", 0.2],
    ["zSlack", 0.1],
    ["overhangSlack", 0.6],
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get slack value from profile by name
function get_profile_slack(profile, name) =
    let(found = [for (p = profile) if (p[0] == name) p[1]])
    len(found) > 0 ? found[0] : 0;

// Apply slack to a dimension (subtracts from sockets)
function apply_slack(dimension, slack) = dimension - slack;

// Apply radius slack
function apply_radius_slack(radius, slack) = radius + slack;

// Calculate slacked clearance hole diameter
function slacked_hole_diameter(nominal_diameter) =
    nominal_diameter + 2 * radiusXYSlack;

// ============================================================================
// QUALITY SETTINGS FOR RENDERING
// ============================================================================

// High quality for final render
$fn = 64;

// Preview quality (faster)
preview_fn = 32;

// Ultra-fine for small details
fine_fn = 96;

// Math constants
eps = 0.001;        // Small epsilon for preventing z-fighting
inf = 1000;         // "Infinite" value for cuts
inf10 = 10;         // Moderate cut depth
inf50 = 50;         // Larger cut depth
