/*
 * Rack Scad - Enhanced Screw System Module
 * Parametric screw holes, hex nut pockets, and countersunk heads
 * with bridging support for 3D printing
 */

include <print_config.scad>

// ============================================================================
// METRIC SCREW DIMENSIONS
// All dimensions in mm
// ============================================================================

// M2 Screw
M2_DIAMETER = 2.0;
M2_RADIUS = M2_DIAMETER / 2;
M2_COUNTERSUNK_HEAD_RADIUS = 2.0;
M2_COUNTERSUNK_HEAD_LENGTH = 1.2;
M2_HEX_NUT_WIDTH_FLATS = 4.0;
M2_HEX_NUT_THICKNESS = 1.6;

// M3 Screw
M3_DIAMETER = 3.0;
M3_RADIUS = M3_DIAMETER / 2;
M3_COUNTERSUNK_HEAD_RADIUS = 3.0;
M3_COUNTERSUNK_HEAD_LENGTH = 1.7;
M3_HEX_NUT_WIDTH_FLATS = 5.5;
M3_HEX_NUT_THICKNESS = 2.4;

// M4 Screw
M4_DIAMETER = 4.0;
M4_RADIUS = M4_DIAMETER / 2;
M4_COUNTERSUNK_HEAD_RADIUS = 4.0;
M4_COUNTERSUNK_HEAD_LENGTH = 2.3;
M4_HEX_NUT_WIDTH_FLATS = 7.0;
M4_HEX_NUT_THICKNESS = 3.2;

// M5 Screw
M5_DIAMETER = 5.0;
M5_RADIUS = M5_DIAMETER / 2;
M5_COUNTERSUNK_HEAD_RADIUS = 5.0;
M5_COUNTERSUNK_HEAD_LENGTH = 2.8;
M5_HEX_NUT_WIDTH_FLATS = 8.0;
M5_HEX_NUT_THICKNESS = 4.0;

// M6 Screw
M6_DIAMETER = 6.0;
M6_RADIUS = M6_DIAMETER / 2;
M6_COUNTERSUNK_HEAD_RADIUS = 6.0;
M6_COUNTERSUNK_HEAD_LENGTH = 3.3;
M6_HEX_NUT_WIDTH_FLATS = 10.0;
M6_HEX_NUT_THICKNESS = 5.0;

// ============================================================================
// IMPERIAL SCREW DIMENSIONS (UNC/UNF)
// ============================================================================

// 4-40 Screw
UNC_4_40_DIAMETER = 2.84;
UNC_4_40_RADIUS = UNC_4_40_DIAMETER / 2;
UNC_4_40_HEX_NUT_WIDTH_FLATS = 6.35;
UNC_4_40_HEX_NUT_THICKNESS = 2.38;

// 6-32 Screw
UNC_6_32_DIAMETER = 3.51;
UNC_6_32_RADIUS = UNC_6_32_DIAMETER / 2;
UNC_6_32_HEX_NUT_WIDTH_FLATS = 7.94;
UNC_6_32_HEX_NUT_THICKNESS = 2.78;

// 8-32 Screw
UNC_8_32_DIAMETER = 4.17;
UNC_8_32_RADIUS = UNC_8_32_DIAMETER / 2;
UNC_8_32_HEX_NUT_WIDTH_FLATS = 8.73;
UNC_8_32_HEX_NUT_THICKNESS = 3.18;

// 10-24/10-32 Screw
UNC_10_DIAMETER = 4.83;
UNC_10_RADIUS = UNC_10_DIAMETER / 2;
UNC_10_HEX_NUT_WIDTH_FLATS = 9.53;
UNC_10_HEX_NUT_THICKNESS = 3.18;

// 1/4-20 Screw
UNC_1_4_20_DIAMETER = 6.35;
UNC_1_4_20_RADIUS = UNC_1_4_20_DIAMETER / 2;
UNC_1_4_20_HEX_NUT_WIDTH_FLATS = 11.11;
UNC_1_4_20_HEX_NUT_THICKNESS = 5.56;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Convert hex nut width across flats to width across corners
function flats_to_corners(widthAcrossFlats) = widthAcrossFlats * (2 / sqrt(3));

// Convert hex nut width across corners to width across flats
function corners_to_flats(widthAcrossCorners) = widthAcrossCorners * (sqrt(3) / 2);

// Get screw radius with slack applied
function screw_radius_slacked(screwType) =
    (screwType == "M2") ? M2_RADIUS + radiusXYSlack :
    (screwType == "M3") ? M3_RADIUS + radiusXYSlack :
    (screwType == "M4") ? M4_RADIUS + radiusXYSlack :
    (screwType == "M5") ? M5_RADIUS + radiusXYSlack :
    (screwType == "M6") ? M6_RADIUS + radiusXYSlack :
    (screwType == "4-40") ? UNC_4_40_RADIUS + radiusXYSlack :
    (screwType == "6-32") ? UNC_6_32_RADIUS + radiusXYSlack :
    (screwType == "8-32") ? UNC_8_32_RADIUS + radiusXYSlack :
    (screwType == "10-24" || screwType == "10-32") ? UNC_10_RADIUS + radiusXYSlack :
    (screwType == "1/4-20") ? UNC_1_4_20_RADIUS + radiusXYSlack :
    M5_RADIUS + radiusXYSlack;  // Default to M5

// Get hex nut thickness
function hex_nut_thickness(screwType) =
    (screwType == "M2") ? M2_HEX_NUT_THICKNESS :
    (screwType == "M3") ? M3_HEX_NUT_THICKNESS :
    (screwType == "M4") ? M4_HEX_NUT_THICKNESS :
    (screwType == "M5") ? M5_HEX_NUT_THICKNESS :
    (screwType == "M6") ? M6_HEX_NUT_THICKNESS :
    (screwType == "4-40") ? UNC_4_40_HEX_NUT_THICKNESS :
    (screwType == "6-32") ? UNC_6_32_HEX_NUT_THICKNESS :
    (screwType == "8-32") ? UNC_8_32_HEX_NUT_THICKNESS :
    (screwType == "10-24" || screwType == "10-32") ? UNC_10_HEX_NUT_THICKNESS :
    (screwType == "1/4-20") ? UNC_1_4_20_HEX_NUT_THICKNESS :
    M5_HEX_NUT_THICKNESS;

// Get hex nut width across corners (slacked)
function hex_nut_corners_slacked(screwType) =
    (screwType == "M2") ? flats_to_corners(M2_HEX_NUT_WIDTH_FLATS) + xySlack :
    (screwType == "M3") ? flats_to_corners(M3_HEX_NUT_WIDTH_FLATS) + xySlack :
    (screwType == "M4") ? flats_to_corners(M4_HEX_NUT_WIDTH_FLATS) + xySlack :
    (screwType == "M5") ? flats_to_corners(M5_HEX_NUT_WIDTH_FLATS) + xySlack :
    (screwType == "M6") ? flats_to_corners(M6_HEX_NUT_WIDTH_FLATS) + xySlack :
    (screwType == "4-40") ? flats_to_corners(UNC_4_40_HEX_NUT_WIDTH_FLATS) + xySlack :
    (screwType == "6-32") ? flats_to_corners(UNC_6_32_HEX_NUT_WIDTH_FLATS) + xySlack :
    (screwType == "8-32") ? flats_to_corners(UNC_8_32_HEX_NUT_WIDTH_FLATS) + xySlack :
    (screwType == "10-24" || screwType == "10-32") ? flats_to_corners(UNC_10_HEX_NUT_WIDTH_FLATS) + xySlack :
    (screwType == "1/4-20") ? flats_to_corners(UNC_1_4_20_HEX_NUT_WIDTH_FLATS) + xySlack :
    flats_to_corners(M5_HEX_NUT_WIDTH_FLATS) + xySlack;

// ============================================================================
// BASIC SCREW HOLE MODULES
// ============================================================================

/*
 * Create a simple clearance hole for a screw
 *
 * Parameters:
 *   screwType - "M2", "M3", "M4", "M5", "M6", "4-40", "6-32", "8-32", "10-24", "1/4-20"
 *   depth - Hole depth
 */
module screw_hole(screwType = "M5", depth = 20) {
    cylinder(r = screw_radius_slacked(screwType), h = depth, $fn = 32);
}

/*
 * Create a countersunk screw hole
 *
 * Parameters:
 *   screwType - Screw type
 *   screwDepth - Depth of the screw shaft below the head
 *   headExtension - Extra depth above the countersink (for cutting through)
 */
module countersunk_hole(
    screwType = "M5",
    screwDepth = 20,
    headExtension = 10
) {
    radius = screw_radius_slacked(screwType);

    headRadius = (screwType == "M2") ? M2_COUNTERSUNK_HEAD_RADIUS :
                 (screwType == "M3") ? M3_COUNTERSUNK_HEAD_RADIUS :
                 (screwType == "M4") ? M4_COUNTERSUNK_HEAD_RADIUS :
                 (screwType == "M5") ? M5_COUNTERSUNK_HEAD_RADIUS :
                 (screwType == "M6") ? M6_COUNTERSUNK_HEAD_RADIUS :
                 M5_COUNTERSUNK_HEAD_RADIUS;

    headLength = (screwType == "M2") ? M2_COUNTERSUNK_HEAD_LENGTH :
                 (screwType == "M3") ? M3_COUNTERSUNK_HEAD_LENGTH :
                 (screwType == "M4") ? M4_COUNTERSUNK_HEAD_LENGTH :
                 (screwType == "M5") ? M5_COUNTERSUNK_HEAD_LENGTH :
                 (screwType == "M6") ? M6_COUNTERSUNK_HEAD_LENGTH :
                 M5_COUNTERSUNK_HEAD_LENGTH;

    union() {
        // Screw shaft
        translate([0, 0, -screwDepth])
        cylinder(r = radius, h = screwDepth, $fn = 32);

        // Countersunk cone
        translate([0, 0, -headLength])
        cylinder(r1 = radius, r2 = headRadius, h = headLength, $fn = 32);

        // Head extension (for cutting through material)
        cylinder(r = headRadius, h = headExtension, $fn = 32);
    }
}

// ============================================================================
// HEX NUT POCKET MODULES
// ============================================================================

/*
 * Create a hex nut pocket
 * Designed for printing with the pocket opening on the side
 *
 * Parameters:
 *   screwType - Screw type
 *   openSide - Leave one side open for sliding nut in
 *   backSpace - Extra depth behind nut for screw threads
 *   bridgeFront - Add bridge layers on front (top when printed)
 *   bridgeBack - Add bridge layers on back
 */
module hex_nut_pocket(
    screwType = "M5",
    openSide = true,
    backSpace = 20,
    bridgeFront = false,
    bridgeBack = false
) {
    radius = screw_radius_slacked(screwType);
    nutRadius = hex_nut_corners_slacked(screwType) / 2;
    nutThickness = hex_nut_thickness(screwType);

    // Use overhang slack if bridging, otherwise xySlack
    heightSlack = (bridgeFront || bridgeBack) ? overhangSlack : xySlack;
    totalThickness = nutThickness + heightSlack;

    union() {
        // Hex nut pocket with optional slide-in opening
        hull() {
            // Hex prism for nut
            cylinder(r = nutRadius, h = totalThickness, center = true, $fn = 6);

            // Extended opening for sliding nut in
            if (openSide) {
                translate([inf50, 0, 0])
                cylinder(r = nutRadius, h = totalThickness, center = true, $fn = 6);
            }
        }

        // Screw hole extending backward
        translate([0, 0, -backSpace])
        cylinder(r = radius, h = backSpace, $fn = 32);

        // Screw hole extending forward
        cylinder(r = radius, h = inf50, $fn = 32);

        // Bridge layers for printability
        if (bridgeFront) {
            _bridge_layers(radius, nutRadius, totalThickness / 2, true);
        }

        if (bridgeBack) {
            _bridge_layers(radius, nutRadius, totalThickness / 2, false);
        }

        // Extended screw clearance if open side
        if (openSide) {
            hull() {
                translate([inf50, 0, 0])
                cylinder(r = radius, h = inf50, $fn = 32);
                cylinder(r = radius, h = inf50, $fn = 32);
            }
        }
    }
}

/*
 * Internal module for bridge layers
 */
module _bridge_layers(innerRadius, outerRadius, offset, front = true) {
    dir = front ? 1 : -1;
    flatsWidth = corners_to_flats(outerRadius * 2);

    // First bridge layer - spans the hex width
    translate([0, 0, dir * (offset + defaultLayerHeight / 2)])
    cube([2 * innerRadius, flatsWidth, defaultLayerHeight], center = true);

    // Second bridge layer - smaller, just for screw hole
    translate([0, 0, dir * (offset + defaultLayerHeight)])
    cube([2 * innerRadius, 2 * innerRadius, defaultLayerHeight], center = true);
}

/*
 * Create a hex nut pocket oriented for vertical printing
 * (Pocket faces up, good for bottom of parts)
 */
module hex_nut_pocket_vertical(
    screwType = "M5",
    nutDropIn = true,
    screwDepth = 20
) {
    radius = screw_radius_slacked(screwType);
    nutRadius = hex_nut_corners_slacked(screwType) / 2;
    nutThickness = hex_nut_thickness(screwType) + xySlack;

    union() {
        // Hex pocket at top
        cylinder(r = nutRadius, h = nutThickness, $fn = 6);

        // Screw hole below
        translate([0, 0, -screwDepth])
        cylinder(r = radius, h = screwDepth + 0.1, $fn = 32);

        // Drop-in slot
        if (nutDropIn) {
            translate([0, nutRadius / 2, 0])
            cube([nutRadius * 1.5, nutRadius, nutThickness], center = true);
        }
    }
}

// ============================================================================
// HEX NUT VISUALIZATION (for preview)
// ============================================================================

/*
 * Create a visual representation of a hex nut
 */
module hex_nut_visual(screwType = "M5") {
    radius = (screwType == "M2") ? M2_RADIUS :
             (screwType == "M3") ? M3_RADIUS :
             (screwType == "M4") ? M4_RADIUS :
             (screwType == "M5") ? M5_RADIUS :
             (screwType == "M6") ? M6_RADIUS :
             M5_RADIUS;

    nutRadius = (screwType == "M2") ? flats_to_corners(M2_HEX_NUT_WIDTH_FLATS) / 2 :
                (screwType == "M3") ? flats_to_corners(M3_HEX_NUT_WIDTH_FLATS) / 2 :
                (screwType == "M4") ? flats_to_corners(M4_HEX_NUT_WIDTH_FLATS) / 2 :
                (screwType == "M5") ? flats_to_corners(M5_HEX_NUT_WIDTH_FLATS) / 2 :
                (screwType == "M6") ? flats_to_corners(M6_HEX_NUT_WIDTH_FLATS) / 2 :
                flats_to_corners(M5_HEX_NUT_WIDTH_FLATS) / 2;

    thickness = hex_nut_thickness(screwType);

    color("Silver")
    translate([0, 0, -thickness / 2])
    difference() {
        cylinder(r = nutRadius, h = thickness, $fn = 6);
        cylinder(r = radius, h = thickness + 0.1, center = true, $fn = 32);
    }
}

// ============================================================================
// COMBINED SCREW + NUT MODULES
// ============================================================================

/*
 * Create a complete through-hole with hex nut pocket on back
 *
 * Parameters:
 *   screwType - Screw type
 *   thickness - Material thickness
 *   countersunk - Use countersunk head
 *   nutOnBack - Position nut pocket on back side
 */
module screw_with_nut(
    screwType = "M5",
    thickness = 10,
    countersunk = false,
    nutOnBack = true
) {
    nutThickness = hex_nut_thickness(screwType) + xySlack;

    union() {
        // Screw hole
        if (countersunk) {
            countersunk_hole(screwType = screwType, screwDepth = thickness + 10);
        } else {
            translate([0, 0, -1])
            screw_hole(screwType = screwType, depth = thickness + 12);
        }

        // Hex nut pocket
        if (nutOnBack) {
            translate([0, 0, -thickness])
            rotate([180, 0, 0])
            hex_nut_pocket(screwType = screwType, openSide = true, backSpace = 5);
        }
    }
}

// ============================================================================
// SCREW PATTERN MODULES
// ============================================================================

/*
 * Create a rectangular pattern of screw holes
 */
module screw_pattern_rect(
    screwType = "M5",
    width = 80,
    height = 40,
    depth = 10,
    countersunk = false
) {
    positions = [
        [0, 0],
        [width, 0],
        [0, height],
        [width, height]
    ];

    for (pos = positions) {
        translate([pos[0], pos[1], 0])
        if (countersunk) {
            countersunk_hole(screwType = screwType, screwDepth = depth);
        } else {
            screw_hole(screwType = screwType, depth = depth);
        }
    }
}

// ============================================================================
// EXAMPLE/TEST MODULE
// ============================================================================

module screw_example() {
    // M5 clearance hole
    color("Red", 0.5)
    translate([0, 0, 0])
    screw_hole(screwType = "M5", depth = 15);

    // Countersunk hole
    color("Orange", 0.5)
    translate([15, 0, 5])
    countersunk_hole(screwType = "M4");

    // Hex nut pocket
    color("Yellow", 0.5)
    translate([30, 0, 0])
    hex_nut_pocket(screwType = "M5", openSide = true);

    // Hex nut visual
    translate([30, 0, 0])
    hex_nut_visual(screwType = "M5");

    // Block with through hole and nut pocket
    color("LightGray")
    translate([50, -15, -20])
    difference() {
        cube([30, 30, 20]);
        translate([15, 15, 20])
        screw_with_nut(screwType = "M4", thickness = 20, countersunk = true);
    }
}

// Uncomment to preview:
// screw_example();
