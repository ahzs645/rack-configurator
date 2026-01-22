/*
 * Rack Scad - Magnetic Snap Points Module
 * Creates pockets for neodymium magnets for snap-fit assembly
 *
 * Magnets provide strong, repeatable alignment without hardware.
 * Ideal for removable panels and quick-release components.
 */

include <print_config.scad>

// ============================================================================
// MAGNET CONFIGURATION
// Standard 6mm x 2mm neodymium disc magnets (common and inexpensive)
// ============================================================================

// Standard small disc magnet (6mm diameter, 2mm height)
MAGNET_6x2_RADIUS = 3;
MAGNET_6x2_HEIGHT = 2;

// Medium disc magnet (8mm diameter, 3mm height)
MAGNET_8x3_RADIUS = 4;
MAGNET_8x3_HEIGHT = 3;

// Large disc magnet (10mm diameter, 3mm height)
MAGNET_10x3_RADIUS = 5;
MAGNET_10x3_HEIGHT = 3;

// Extra large disc magnet (12mm diameter, 5mm height)
MAGNET_12x5_RADIUS = 6;
MAGNET_12x5_HEIGHT = 5;

// Slack values for magnet pockets
magnetRadiusSlack = 0.1;    // Press-fit, should be snug
magnetHeightSlack = 0.05;   // Slight clearance for flush mount

// ============================================================================
// MAGNET POCKET MODULES
// ============================================================================

/*
 * Create a pocket for a disc magnet
 * Use as a negative volume (difference)
 *
 * Parameters:
 *   radius - Magnet radius
 *   height - Magnet height
 *   slack - Additional clearance (optional)
 *   bridge - Add bridge layer for printing over pocket
 *   bridgeLayers - Number of bridge layers
 */
module magnet_pocket(
    radius = MAGNET_6x2_RADIUS,
    height = MAGNET_6x2_HEIGHT,
    slack = true,
    bridge = false,
    bridgeLayers = 2
) {
    slackedRadius = slack ? radius + magnetRadiusSlack : radius;
    slackedHeight = slack ? height + magnetHeightSlack : height;

    union() {
        // Main pocket
        cylinder(r = slackedRadius, h = slackedHeight, $fn = 64);

        // Optional bridge layers for printing
        if (bridge) {
            for (i = [1:bridgeLayers]) {
                translate([0, 0, slackedHeight + (i - 1) * defaultLayerHeight])
                cylinder(r = slackedRadius * 0.8, h = defaultLayerHeight, $fn = 64);
            }
        }
    }
}

/*
 * Create a 6x2mm magnet pocket (most common size)
 */
module magnet_pocket_6x2(slack = true, bridge = false) {
    magnet_pocket(
        radius = MAGNET_6x2_RADIUS,
        height = MAGNET_6x2_HEIGHT,
        slack = slack,
        bridge = bridge
    );
}

/*
 * Create an 8x3mm magnet pocket
 */
module magnet_pocket_8x3(slack = true, bridge = false) {
    magnet_pocket(
        radius = MAGNET_8x3_RADIUS,
        height = MAGNET_8x3_HEIGHT,
        slack = slack,
        bridge = bridge
    );
}

/*
 * Create a 10x3mm magnet pocket
 */
module magnet_pocket_10x3(slack = true, bridge = false) {
    magnet_pocket(
        radius = MAGNET_10x3_RADIUS,
        height = MAGNET_10x3_HEIGHT,
        slack = slack,
        bridge = bridge
    );
}

/*
 * Create a 12x5mm magnet pocket
 */
module magnet_pocket_12x5(slack = true, bridge = false) {
    magnet_pocket(
        radius = MAGNET_12x5_RADIUS,
        height = MAGNET_12x5_HEIGHT,
        slack = slack,
        bridge = bridge
    );
}

// ============================================================================
// MAGNET ARRAY MODULES
// ============================================================================

/*
 * Create a linear array of magnet pockets
 *
 * Parameters:
 *   count - Number of magnets
 *   spacing - Distance between magnet centers
 *   radius - Magnet radius
 *   height - Magnet height
 *   centered - Center the array on origin
 */
module magnet_array_linear(
    count = 4,
    spacing = 20,
    radius = MAGNET_6x2_RADIUS,
    height = MAGNET_6x2_HEIGHT,
    centered = true
) {
    offset = centered ? -(count - 1) * spacing / 2 : 0;

    for (i = [0:count - 1]) {
        translate([offset + i * spacing, 0, 0])
        magnet_pocket(radius, height);
    }
}

/*
 * Create a rectangular grid of magnet pockets
 *
 * Parameters:
 *   countX - Number of magnets in X direction
 *   countY - Number of magnets in Y direction
 *   spacingX - Spacing in X direction
 *   spacingY - Spacing in Y direction
 *   radius - Magnet radius
 *   height - Magnet height
 *   centered - Center the array on origin
 */
module magnet_array_grid(
    countX = 2,
    countY = 2,
    spacingX = 40,
    spacingY = 40,
    radius = MAGNET_6x2_RADIUS,
    height = MAGNET_6x2_HEIGHT,
    centered = true
) {
    offsetX = centered ? -(countX - 1) * spacingX / 2 : 0;
    offsetY = centered ? -(countY - 1) * spacingY / 2 : 0;

    for (i = [0:countX - 1]) {
        for (j = [0:countY - 1]) {
            translate([offsetX + i * spacingX, offsetY + j * spacingY, 0])
            magnet_pocket(radius, height);
        }
    }
}

/*
 * Create corner magnet pockets for a rectangular panel
 *
 * Parameters:
 *   width - Panel width
 *   height - Panel height
 *   inset - Distance from edge to magnet center
 *   magnetRadius - Magnet radius
 *   magnetHeight - Magnet height
 */
module magnet_corners(
    width = 100,
    height = 60,
    inset = 10,
    magnetRadius = MAGNET_6x2_RADIUS,
    magnetHeight = MAGNET_6x2_HEIGHT
) {
    positions = [
        [inset, inset],
        [width - inset, inset],
        [inset, height - inset],
        [width - inset, height - inset]
    ];

    for (pos = positions) {
        translate([pos[0], pos[1], 0])
        magnet_pocket(magnetRadius, magnetHeight);
    }
}

// ============================================================================
// MAGNET BOSS MODULES (Raised mounting points)
// ============================================================================

/*
 * Create a raised boss with magnet pocket
 * Useful when you need the magnet at a specific height
 *
 * Parameters:
 *   bossRadius - Radius of the boss
 *   bossHeight - Height of the boss (total)
 *   magnetRadius - Magnet radius
 *   magnetHeight - Magnet height
 *   magnetDepth - How deep the magnet sits from top of boss
 */
module magnet_boss(
    bossRadius = 5,
    bossHeight = 8,
    magnetRadius = MAGNET_6x2_RADIUS,
    magnetHeight = MAGNET_6x2_HEIGHT,
    magnetDepth = 0.5  // Leave 0.5mm between magnet and surface
) {
    difference() {
        // Boss cylinder
        cylinder(r = bossRadius, h = bossHeight, $fn = 64);

        // Magnet pocket from top
        translate([0, 0, bossHeight - magnetHeight - magnetDepth])
        magnet_pocket(magnetRadius, magnetHeight, bridge = false);
    }
}

// ============================================================================
// EXAMPLE/TEST MODULE
// ============================================================================

module magnet_example() {
    // Single pocket (negative volume visualization)
    color("Red", 0.5)
    translate([0, 0, 0])
    magnet_pocket_6x2();

    // Magnet boss
    color("SteelBlue")
    translate([20, 0, 0])
    magnet_boss();

    // Panel with corner magnets
    color("LightGray")
    translate([0, 20, 0])
    difference() {
        cube([60, 40, 4]);
        translate([0, 0, 4 - MAGNET_6x2_HEIGHT])
        magnet_corners(width = 60, height = 40, inset = 8);
    }
}

// Uncomment to preview:
// magnet_example();
