/*
 * Rack Scad - Dovetail Snap Connector Module
 * Creates parametric dovetail joints for snap-fit assembly
 *
 * Dovetails are trapezoidal connectors that slide together and lock.
 * They're excellent for tool-less assembly of rack components.
 */

include <print_config.scad>

// ============================================================================
// DOVETAIL CONFIGURATION
// ============================================================================

// Default dovetail dimensions
DEFAULT_DOVETAIL_TOP_WIDTH = 8;
DEFAULT_DOVETAIL_BOTTOM_WIDTH = 12;
DEFAULT_DOVETAIL_HEIGHT = 6;
DEFAULT_DOVETAIL_LENGTH = 20;

// ============================================================================
// MAIN DOVETAIL MODULE
// ============================================================================

/*
 * Create a dovetail connector (male/plug side)
 * Centered on Z axis
 *
 * Parameters:
 *   topWidth - Width at the top (narrow end) of the trapezoid
 *   bottomWidth - Width at the bottom (wide end) of the trapezoid
 *   height - Height of the dovetail profile
 *   length - Length/depth of the dovetail extrusion
 *   headExtension - Extra length at the top of the profile
 *   baseExtension - Extra length at the bottom of the profile
 *   frontFaceLength - Length of tapered front face
 *   frontFaceScale - Scale factor for front face taper (0-1)
 *   backFaceLength - Length of tapered back face
 *   backFaceScale - Scale factor for back face taper (0-1)
 */
module dovetail(
    topWidth = DEFAULT_DOVETAIL_TOP_WIDTH,
    bottomWidth = DEFAULT_DOVETAIL_BOTTOM_WIDTH,
    height = DEFAULT_DOVETAIL_HEIGHT,
    length = DEFAULT_DOVETAIL_LENGTH,
    headExtension = 0,
    baseExtension = 0,
    frontFaceLength = 0,
    frontFaceScale = 0,
    backFaceLength = 0,
    backFaceScale = 0
) {
    // Main body (middle section)
    translate([0, 0, frontFaceLength])
    linear_extrude(length - (frontFaceLength + backFaceLength))
    dovetail_face(topWidth, bottomWidth, height, headExtension, baseExtension);

    // Front tapered face
    if (frontFaceLength > 0) {
        translate([0, 0, frontFaceLength])
        mirror([0, 0, 1])
        linear_extrude(frontFaceLength, scale = [frontFaceScale, frontFaceScale])
        dovetail_face(topWidth, bottomWidth, height, headExtension, baseExtension);
    }

    // Back tapered face
    if (backFaceLength > 0) {
        translate([0, 0, length - backFaceLength])
        linear_extrude(backFaceLength, scale = [backFaceScale, 1])
        dovetail_face(topWidth, bottomWidth, height, headExtension, baseExtension);
    }
}

/*
 * Create a dovetail socket (female/receptacle side)
 * Use this as a negative volume to cut the socket
 *
 * Parameters:
 *   Same as dovetail() plus:
 *   slack - Additional clearance for fit (uses dovetailSlack by default)
 */
module dovetail_socket(
    topWidth = DEFAULT_DOVETAIL_TOP_WIDTH,
    bottomWidth = DEFAULT_DOVETAIL_BOTTOM_WIDTH,
    height = DEFAULT_DOVETAIL_HEIGHT,
    length = DEFAULT_DOVETAIL_LENGTH,
    headExtension = 0,
    baseExtension = 0,
    frontFaceLength = 0,
    frontFaceScale = 0,
    backFaceLength = 0,
    backFaceScale = 0,
    slack = dovetailSlack
) {
    // Add slack to dimensions for socket
    dovetail(
        topWidth = topWidth + slack,
        bottomWidth = bottomWidth + slack,
        height = height + slack,
        length = length + slack,
        headExtension = headExtension,
        baseExtension = baseExtension,
        frontFaceLength = frontFaceLength,
        frontFaceScale = frontFaceScale,
        backFaceLength = backFaceLength,
        backFaceScale = backFaceScale
    );
}

/*
 * Create a 2D dovetail face profile
 * Internal module used by dovetail()
 */
module dovetail_face(topWidth, bottomWidth, height, headExtension, baseExtension) {
    union() {
        // Main trapezoidal body
        polygon(points = [
            [-bottomWidth / 2, 0],
            [-topWidth / 2, height],
            [topWidth / 2, height],
            [bottomWidth / 2, 0]
        ]);

        // Base extension (rectangular)
        polygon(points = [
            [-bottomWidth / 2, -baseExtension],
            [-bottomWidth / 2, 0],
            [bottomWidth / 2, 0],
            [bottomWidth / 2, -baseExtension]
        ]);

        // Head extension (rectangular)
        translate([0, height])
        polygon(points = [
            [-topWidth / 2, headExtension],
            [-topWidth / 2, 0],
            [topWidth / 2, 0],
            [topWidth / 2, headExtension]
        ]);
    }
}

// ============================================================================
// SLIDING DOVETAIL (T-SLOT STYLE)
// ============================================================================

/*
 * Create a sliding dovetail rail
 * Used for adjustable mounting positions
 *
 * Parameters:
 *   length - Length of the rail
 *   width - Total width of the rail
 *   height - Height of the rail
 *   dovetailDepth - How deep the dovetail cut is
 */
module dovetail_rail(
    length = 100,
    width = 20,
    height = 8,
    dovetailDepth = 4
) {
    difference() {
        // Base rail
        cube([length, width, height]);

        // Dovetail channel (inverted for female side)
        translate([0, width / 2, height])
        rotate([0, 90, 0])
        linear_extrude(length + 0.1)
        dovetail_face(
            topWidth = width * 0.4,
            bottomWidth = width * 0.6,
            height = dovetailDepth,
            headExtension = 0,
            baseExtension = 0
        );
    }
}

/*
 * Create a sliding dovetail block that fits in the rail
 *
 * Parameters:
 *   length - Length of the block
 *   width - Width of the block (should match rail width)
 *   height - Height of the block above rail
 *   dovetailDepth - Depth of dovetail (should match rail)
 */
module dovetail_slider(
    length = 20,
    width = 20,
    height = 10,
    dovetailDepth = 4
) {
    slackedWidth = width - 2 * dovetailSlack;

    union() {
        // Top block
        translate([0, 0, dovetailDepth])
        cube([length, slackedWidth, height]);

        // Dovetail key
        translate([0, slackedWidth / 2, dovetailDepth])
        rotate([0, 90, 0])
        linear_extrude(length)
        dovetail_face(
            topWidth = slackedWidth * 0.4 - dovetailSlack,
            bottomWidth = slackedWidth * 0.6 - dovetailSlack,
            height = dovetailDepth - zSlack,
            headExtension = 0,
            baseExtension = 0
        );
    }
}

// ============================================================================
// EXAMPLE/TEST MODULE
// ============================================================================

module dovetail_example() {
    // Male dovetail
    color("SteelBlue")
    dovetail(
        topWidth = 8,
        bottomWidth = 12,
        height = 6,
        length = 30,
        headExtension = 2,
        baseExtension = 2,
        frontFaceLength = 3,
        frontFaceScale = 0.5
    );

    // Female socket (offset for visibility)
    translate([20, 0, 0])
    color("Coral")
    difference() {
        cube([20, 20, 30], center = true);
        translate([0, 0, -5])
        dovetail_socket(
            topWidth = 8,
            bottomWidth = 12,
            height = 6,
            length = 35
        );
    }
}

// Uncomment to preview:
// dovetail_example();
