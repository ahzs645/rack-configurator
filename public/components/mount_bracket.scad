/*
 * Rack Scad - Bracket and Box Mounts
 * L-shaped bracket cages and simple box enclosures
 *
 * License: CC BY-NC-SA 4.0
 */

_MB_EPS = 0.01;
_MB_DEFAULT_WALL = 3;

// ============================================================================
// ANGLE BRACKET CAGE
// L-shaped side brackets that cradle the device from below and sides
// Good for devices that need side ventilation or easy top access
//
// Parameters:
//   device_w - Device width
//   device_h - Device height
//   device_d - Device depth
//   wall - Wall thickness
//   max_depth - Maximum cage depth (will be clamped)
//   vent_slot_width - Width of ventilation slots
//   vent_slot_spacing - Spacing between ventilation slots
// ============================================================================

module angle_bracket_cage(
    device_w,
    device_h,
    device_d,
    wall = _MB_DEFAULT_WALL,
    max_depth = 140,
    vent_slot_width = 10,
    vent_slot_spacing = 20
) {
    actual_depth = min(max_depth, device_d + 20);

    // Left L-bracket
    difference() {
        union() {
            // Bottom plate - extends in Y (depth), lip in X
            cube([wall + 10, actual_depth, wall]);
            // Side wall - at X=0, extends in Y
            cube([wall, actual_depth, device_h + 2 * wall]);
        }
        // Ventilation slots
        for (dy = [15 : vent_slot_spacing : actual_depth - 15]) {
            translate([-_MB_EPS, dy, device_h/4])
            cube([wall + 2*_MB_EPS, vent_slot_width, device_h/2]);
        }
    }

    // Right L-bracket
    translate([device_w + wall, 0, 0])
    mirror([1, 0, 0])
    difference() {
        union() {
            cube([wall + 10, actual_depth, wall]);
            cube([wall, actual_depth, device_h + 2 * wall]);
        }
        for (dy = [15 : vent_slot_spacing : actual_depth - 15]) {
            translate([-_MB_EPS, dy, device_h/4])
            cube([wall + 2*_MB_EPS, vent_slot_width, device_h/2]);
        }
    }
}

// Positioned version - places cage at offset from center (corner-based)
module angle_bracket_cage_positioned(
    offset_x,
    offset_y,
    device_w,
    device_h,
    device_d,
    wall = _MB_DEFAULT_WALL,
    max_depth = 140,
    plate_thick = 4
) {
    translate([offset_x - device_w/2 - wall, offset_y, plate_thick])
    angle_bracket_cage(device_w, device_h, device_d, wall, max_depth);
}

// ============================================================================
// SIMPLE BOX CAGE
// Basic rectangular enclosure without ventilation
// Good for devices that need full enclosure or dust protection
//
// Parameters:
//   device_w - Device width
//   device_h - Device height
//   device_d - Device depth
//   wall - Wall thickness
//   max_depth - Maximum cage depth (will be clamped)
// ============================================================================

module simple_box_cage(
    device_w,
    device_h,
    device_d,
    wall = _MB_DEFAULT_WALL,
    max_depth = 140
) {
    actual_depth = min(max_depth, device_d + 15);

    difference() {
        // Outer shell
        translate([-(device_w/2 + wall), -(device_h/2 + wall), 0])
        cube([device_w + 2*wall, device_h + 2*wall, actual_depth]);

        // Inner cavity
        translate([-device_w/2, -device_h/2, -_MB_EPS])
        cube([device_w, device_h, actual_depth + 2*_MB_EPS]);
    }
}

// Positioned version - places cage at offset from center
module simple_box_cage_positioned(
    offset_x,
    offset_y,
    device_w,
    device_h,
    device_d,
    wall = _MB_DEFAULT_WALL,
    max_depth = 140,
    plate_thick = 4
) {
    translate([offset_x, offset_y, plate_thick])
    simple_box_cage(device_w, device_h, device_d, wall, max_depth);
}
