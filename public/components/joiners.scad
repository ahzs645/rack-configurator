/**
 * Rack Scad - Joiners Module
 *
 * Modules for joining separately printed rack faceplate parts using
 * M5 screws and hex nuts. Creates a thin vertical wall at the faceplate
 * edge that allows two sections to be bolted together face-to-face.
 *
 * Design: Thin vertical plate with rounded top, screw holes in triangle pattern
 * - Wall sits flush at the joint edge
 * - Extends inward (into rack) from faceplate
 * - Two walls bolt together face-to-face
 *
 * Hardware Requirements:
 * - 3x or 6x M5 screws (recommended length: 12-16mm)
 * - 3x or 6x M5 hex nuts (8mm across flats)
 */

// ============================================================================
// Constants
// ============================================================================

// M5 Hardware dimensions
M5_CLEARANCE_HOLE = 5.5;       // M5 screw clearance hole diameter
M5_HEX_NUT_AF = 8.0;           // M5 hex nut across flats
M5_HEX_NUT_POCKET_AF = 8.4;    // Hex nut pocket with clearance
M5_HEX_NUT_POCKET_DEPTH = 4.5; // Hex nut pocket depth

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
 * @param nut_pocket_depth - depth of the hex nut pocket (default: M5_HEX_NUT_POCKET_DEPTH)
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
    nut_pocket_depth = M5_HEX_NUT_POCKET_DEPTH,
    fn = 32
) {
    panel_height = unit_height * _EIA_PANEL_HEIGHT;
    screw_positions = get_triangle_screw_positions(unit_height);
    has_nut = (nut_side == "left");

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

            // Through hole
            translate([-wall_thickness/2, y_pos, screw_z])
                rotate([0, 90, 0])
                    cylinder(h = wall_thickness + 2, d = M5_CLEARANCE_HOLE, center = true, $fn = fn);

            // Hex nut pocket on outer face (if this side has nuts)
            if (has_nut) {
                translate([-wall_thickness - 0.1, y_pos, screw_z])
                    rotate([0, 90, 0])
                        rotate([0, 0, 30])
                            linear_extrude(height = nut_pocket_depth + 0.5)
                                hexagon_2d(M5_HEX_NUT_POCKET_AF);
            }
        }
    }
}


/**
 * Creates the RIGHT side joiner
 * Thin wall at joint edge
 * @param nut_side - "right" for nut pockets on this side, "left" for clearance holes only
 * @param nut_pocket_depth - depth of the hex nut pocket (default: M5_HEX_NUT_POCKET_DEPTH)
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
    nut_pocket_depth = M5_HEX_NUT_POCKET_DEPTH,
    fn = 32
) {
    panel_height = unit_height * _EIA_PANEL_HEIGHT;
    screw_positions = get_triangle_screw_positions(unit_height);
    has_nut = (nut_side == "right");

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

            // Through hole
            translate([wall_thickness/2, y_pos, screw_z])
                rotate([0, 90, 0])
                    cylinder(h = wall_thickness + 2, d = M5_CLEARANCE_HOLE, center = true, $fn = fn);

            // Hex nut pocket on outer face (if this side has nuts)
            if (has_nut) {
                translate([wall_thickness - nut_pocket_depth + 0.1, y_pos, screw_z])
                    rotate([0, 90, 0])
                        rotate([0, 0, 30])
                            linear_extrude(height = nut_pocket_depth + 0.5)
                                hexagon_2d(M5_HEX_NUT_POCKET_AF);
            }
        }
    }
}


/**
 * Creates both joiners side by side for printing
 * @param nut_side - "left" or "right" to specify which side has the nut pockets
 * @param nut_pocket_depth - depth of the hex nut pocket
 */
module faceplate_joiner_pair(
    unit_height = 1,
    faceplate_width = 60,
    spacing = 20,
    nut_side = "right",
    nut_pocket_depth = M5_HEX_NUT_POCKET_DEPTH,
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
                fn = fn
            );
}


/**
 * Creates an assembled view - walls touching face-to-face
 * @param nut_side - "left" or "right" to specify which side has the nut pockets
 * @param nut_pocket_depth - depth of the hex nut pocket
 */
module faceplate_joiner_assembled(
    unit_height = 1,
    faceplate_width = 60,
    explode = 0,
    nut_side = "right",
    nut_pocket_depth = M5_HEX_NUT_POCKET_DEPTH,
    fn = 32
) {
    // Left side
    color("SteelBlue", 0.8)
        translate([-explode/2, 0, 0])
            faceplate_joiner_left(
                unit_height = unit_height,
                faceplate_width = faceplate_width,
                include_faceplate = true,
                nut_side = nut_side,
                nut_pocket_depth = nut_pocket_depth,
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
                nut_pocket_depth = nut_pocket_depth,
                fn = fn
            );
}


/**
 * Just the wall portion for adding to existing faceplates
 * @param side - "left" or "right" to specify which side wall to create
 * @param nut_side - "left" or "right" to specify which side has the nut pockets
 * @param nut_pocket_depth - depth of the hex nut pocket
 */
module joiner_wall_addon(
    unit_height = 1,
    side = "left",
    nut_side = "right",
    nut_pocket_depth = M5_HEX_NUT_POCKET_DEPTH,
    fn = 32
) {
    if (side == "left") {
        faceplate_joiner_left(
            unit_height = unit_height,
            include_faceplate = false,
            nut_side = nut_side,
            nut_pocket_depth = nut_pocket_depth,
            fn = fn
        );
    } else {
        faceplate_joiner_right(
            unit_height = unit_height,
            include_faceplate = false,
            nut_side = nut_side,
            nut_pocket_depth = nut_pocket_depth,
            fn = fn
        );
    }
}


// ============================================================================
// Preview
// ============================================================================

// faceplate_joiner_pair(unit_height=1);
// faceplate_joiner_assembled(unit_height=1, explode=0);
