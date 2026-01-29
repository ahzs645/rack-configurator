/*
 * Rack Scad - Raspberry Pi 5 Case Mount
 * Modular Component: Pi 5 case that mounts directly behind faceplate cutout
 *
 * Based on anchorcad Pi 5 case design principles.
 * The case attaches behind the faceplate with ports accessible from front.
 *
 * Key dimensions (Raspberry Pi 5 board):
 *   - Board: 85mm x 56mm
 *   - Mounting holes: 58mm x 49mm spacing, 3.5mm from edges
 *   - Port side (USB/Ethernet): along 85mm edge
 *
 * License: CC BY-NC-SA 4.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

_PI5_EPS = 0.01;

// Pi 5 board dimensions
PI5_BOARD_W = 85;      // Width (port side)
PI5_BOARD_D = 56;      // Depth
PI5_BOARD_H = 1.6;     // PCB thickness

// Pi 5 mounting hole positions (from bottom-left corner of board)
// Holes are M2.5, 3.5mm from edges, 58mm x 49mm spacing
PI5_HOLE_INSET = 3.5;
PI5_HOLE_SPACING_X = 58;
PI5_HOLE_SPACING_Y = 49;
PI5_HOLE_DIA = 2.7;    // M2.5 clearance hole

// Case dimensions
PI5_CASE_WALL = 2;
PI5_CASE_STANDOFF_H = 5;   // Height of standoffs under board
PI5_CASE_CLEARANCE = 1;    // Clearance around board

// Port cutout dimensions (for faceplate)
// Main I/O side: 2x USB-A, 1x Ethernet, 2x HDMI, 1x USB-C power
PI5_PORT_CUTOUT_W = 75;    // Width of port area
PI5_PORT_CUTOUT_H = 22;    // Height of port area

// Mounting flange dimensions
PI5_FLANGE_DEPTH = 8;      // How deep flange extends behind faceplate

// Display dimensions for UI
PI5_CASE_FACE_W = PI5_BOARD_W + 2 * (PI5_CASE_WALL + PI5_CASE_CLEARANCE);  // ~93mm
PI5_CASE_FACE_H = PI5_BOARD_D + 2 * (PI5_CASE_WALL + PI5_CASE_CLEARANCE);  // ~64mm
PI5_CASE_DEPTH = 35;  // Total depth behind faceplate

// ============================================================================
// POSITIONED VERSION (main entry point)
// For use with rack_generator dispatch system
// Coordinate system: X = horizontal, Y = depth (into rack), Z = vertical
// Origin at faceplate front surface
//
// Parameters:
//   offset_x - X offset from panel center
//   offset_y - Z offset from panel center (note: Y in UI = Z in SCAD)
//   plate_thick - Faceplate thickness
// ============================================================================

module pi5_case_mount_positioned(
    offset_x,
    offset_y,
    plate_thick = 4
) {
    case_w = PI5_CASE_FACE_W;
    case_h = PI5_CASE_FACE_H;
    case_depth = PI5_CASE_DEPTH;

    // Position: offset_x is from center, offset_y is vertical (Z in scad coords)
    // The mount is built in cage-style coordinates then positioned
    translate([offset_x, offset_y, 0])
    _pi5_mount_assembly(case_w, case_h, case_depth, plate_thick);
}

// ============================================================================
// MOUNT ASSEMBLY
// Builds the complete Pi 5 mount: flange + case
// Built centered on X, Z with Y=0 at faceplate front
// ============================================================================

module _pi5_mount_assembly(case_w, case_h, case_depth, plate_thick) {
    wall = PI5_CASE_WALL;
    clearance = PI5_CASE_CLEARANCE;
    standoff_h = PI5_CASE_STANDOFF_H;
    flange_depth = PI5_FLANGE_DEPTH;

    // The mounting flange sits on the back of the faceplate
    // and has the port cutout cut through it
    difference() {
        union() {
            // Mounting flange - reinforcing block behind faceplate
            translate([-case_w/2, plate_thick, -case_h/2])
            cube([case_w, flange_depth, case_h]);

            // Main case body - extends behind the flange
            translate([-case_w/2, plate_thick + flange_depth - wall, -case_h/2])
            _pi5_case_shell(case_w, case_h, case_depth - flange_depth + wall);

            // Standoffs for Pi mounting
            translate([0, plate_thick + flange_depth, 0])
            _pi5_standoffs_positioned(wall, clearance, standoff_h);
        }

        // Port cutout through flange (and faceplate area)
        translate([-PI5_PORT_CUTOUT_W/2, -_PI5_EPS, -PI5_PORT_CUTOUT_H/2 - 5])
        cube([PI5_PORT_CUTOUT_W, plate_thick + flange_depth + 2*_PI5_EPS, PI5_PORT_CUTOUT_H]);

        // Screw holes through standoffs
        translate([0, plate_thick + flange_depth, 0])
        _pi5_screw_holes_positioned(wall, clearance, standoff_h, flange_depth);

        // Ventilation on the bottom
        translate([0, plate_thick + flange_depth + case_depth - flange_depth, 0])
        _pi5_vent_slots_positioned(case_w, case_h, wall);
    }
}

// ============================================================================
// CASE SHELL
// Main enclosure without top (open for ventilation)
// ============================================================================

module _pi5_case_shell(w, h, depth) {
    wall = PI5_CASE_WALL;

    difference() {
        // Outer shell
        cube([w, depth, h]);

        // Inner cavity
        translate([wall, -_PI5_EPS, wall])
        cube([w - 2*wall, depth + _PI5_EPS, h - 2*wall]);

        // Open top (remove top wall for ventilation)
        translate([wall, -_PI5_EPS, h - wall - _PI5_EPS])
        cube([w - 2*wall, depth + 2*_PI5_EPS, wall + 2*_PI5_EPS]);
    }
}

// ============================================================================
// STANDOFFS
// Four M2.5 standoffs matching Pi 5 hole pattern
// Positioned relative to center
// ============================================================================

module _pi5_standoffs_positioned(wall, clearance, standoff_h) {
    standoff_dia = 5;
    board_w = PI5_BOARD_W;
    board_h = PI5_BOARD_D;

    // Hole positions relative to board corner
    positions = [
        [PI5_HOLE_INSET, PI5_HOLE_INSET],
        [PI5_HOLE_INSET + PI5_HOLE_SPACING_X, PI5_HOLE_INSET],
        [PI5_HOLE_INSET, PI5_HOLE_INSET + PI5_HOLE_SPACING_Y],
        [PI5_HOLE_INSET + PI5_HOLE_SPACING_X, PI5_HOLE_INSET + PI5_HOLE_SPACING_Y]
    ];

    // Board is centered, so offset positions
    for (pos = positions) {
        x = pos[0] - board_w/2;
        z = pos[1] - board_h/2;
        translate([x, 0, z])
        rotate([-90, 0, 0])
        cylinder(h = standoff_h, d = standoff_dia, $fn = 24);
    }
}

// ============================================================================
// SCREW HOLES
// Through holes for M2.5 screws
// ============================================================================

module _pi5_screw_holes_positioned(wall, clearance, standoff_h, flange_depth) {
    board_w = PI5_BOARD_W;
    board_h = PI5_BOARD_D;

    positions = [
        [PI5_HOLE_INSET, PI5_HOLE_INSET],
        [PI5_HOLE_INSET + PI5_HOLE_SPACING_X, PI5_HOLE_INSET],
        [PI5_HOLE_INSET, PI5_HOLE_INSET + PI5_HOLE_SPACING_Y],
        [PI5_HOLE_INSET + PI5_HOLE_SPACING_X, PI5_HOLE_INSET + PI5_HOLE_SPACING_Y]
    ];

    for (pos = positions) {
        x = pos[0] - board_w/2;
        z = pos[1] - board_h/2;
        translate([x, -flange_depth - _PI5_EPS, z])
        rotate([-90, 0, 0])
        cylinder(h = flange_depth + standoff_h + 2*_PI5_EPS, d = PI5_HOLE_DIA, $fn = 16);
    }
}

// ============================================================================
// VENTILATION SLOTS
// On the back wall of the case
// ============================================================================

module _pi5_vent_slots_positioned(case_w, case_h, wall) {
    slot_w = 30;
    slot_h = 3;
    slot_spacing = 8;

    num_slots = floor((case_h - 20) / slot_spacing);
    start_z = -((num_slots - 1) * slot_spacing) / 2;

    for (i = [0 : num_slots - 1]) {
        translate([-slot_w/2, -wall - _PI5_EPS, start_z + i * slot_spacing - slot_h/2])
        cube([slot_w, wall + 2*_PI5_EPS, slot_h]);
    }
}

// ============================================================================
// STANDALONE MODULES (for direct use/testing)
// ============================================================================

// Complete case mount for standalone use
module pi5_case_mount(
    offset_x = 0,
    offset_y = 0,
    plate_thick = 4,
    case_depth = 35
) {
    translate([offset_x, 0, offset_y])
    _pi5_mount_assembly(PI5_CASE_FACE_W, PI5_CASE_FACE_H, case_depth, plate_thick);
}

// Faceplate cutout shape (for use with difference())
module pi5_faceplate_cutout(
    offset_x = 0,
    offset_y = 0,
    plate_thick = 4
) {
    cutout_w = PI5_PORT_CUTOUT_W + 4;
    cutout_h = PI5_PORT_CUTOUT_H + 4;

    translate([offset_x - cutout_w/2, -_PI5_EPS, offset_y - cutout_h/2 - 5])
    cube([cutout_w, plate_thick + 2*_PI5_EPS, cutout_h]);
}
