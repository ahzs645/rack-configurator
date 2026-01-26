/**
 * Rack Scad - Joiners Module
 *
 * Modules for joining separately printed rack faceplate parts using
 * screws and hex nuts. Creates a thin vertical wall at the faceplate
 * edge that allows two sections to be bolted together face-to-face.
 *
 * Design: Thin vertical plate with rounded top, screw holes in triangle pattern
 * - Wall sits flush at the joint edge
 * - Extends inward (into rack) from faceplate
 * - Two walls bolt together face-to-face
 *
 * Supported screw types: M3, M4, M5, M6 (metric) or 4-40, 6-32, 8-32, 10-24, 1/4-20 (imperial)
 */

use <screws.scad>

// ============================================================================
// Constants
// ============================================================================

// Default screw type
_DEFAULT_SCREW_TYPE = "M5";

// Legacy M5 constants (for backwards compatibility)
M5_CLEARANCE_HOLE = 5.5;
M5_HEX_NUT_AF = 8.0;
M5_HEX_NUT_POCKET_AF = 8.4;
M5_HEX_NUT_POCKET_DEPTH = 4.5;

// Get clearance hole diameter for screw type
function joiner_clearance_dia(screw_type) =
    (screw_type == "M2") ? 2.4 :
    (screw_type == "M3") ? 3.4 :
    (screw_type == "M4") ? 4.5 :
    (screw_type == "M5") ? 5.5 :
    (screw_type == "M6") ? 6.6 :
    (screw_type == "4-40") ? 3.2 :
    (screw_type == "6-32") ? 4.0 :
    (screw_type == "8-32") ? 4.6 :
    (screw_type == "10-24" || screw_type == "10-32") ? 5.3 :
    (screw_type == "1/4-20") ? 7.0 :
    5.5;  // Default M5

// Get hex nut across flats for screw type (with clearance)
function joiner_nut_af(screw_type) =
    (screw_type == "M2") ? 4.4 :
    (screw_type == "M3") ? 6.0 :
    (screw_type == "M4") ? 7.5 :
    (screw_type == "M5") ? 8.4 :
    (screw_type == "M6") ? 10.5 :
    (screw_type == "4-40") ? 6.8 :
    (screw_type == "6-32") ? 8.4 :
    (screw_type == "8-32") ? 9.2 :
    (screw_type == "10-24" || screw_type == "10-32") ? 10.0 :
    (screw_type == "1/4-20") ? 11.6 :
    8.4;  // Default M5

// Get default nut pocket depth for screw type
function joiner_default_depth(screw_type) =
    (screw_type == "M2") ? 2.0 :
    (screw_type == "M3") ? 2.8 :
    (screw_type == "M4") ? 3.6 :
    (screw_type == "M5") ? 4.5 :
    (screw_type == "M6") ? 5.5 :
    (screw_type == "4-40") ? 2.8 :
    (screw_type == "6-32") ? 3.2 :
    (screw_type == "8-32") ? 3.6 :
    (screw_type == "10-24" || screw_type == "10-32") ? 3.6 :
    (screw_type == "1/4-20") ? 6.0 :
    4.5;  // Default M5

// Default captive nut floor thickness (thin layer covering the nut pocket on outer face)
// Set to 0 for open pocket, > 0 for captive nut
_DEFAULT_NUT_FLOOR = 0;

// Minimum inner floor thickness - the material the nut pulls against when bolt is tightened
// This floor is on the mating surface side, between hex pocket and joint face
_MIN_INNER_FLOOR = 1.0;

// EIA-310 standard
_EIA_UNIT_HEIGHT = 44.45;      // 1U = 44.45mm
_EIA_PANEL_HEIGHT = 43.66;     // Panel height (1U minus clearance)

// Wall/plate dimensions - THIN profile
_WALL_THICKNESS = 4;           // Thickness of the vertical wall
_WALL_HEIGHT = 15;             // Height of wall above faceplate
_WALL_ROUNDING = 1.5;          // Top edge rounding
_FACEPLATE_THICKNESS = 4;      // Default faceplate thickness

// Triangle screw pattern
_SCREW_TOP_SPREAD = 12;        // Horizontal spread of top 2 screws
_SCREW_TOP_HEIGHT = 10;        // Height of top screws from faceplate
_SCREW_BOTTOM_HEIGHT = 4;      // Height of bottom screw from faceplate


// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate screw positions for triangle pattern (2 top, 1 bottom)
 * Returns array of [y_position, z_height_above_faceplate]
 */
function get_triangle_screw_positions(unit_height, top_spread = _SCREW_TOP_SPREAD) =
    let(
        panel_height = unit_height * _EIA_PANEL_HEIGHT,
        groups = unit_height,
        group_height = panel_height / groups,
        positions = [
            for (g = [0 : groups - 1])
                let(
                    group_center_y = -panel_height/2 + group_height/2 + (g * group_height)
                )
                each [
                    // Two top screws (spread apart)
                    [group_center_y - top_spread/2, _SCREW_TOP_HEIGHT],
                    [group_center_y + top_spread/2, _SCREW_TOP_HEIGHT],
                    // One bottom screw (centered)
                    [group_center_y, _SCREW_BOTTOM_HEIGHT]
                ]
        ]
    )
    positions;


// ============================================================================
// 2D Helper Shapes
// ============================================================================

/**
 * 2D hexagon for hex nut pocket
 */
module hexagon_2d(af) {
    circle(d = af / cos(30), $fn = 6);
}

/**
 * 2D profile of the wall with rounded top
 */
module wall_profile_2d(height, thickness, rounding) {
    hull() {
        // Bottom (sharp corners at faceplate)
        square([thickness, 0.1]);

        // Top with rounded corners
        translate([rounding, height - rounding])
            circle(r = rounding, $fn = 32);
        translate([thickness - rounding, height - rounding])
            circle(r = rounding, $fn = 32);
    }
}


// ============================================================================
// Main Modules
// ============================================================================

/**
 * Creates the thin vertical wall that forms the joint
 */
module joiner_wall(
    unit_height = 1,
    wall_thickness = _WALL_THICKNESS,
    wall_height = _WALL_HEIGHT,
    rounding = _WALL_ROUNDING,
    fn = 32
) {
    panel_height = unit_height * _EIA_PANEL_HEIGHT;

    // Extrude the wall profile along Y axis
    translate([0, -panel_height/2, 0])
        rotate([90, 0, 90])
            linear_extrude(height = wall_thickness)
                // Wall profile: rectangle with rounded top
                hull() {
                    square([panel_height, 0.1]);
                    translate([rounding, wall_height - rounding])
                        circle(r = rounding, $fn = fn);
                    translate([panel_height - rounding, wall_height - rounding])
                        circle(r = rounding, $fn = fn);
                }
}


/**
 * Creates the LEFT side joiner
 * Thin wall at joint edge
 * @param nut_side - "left" for nut pockets on this side, "right" for clearance holes only
 * @param nut_pocket_depth - depth of the hex nut pocket (0 = auto based on screw type)
 * @param screw_type - screw size: "M3", "M4", "M5", "M6", "4-40", "6-32", "8-32", "10-24", "1/4-20"
 * @param nut_floor - thickness of floor covering nut pocket (0 = open pocket, >0 = captive nut)
 */
module faceplate_joiner_left(
    unit_height = 1,
    faceplate_width = 60,
    faceplate_thickness = _FACEPLATE_THICKNESS,
    wall_thickness = _WALL_THICKNESS,
    wall_height = _WALL_HEIGHT,
    rounding = _WALL_ROUNDING,
    include_faceplate = true,
    nut_side = "right",
    nut_pocket_depth = 0,
    screw_type = "M5",
    nut_floor = _DEFAULT_NUT_FLOOR,
    fn = 32
) {
    panel_height = unit_height * _EIA_PANEL_HEIGHT;
    screw_positions = get_triangle_screw_positions(unit_height);
    has_nut = (nut_side == "left");

    // Get dimensions based on screw type
    clearance_dia = joiner_clearance_dia(screw_type);
    nut_af = joiner_nut_af(screw_type);
    pocket_depth = (nut_pocket_depth > 0) ? nut_pocket_depth : joiner_default_depth(screw_type);

    difference() {
        union() {
            // Faceplate section
            if (include_faceplate) {
                translate([-faceplate_width, -panel_height/2, 0])
                    cube([faceplate_width, panel_height, faceplate_thickness]);
            }

            // Thin vertical wall at the joint edge (x=0)
            translate([-wall_thickness, 0, faceplate_thickness])
                joiner_wall(
                    unit_height = unit_height,
                    wall_thickness = wall_thickness,
                    wall_height = wall_height,
                    rounding = rounding,
                    fn = fn
                );
        }

        // Screw holes (and nut pockets if nut_side == "left")
        for (pos = screw_positions) {
            y_pos = pos[0];
            z_height = pos[1];
            screw_z = faceplate_thickness + z_height;

            // Through hole for bolt (smaller diameter, goes all the way through)
            translate([-wall_thickness/2, y_pos, screw_z])
                rotate([0, 90, 0])
                    cylinder(h = wall_thickness + 2, d = clearance_dia, center = true, $fn = fn);

            // Hex nut pocket (if this side has nuts)
            if (has_nut) {
                // Two floors:
                // 1. nut_floor (outer) - optional floor on outer face for captive nut
                // 2. inner_floor - mandatory floor on mating face for nut to pull against
                //
                // Limit pocket depth so it doesn't cut through the inner floor
                max_pocket_depth = wall_thickness - nut_floor - _MIN_INNER_FLOOR;
                actual_pocket_depth = min(pocket_depth, max_pocket_depth);

                // Hexagonal pocket for nut
                // Starts at outer face + nut_floor, extends inward but stops before inner floor
                translate([-wall_thickness + nut_floor, y_pos, screw_z])
                    rotate([0, 90, 0])
                        rotate([0, 0, 30])
                            linear_extrude(height = actual_pocket_depth + 0.1)
                                hexagon_2d(nut_af);
            }
        }
    }
}


/**
 * Creates the RIGHT side joiner
 * Thin wall at joint edge
 * @param nut_side - "right" for nut pockets on this side, "left" for clearance holes only
 * @param nut_pocket_depth - depth of the hex nut pocket (0 = auto based on screw type)
 * @param screw_type - screw size: "M3", "M4", "M5", "M6", "4-40", "6-32", "8-32", "10-24", "1/4-20"
 * @param nut_floor - thickness of floor covering nut pocket (0 = open pocket, >0 = captive nut)
 */
module faceplate_joiner_right(
    unit_height = 1,
    faceplate_width = 60,
    faceplate_thickness = _FACEPLATE_THICKNESS,
    wall_thickness = _WALL_THICKNESS,
    wall_height = _WALL_HEIGHT,
    rounding = _WALL_ROUNDING,
    include_faceplate = true,
    nut_side = "right",
    nut_pocket_depth = 0,
    screw_type = "M5",
    nut_floor = _DEFAULT_NUT_FLOOR,
    fn = 32
) {
    panel_height = unit_height * _EIA_PANEL_HEIGHT;
    screw_positions = get_triangle_screw_positions(unit_height);
    has_nut = (nut_side == "right");

    // Get dimensions based on screw type
    clearance_dia = joiner_clearance_dia(screw_type);
    nut_af = joiner_nut_af(screw_type);
    pocket_depth = (nut_pocket_depth > 0) ? nut_pocket_depth : joiner_default_depth(screw_type);

    difference() {
        union() {
            // Faceplate section
            if (include_faceplate) {
                translate([0, -panel_height/2, 0])
                    cube([faceplate_width, panel_height, faceplate_thickness]);
            }

            // Thin vertical wall at the joint edge (x=0)
            translate([0, 0, faceplate_thickness])
                joiner_wall(
                    unit_height = unit_height,
                    wall_thickness = wall_thickness,
                    wall_height = wall_height,
                    rounding = rounding,
                    fn = fn
                );
        }

        // Screw holes (and nut pockets if nut_side == "right")
        for (pos = screw_positions) {
            y_pos = pos[0];
            z_height = pos[1];
            screw_z = faceplate_thickness + z_height;

            // Through hole for bolt (smaller diameter, goes all the way through)
            translate([wall_thickness/2, y_pos, screw_z])
                rotate([0, 90, 0])
                    cylinder(h = wall_thickness + 2, d = clearance_dia, center = true, $fn = fn);

            // Hex nut pocket (if this side has nuts)
            if (has_nut) {
                // Two floors:
                // 1. nut_floor (outer) - optional floor on outer face for captive nut
                // 2. inner_floor - mandatory floor on mating face for nut to pull against
                //
                // Limit pocket depth so it doesn't cut through the inner floor
                max_pocket_depth = wall_thickness - nut_floor - _MIN_INNER_FLOOR;
                actual_pocket_depth = min(pocket_depth, max_pocket_depth);

                // Hexagonal pocket for nut
                // For right side: outer face is at x=wall_thickness
                // Pocket starts inward from outer face, leaving inner floor at x=0
                translate([_MIN_INNER_FLOOR, y_pos, screw_z])
                    rotate([0, 90, 0])
                        rotate([0, 0, 30])
                            linear_extrude(height = actual_pocket_depth + 0.1)
                                hexagon_2d(nut_af);
            }
        }
    }
}


/**
 * Creates both joiners side by side for printing
 * @param nut_side - "left" or "right" to specify which side has the nut pockets
 * @param nut_pocket_depth - depth of the hex nut pocket (0 = auto)
 * @param screw_type - screw size: "M3", "M4", "M5", "M6", etc.
 * @param nut_floor - thickness of floor covering nut pocket (0 = open pocket, >0 = captive nut)
 */
module faceplate_joiner_pair(
    unit_height = 1,
    faceplate_width = 60,
    spacing = 20,
    nut_side = "right",
    nut_pocket_depth = 0,
    screw_type = "M5",
    nut_floor = _DEFAULT_NUT_FLOOR,
    fn = 32
) {
    // Left side
    color("SteelBlue")
        translate([-spacing/2, 0, 0])
            faceplate_joiner_left(
                unit_height = unit_height,
                faceplate_width = faceplate_width,
                include_faceplate = true,
                nut_side = nut_side,
                nut_pocket_depth = nut_pocket_depth,
                screw_type = screw_type,
                nut_floor = nut_floor,
                fn = fn
            );

    // Right side
    color("Coral")
        translate([spacing/2 + faceplate_width, 0, 0])
            faceplate_joiner_right(
                unit_height = unit_height,
                faceplate_width = faceplate_width,
                include_faceplate = true,
                nut_side = nut_side,
                nut_pocket_depth = nut_pocket_depth,
                screw_type = screw_type,
                nut_floor = nut_floor,
                fn = fn
            );
}


/**
 * Creates an assembled view - walls touching face-to-face
 * @param nut_side - "left" or "right" to specify which side has the nut pockets
 * @param nut_pocket_depth - depth of the hex nut pocket (0 = auto based on screw type)
 * @param screw_type - screw size: "M3", "M4", "M5", "M6", "4-40", "6-32", "8-32", "10-24", "1/4-20"
 * @param nut_floor - thickness of floor covering nut pocket (0 = open pocket, >0 = captive nut)
 */
module faceplate_joiner_assembled(
    unit_height = 1,
    faceplate_width = 60,
    explode = 0,
    nut_side = "right",
    nut_pocket_depth = 0,
    screw_type = "M5",
    nut_floor = _DEFAULT_NUT_FLOOR,
    fn = 32
) {
    pocket_depth = (nut_pocket_depth > 0) ? nut_pocket_depth : joiner_default_depth(screw_type);
    // Left side
    color("SteelBlue", 0.8)
        translate([-explode/2, 0, 0])
            faceplate_joiner_left(
                unit_height = unit_height,
                faceplate_width = faceplate_width,
                include_faceplate = true,
                nut_side = nut_side,
                nut_pocket_depth = pocket_depth,
                screw_type = screw_type,
                nut_floor = nut_floor,
                fn = fn
            );

    // Right side
    color("Coral", 0.8)
        translate([explode/2, 0, 0])
            faceplate_joiner_right(
                unit_height = unit_height,
                faceplate_width = faceplate_width,
                include_faceplate = true,
                nut_side = nut_side,
                nut_pocket_depth = pocket_depth,
                screw_type = screw_type,
                nut_floor = nut_floor,
                fn = fn
            );
}


/**
 * Just the wall portion for adding to existing faceplates
 * @param side - "left" or "right" to specify which side wall to create
 * @param nut_side - "left" or "right" to specify which side has the nut pockets
 * @param nut_pocket_depth - depth of the hex nut pocket (0 = auto based on screw type)
 * @param screw_type - screw size: "M3", "M4", "M5", "M6", "4-40", "6-32", "8-32", "10-24", "1/4-20"
 * @param nut_floor - thickness of floor covering nut pocket (0 = open pocket, >0 = captive nut)
 */
module joiner_wall_addon(
    unit_height = 1,
    side = "left",
    nut_side = "right",
    nut_pocket_depth = 0,
    screw_type = "M5",
    nut_floor = _DEFAULT_NUT_FLOOR,
    fn = 32
) {
    pocket_depth = (nut_pocket_depth > 0) ? nut_pocket_depth : joiner_default_depth(screw_type);

    if (side == "left") {
        faceplate_joiner_left(
            unit_height = unit_height,
            include_faceplate = false,
            nut_side = nut_side,
            nut_pocket_depth = pocket_depth,
            screw_type = screw_type,
            nut_floor = nut_floor,
            fn = fn
        );
    } else {
        faceplate_joiner_right(
            unit_height = unit_height,
            include_faceplate = false,
            nut_side = nut_side,
            nut_pocket_depth = pocket_depth,
            screw_type = screw_type,
            nut_floor = nut_floor,
            fn = fn
        );
    }
}


// ============================================================================
// Preview
// ============================================================================

// faceplate_joiner_pair(unit_height=1);
// faceplate_joiner_assembled(unit_height=1, explode=0);
