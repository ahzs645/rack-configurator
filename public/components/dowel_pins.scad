/*
 * Rack Scad - Dowel Pin Locating Module
 * Creates pin/socket pairs for precise alignment and assembly
 *
 * Dowel pins provide mechanical alignment between mating parts.
 * Can use standard dowel pins, 3D printed pins, or filament pieces.
 */

include <print_config.scad>

// ============================================================================
// DOWEL PIN CONFIGURATION
// Standard dowel pin sizes
// ============================================================================

// 3mm dowel pin (common, fits well with M3 holes)
DOWEL_3MM_RADIUS = 1.5;
DOWEL_3MM_HEIGHT = 10;

// 4mm dowel pin
DOWEL_4MM_RADIUS = 2.0;
DOWEL_4MM_HEIGHT = 12;

// 5mm dowel pin
DOWEL_5MM_RADIUS = 2.5;
DOWEL_5MM_HEIGHT = 15;

// 1.75mm filament pin (use leftover 3D printer filament)
FILAMENT_175_RADIUS = 0.875;
FILAMENT_175_HEIGHT = 8;

// 2.85mm filament pin (for 3mm filament printers)
FILAMENT_285_RADIUS = 1.425;
FILAMENT_285_HEIGHT = 10;

// Slack values for dowel pins
dowelPinRadiusSlack = radiusXYSlack;  // Loose enough to insert
dowelSocketRadiusSlack = 0.05;        // Tighter for socket

// ============================================================================
// DOWEL PIN MODULES (MALE SIDE)
// ============================================================================

/*
 * Create a dowel pin (male side)
 * This is printed as part of the model
 *
 * Parameters:
 *   radius - Pin radius
 *   height - Pin height
 *   chamfer - Add chamfer to tip for easier insertion
 *   chamferHeight - Height of the chamfer
 */
module dowel_pin(
    radius = DOWEL_3MM_RADIUS,
    height = DOWEL_3MM_HEIGHT,
    chamfer = true,
    chamferHeight = 1
) {
    if (chamfer) {
        union() {
            // Main pin body
            cylinder(r = radius, h = height - chamferHeight, $fn = 32);

            // Chamfered tip
            translate([0, 0, height - chamferHeight])
            cylinder(r1 = radius, r2 = radius * 0.6, h = chamferHeight, $fn = 32);
        }
    } else {
        cylinder(r = radius, h = height, $fn = 32);
    }
}

/*
 * Create a 3mm dowel pin
 */
module dowel_pin_3mm(chamfer = true) {
    dowel_pin(
        radius = DOWEL_3MM_RADIUS,
        height = DOWEL_3MM_HEIGHT,
        chamfer = chamfer
    );
}

/*
 * Create a filament pin (1.75mm)
 */
module filament_pin_175(chamfer = true) {
    dowel_pin(
        radius = FILAMENT_175_RADIUS,
        height = FILAMENT_175_HEIGHT,
        chamfer = chamfer
    );
}

// ============================================================================
// DOWEL SOCKET MODULES (FEMALE SIDE)
// ============================================================================

/*
 * Create a dowel socket (female side)
 * Use as a negative volume (difference)
 *
 * Parameters:
 *   radius - Nominal pin radius (slack will be added)
 *   depth - Socket depth
 *   throughHole - Make a through hole instead of blind hole
 *   slack - Additional clearance
 */
module dowel_socket(
    radius = DOWEL_3MM_RADIUS,
    depth = DOWEL_3MM_HEIGHT / 2,
    throughHole = false,
    slack = dowelPinRadiusSlack
) {
    slackedRadius = radius + slack;

    if (throughHole) {
        cylinder(r = slackedRadius, h = depth + 10, center = true, $fn = 32);
    } else {
        cylinder(r = slackedRadius, h = depth, $fn = 32);
    }
}

/*
 * Create a 3mm dowel socket
 */
module dowel_socket_3mm(depth = 6, throughHole = false) {
    dowel_socket(
        radius = DOWEL_3MM_RADIUS,
        depth = depth,
        throughHole = throughHole
    );
}

/*
 * Create a 1.75mm filament socket
 */
module filament_socket_175(depth = 5, throughHole = false) {
    dowel_socket(
        radius = FILAMENT_175_RADIUS,
        depth = depth,
        throughHole = throughHole
    );
}

// ============================================================================
// PIN/SOCKET PAIR MODULES
// For matching mating surfaces
// ============================================================================

/*
 * Create matching pin/socket pair at corners of a rectangle
 * Call with part = "pins" or part = "sockets"
 *
 * Parameters:
 *   width - Rectangle width
 *   height - Rectangle height (depth in Y)
 *   inset - Distance from edge to pin center
 *   pinRadius - Pin radius
 *   pinHeight - Pin height
 *   part - "pins" or "sockets"
 */
module alignment_pair_corners(
    width = 100,
    height = 60,
    inset = 8,
    pinRadius = DOWEL_3MM_RADIUS,
    pinHeight = DOWEL_3MM_HEIGHT,
    part = "pins"
) {
    positions = [
        [inset, inset],
        [width - inset, inset],
        [inset, height - inset],
        [width - inset, height - inset]
    ];

    if (part == "pins") {
        for (pos = positions) {
            translate([pos[0], pos[1], 0])
            dowel_pin(radius = pinRadius, height = pinHeight);
        }
    } else {
        for (pos = positions) {
            translate([pos[0], pos[1], 0])
            dowel_socket(radius = pinRadius, depth = pinHeight / 2 + 2);
        }
    }
}

/*
 * Create matching pin/socket pair at two diagonal corners
 * Prevents parts from being assembled incorrectly
 *
 * Parameters:
 *   width - Rectangle width
 *   height - Rectangle height
 *   inset - Distance from edge to pin center
 *   pinRadius - Pin radius
 *   pinHeight - Pin height
 *   part - "pins" or "sockets"
 */
module alignment_pair_diagonal(
    width = 100,
    height = 60,
    inset = 8,
    pinRadius = DOWEL_3MM_RADIUS,
    pinHeight = DOWEL_3MM_HEIGHT,
    part = "pins"
) {
    // Only two diagonal corners for orientation keying
    positions = [
        [inset, inset],
        [width - inset, height - inset]
    ];

    if (part == "pins") {
        for (pos = positions) {
            translate([pos[0], pos[1], 0])
            dowel_pin(radius = pinRadius, height = pinHeight);
        }
    } else {
        for (pos = positions) {
            translate([pos[0], pos[1], 0])
            dowel_socket(radius = pinRadius, depth = pinHeight / 2 + 2);
        }
    }
}

// ============================================================================
// INTEGRATED PIN BOSS (Pin on a raised platform)
// ============================================================================

/*
 * Create a raised boss with a dowel pin on top
 * Useful for alignment on uneven surfaces
 *
 * Parameters:
 *   bossRadius - Radius of the boss base
 *   bossHeight - Height of the boss
 *   pinRadius - Pin radius
 *   pinHeight - Pin height extending above boss
 */
module dowel_pin_boss(
    bossRadius = 4,
    bossHeight = 3,
    pinRadius = DOWEL_3MM_RADIUS,
    pinHeight = 6
) {
    union() {
        // Boss base
        cylinder(r = bossRadius, h = bossHeight, $fn = 64);

        // Pin
        translate([0, 0, bossHeight])
        dowel_pin(radius = pinRadius, height = pinHeight);
    }
}

/*
 * Create a recessed socket in a boss
 */
module dowel_socket_boss(
    bossRadius = 4,
    bossHeight = 3,
    pinRadius = DOWEL_3MM_RADIUS,
    socketDepth = 8
) {
    difference() {
        // Boss base
        cylinder(r = bossRadius, h = bossHeight, $fn = 64);

        // Socket going through and below
        translate([0, 0, bossHeight - socketDepth])
        dowel_socket(radius = pinRadius, depth = socketDepth + 1);
    }
}

// ============================================================================
// EXAMPLE/TEST MODULE
// ============================================================================

module dowel_pin_example() {
    // Single pin
    color("SteelBlue")
    dowel_pin_3mm();

    // Single socket (visualization)
    color("Coral", 0.5)
    translate([15, 0, 0])
    dowel_socket_3mm();

    // Pin boss
    color("LightGray")
    translate([30, 0, 0])
    dowel_pin_boss();

    // Part with corner pins
    color("LightGreen")
    translate([0, 25, 0])
    union() {
        cube([50, 30, 3]);
        translate([0, 0, 3])
        alignment_pair_diagonal(width = 50, height = 30, part = "pins");
    }

    // Mating part with sockets
    color("LightBlue")
    translate([60, 25, 0])
    difference() {
        cube([50, 30, 3]);
        alignment_pair_diagonal(width = 50, height = 30, part = "sockets");
    }
}

// Uncomment to preview:
// dowel_pin_example();
