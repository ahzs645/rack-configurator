/*
 * Rack Scad - Rack Mount Common Definitions
 * Based on rackstack-main configuration system
 *
 * This supports both EIA-310 standard racks AND custom rackstack-style racks.
 */

include <../components/print_config.scad>
include <../components/constants.scad>
use <../components/screws.scad>

// ============================================================================
// RACK PROFILE CONFIGURATION
// Switch between profiles by changing ACTIVE_PROFILE_NAME
// ============================================================================

// Available profiles: "nano", "micro", "mini", "default", "eia_10", "eia_19"
ACTIVE_PROFILE_NAME = "default";

// Profile definitions: [maxUnitWidth, maxUnitDepth, screwDiff, mainRailScrewType, rackFrameScrewType]
PROFILES = [
    // Rackstack-style custom racks (10mm screw spacing)
    ["nano",    [105, 105, 10, "M3", "M3"]],
    ["micro",   [180, 180, 10, "M4", "M3"]],
    ["mini",    [205, 205, 10, "M4", "M3"]],
    ["default", [180, 180, 10, "M4", "M3"]],

    // EIA-310 standard racks (44.45mm = 1U screw spacing)
    ["eia_10",  [222.25, 300, 44.45, "M5", "M4"]],  // 10" rack
    ["eia_19",  [450, 600, 44.45, "M5", "M4"]],     // 19" rack
];

// Get profile by name
function _get_profile(name) =
    let(idx = search([name], PROFILES))
    len(idx) > 0 && idx[0] < len(PROFILES) ? PROFILES[idx[0]][1] : PROFILES[3][1];  // default fallback

// Active profile values
_active_profile = _get_profile(ACTIVE_PROFILE_NAME);

maxUnitWidth = _active_profile[0];
maxUnitDepth = _active_profile[1];
screwDiff = _active_profile[2];            // Vertical distance between screw mounts
uDiff = screwDiff;                         // Alias for compatibility
mainRailScrewType = _active_profile[3];
rackFrameScrewType = _active_profile[4];

// ============================================================================
// RAIL AND MOUNT DIMENSIONS
// ============================================================================

// Rail dimensions
railFrontThickness = 8;
railSideMountThickness = 2.5;
railFootThickness = 3;

// Distance from screw center to rail edges
railScrewHoleToInnerEdge = 5;
railScrewHoleToOuterEdge = 7;

// Front face width
frontFaceWidth = railScrewHoleToInnerEdge + railScrewHoleToOuterEdge;

// Screw spacing from front
frontScrewSpacing = 15;

// Side rail configuration
sideRailBaseWidth = 15;
sideRailLowerMountPointToBottom = uDiff / 2;

// Y-Bar dimensions (needed for side rail screw mount distance calculation)
railSlotToXZ = 3;
railSlotToInnerYEdge = 2;
yBarDepth = maxUnitDepth + 2 * railSlotToInnerYEdge;

// Distance between front and back main rail screw mounts on side rails
sideRailScrewMountDist = yBarDepth - 2 * (frontScrewSpacing + railFrontThickness + railSlotToXZ);

// Main rail side support calculation
mainRailSideSupportToInnerEdge = frontFaceWidth - railSideMountThickness;

// Rack mount screw positions
rackMountScrewWidth = maxUnitWidth + 2 * railScrewHoleToInnerEdge;
rackMountScrewXDist = 4.5;
rackMountScrewZDist = 4.5;

// Plate base screw edge distances
boxPlateScrewToXEdge = 4.5;
boxPlateScrewToYEdge = 5;

// Side support dimensions
railSupportsDx = 2 * mainRailSideSupportToInnerEdge + maxUnitWidth;

// Base roundness for fillets
baseRoundness = 5;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Find minimum rack units needed for a box height
function findU(boxHeight, minRailThickness) =
    max(1, ceil((boxHeight + 2 * minRailThickness) / uDiff) - 1);

// Calculate rail bottom thickness based on orientation
function railBottomThickness(u, boxHeight, minRailThickness, zOrientation) =
    (zOrientation == "middle")
        ? (((u + 1) * uDiff) - boxHeight) / 2
        : (zOrientation == "bottom")
            ? minRailThickness
            : minRailThickness;

// Calculate plate dimensions
function plateLength(u) = rackMountScrewWidth + 2 * boxPlateScrewToXEdge;
function plateHeight(u) = uDiff * u + 2 * boxPlateScrewToYEdge;

// ============================================================================
// PLATE BASE MODULE
// Creates a faceplate with mounting holes
// ============================================================================

module plate_base(
    U = 1,
    plateThickness = 3,
    screwType = "M4",
    screwToXEdge = 4.5,
    screwToYEdge = 4.5,
    filletR = 2
) {
    assert(floor(U) == U && U > 0, "U must be a positive integer");
    assert(plateThickness > 0, "plateThickness must be positive");

    screwDx = rackMountScrewWidth;
    screwDy = uDiff * U;

    pLength = screwDx + 2 * screwToXEdge;
    pHeight = screwDy + 2 * screwToYEdge;

    // Translate so screw positions are at origin-based coordinates
    translate([-screwToXEdge, -screwToYEdge, -plateThickness])
    difference() {
        // Rounded rectangle base
        minkowski() {
            translate([filletR, filletR, 0])
            cube([pLength - 2 * filletR, pHeight - 2 * filletR, plateThickness]);
            cylinder(r = filletR, h = eps, $fn = 32);
        }

        // Screw holes at four corners
        _mirror4XY([screwToXEdge, screwToYEdge], screwDx, screwDy)
        translate([0, 0, plateThickness])
        cylinder(r = screw_radius_slacked(screwType), h = inf, center = true, $fn = 32);
    }
}

// Helper: Place children at 4 corners
module _mirror4XY(p, dx, dy) {
    translate([p[0], p[1], 0]) children();
    translate([p[0] + dx, p[1], 0]) children();
    translate([p[0], p[1] + dy, 0]) children();
    translate([p[0] + dx, p[1] + dy, 0]) children();
}

// ============================================================================
// RACK EAR MODULE
// ============================================================================

module rack_ear(
    u = 1,
    frontThickness = 3,
    sideThickness = 3,
    frontWidth = 20,
    sideDepth = 50,
    backPlaneHeight = 10,
    support = true
) {
    // Validate front width
    assert(frontWidth - sideThickness >= rackMountScrewXDist + railScrewHoleToInnerEdge,
           "frontWidth too small for screw spacing");

    earHeight = u * uDiff + 2 * rackMountScrewZDist;

    difference() {
        translate([-rackMountScrewXDist, 0, -rackMountScrewZDist]) {
            // Front plate
            cube([frontWidth, frontThickness, earHeight]);

            // Side plate (tapered to back)
            hull() {
                translate([frontWidth - sideThickness, 0, 0])
                cube([sideThickness, frontThickness, earHeight]);

                translate([frontWidth - sideThickness, sideDepth, 0])
                cube([sideThickness, eps, backPlaneHeight]);
            }

            // Diagonal support
            if (support) {
                extraSpacing = (frontWidth - (rackMountScrewXDist + railScrewHoleToInnerEdge + sideThickness) > 1) ? 1 : 0;

                hull() {
                    translate([rackMountScrewXDist + railScrewHoleToInnerEdge + extraSpacing, frontThickness, 0])
                    cube([sideThickness, eps, earHeight]);

                    translate([frontWidth - sideThickness, sideDepth, 0])
                    cube([sideThickness, eps, backPlaneHeight]);
                }
            }
        }

        // Rack mount screw holes
        _rack_mount_holes(u);
    }
}

module _rack_mount_holes(u) {
    for (i = [0:u]) {
        translate([0, 0, i * uDiff])
        rotate([90, 0, 0])
        cylinder(r = screw_radius_slacked(mainRailScrewType), h = inf, center = true, $fn = 32);
    }
}

// ============================================================================
// POSITIVE/NEGATIVE HELPER
// ============================================================================

module apply_pn() {
    difference() {
        union() {
            children(0);  // Positive volumes
            children(2);  // Base object
        }
        children(1);      // Negative volumes
    }
}
