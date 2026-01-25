/*
 * Rack Scad - Angle Bracket Rack Mount Type
 * Based on rackstack-main angle-bracket implementation
 *
 * Simple L-shaped brackets derived from the enclosed box system.
 * Use for equipment that has its own mounting holes.
 */

include <common.scad>
use <enclosed_box.scad>

// ============================================================================
// CONFIGURATION
// ============================================================================

DEFAULT_BRACKET_THICKNESS = 3;
DEFAULT_BRACKET_DEPTH = 120;
DEFAULT_BRACKET_WIDTH = 160;

// ============================================================================
// ANGLE BRACKETS SYSTEM
// Based on rackstack-main angle-bracket/entry.scad
// ============================================================================

/*
 * Create a pair of angle brackets
 *
 * Parameters:
 *   boxWidth - Width between the brackets (equipment width)
 *   boxDepth - Depth of the brackets
 *   u - Rack units
 *   thickness - Bracket material thickness
 *   sideVent - Add ventilation slots
 *   visualize - Show equipment outline
 *   splitForPrint - Separate parts for printing
 */
module angle_brackets(
    boxWidth = DEFAULT_BRACKET_WIDTH,
    boxDepth = DEFAULT_BRACKET_DEPTH,
    u = 3,
    thickness = DEFAULT_BRACKET_THICKNESS,
    sideVent = false,
    visualize = false,
    splitForPrint = false
) {
    // Calculate bracket height based on u (matching rackstack: 10*u - 2*thickness)
    // Note: uDiff = screwDiff = 10 in default profile
    bracketHeight = uDiff * u - 2 * thickness;

    // Left bracket
    color("SteelBlue")
    side_support_rail_base(
        top = false,
        defaultThickness = thickness,
        railSideThickness = thickness,
        supportedZ = bracketHeight,
        supportedY = boxDepth,
        supportedX = boxWidth,
        sideVent = sideVent
    );

    // Right bracket position
    // When visualizing: position at actual box width
    // When split for print: position at 30mm (matching rackstack)
    rightRailTrans = visualize
        ? [boxWidth, 0, 0]
        : splitForPrint
            ? [30, 0, 0]
            : [boxWidth, 0, 0];

    color("SteelBlue")
    translate(rightRailTrans)
    mirror([1, 0, 0])
    side_support_rail_base(
        top = false,
        defaultThickness = thickness,
        railSideThickness = thickness,
        supportedZ = bracketHeight,
        supportedY = boxDepth,
        supportedX = boxWidth,
        sideVent = sideVent
    );

    // Show equipment outline when visualizing
    if (visualize) {
        %translate([thickness, 0, thickness])
        cube([boxWidth - 2 * thickness, boxDepth, bracketHeight]);
    }
}

// ============================================================================
// SINGLE ANGLE BRACKET
// ============================================================================

/*
 * Create a single angle bracket with customizable features
 *
 * Parameters:
 *   depth - Length of the bracket
 *   height - Vertical height
 *   thickness - Material thickness
 *   u - Rack units (overrides height if specified)
 *   sideVent - Add ventilation slots
 *   mountingHoles - Add holes for equipment mounting
 *   mountingHoleSpacing - Spacing between mounting holes
 *   mountingHoleType - Screw type for mounting holes
 */
module angle_bracket_single(
    depth = DEFAULT_BRACKET_DEPTH,
    height = 0,
    thickness = DEFAULT_BRACKET_THICKNESS,
    u = 2,
    sideVent = false,
    mountingHoles = false,
    mountingHoleSpacing = 25,
    mountingHoleType = "M3"
) {
    // Use u-based height if height not specified
    actualHeight = height > 0 ? height : uDiff * u - 2 * thickness;

    difference() {
        side_support_rail_base(
            top = false,
            defaultThickness = thickness,
            railSideThickness = thickness,
            supportedZ = actualHeight,
            supportedY = depth,
            supportedX = 100,  // Doesn't matter for single bracket
            sideVent = sideVent
        );

        // Equipment mounting holes
        if (mountingHoles) {
            _bracket_mounting_holes(depth, actualHeight, thickness, mountingHoleSpacing, mountingHoleType);
        }
    }
}

// Internal: Add mounting holes pattern
module _bracket_mounting_holes(depth, height, thickness, spacing, screwType) {
    holeR = screw_radius_slacked(screwType);
    margin = 15;

    // Holes along depth on bottom flange
    for (y = [margin : spacing : depth - margin]) {
        translate([sideRailBaseWidth / 2, y, -eps])
        cylinder(r = holeR, h = thickness + 2 * eps, $fn = 32);
    }
}

// ============================================================================
// ADJUSTABLE ANGLE BRACKET
// With slotted holes for position adjustment
// ============================================================================

/*
 * Create an angle bracket with slotted mounting holes
 */
module adjustable_angle_bracket(
    depth = 100,
    height = 40,
    thickness = 3,
    u = 2,
    slotLength = 15,
    slotWidth = 4
) {
    actualHeight = height > 0 ? height : uDiff * u - 2 * thickness;

    difference() {
        angle_bracket_single(
            depth = depth,
            height = actualHeight,
            thickness = thickness,
            u = u,
            sideVent = false,
            mountingHoles = false
        );

        // Slotted holes in bottom flange
        _add_slotted_holes(depth, thickness, slotLength, slotWidth);
    }
}

// Internal: Add slotted holes
module _add_slotted_holes(depth, thickness, slotLength, slotWidth) {
    slotSpacing = 30;
    margin = 15;

    for (y = [margin : slotSpacing : depth - margin]) {
        translate([sideRailBaseWidth / 2, y, -eps])
        hull() {
            translate([-slotLength / 2, 0, 0])
            cylinder(r = slotWidth / 2, h = thickness + 2 * eps, $fn = 32);
            translate([slotLength / 2, 0, 0])
            cylinder(r = slotWidth / 2, h = thickness + 2 * eps, $fn = 32);
        }
    }
}

// ============================================================================
// UNIVERSAL MOUNTING PLATE
// Flat plate with grid of mounting holes
// ============================================================================

/*
 * Create a universal mounting plate with hole grid
 */
module universal_mount_plate(
    width = 100,
    depth = 80,
    thickness = 3,
    holeSpacing = 20,
    holeType = "M3",
    margin = 10
) {
    holeR = screw_radius_slacked(holeType);

    difference() {
        // Base plate with rounded corners
        minkowski() {
            translate([2, 2, 0])
            cube([width - 4, depth - 4, thickness]);
            cylinder(r = 2, h = eps, $fn = 32);
        }

        // Grid of holes
        for (x = [margin : holeSpacing : width - margin]) {
            for (y = [margin : holeSpacing : depth - margin]) {
                translate([x, y, -eps])
                cylinder(r = holeR, h = thickness + 2 * eps, $fn = 32);
            }
        }
    }
}

// ============================================================================
// EXAMPLE
// ============================================================================

module angle_bracket_example() {
    // Assembled bracket pair with visualization
    angle_brackets(
        boxWidth = 140,
        boxDepth = 100,
        u = 3,
        visualize = true,
        splitForPrint = false
    );

    // Split for printing
    translate([0, 140, 0])
    angle_brackets(
        boxWidth = 140,
        boxDepth = 100,
        u = 3,
        splitForPrint = true
    );

    // Adjustable bracket
    color("Coral")
    translate([200, 0, 0])
    adjustable_angle_bracket(
        depth = 100,
        u = 2
    );

    // Universal mount plate
    color("Gold")
    translate([200, 130, 0])
    universal_mount_plate(
        width = 100,
        depth = 80
    );
}

// Uncomment to preview:
// angle_bracket_example();
