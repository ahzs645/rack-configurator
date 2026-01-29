/*
 * Rack Scad - Passthrough Frame Mount
 * Thin frame for pass-through style mounts (keystones, dongles, etc.)
 *
 * License: CC BY-NC-SA 4.0
 */

_MP_EPS = 0.01;
_MP_DEFAULT_WALL = 3;
_MP_DEFAULT_CLEARANCE = 1.0;

// ============================================================================
// PASSTHROUGH FRAME
// Creates a thin frame for pass-through style mounts (keystones, dongles, etc.)
// The device sticks through and is held by a thin frame
//
// Parameters:
//   device_w - Device face width
//   device_h - Device face height
//   frame_depth - How deep the frame extends (default 8mm for keystone-style)
//   wall - Frame wall thickness
//   clearance - Extra clearance around device opening
// ============================================================================

module passthrough_frame(
    device_w,
    device_h,
    frame_depth = 8,
    wall = _MP_DEFAULT_WALL,
    clearance = _MP_DEFAULT_CLEARANCE
) {
    slot_w = device_w + clearance;
    slot_h = device_h + clearance;
    holder_w = slot_w + 2 * wall;
    holder_h = slot_h + 2 * wall;

    difference() {
        // Outer frame
        cube([holder_w, holder_h, frame_depth]);

        // Inner opening
        translate([wall, wall, -_MP_EPS])
        cube([slot_w, slot_h, frame_depth + 2 * _MP_EPS]);
    }
}

// Positioned version - places frame at offset from center
module passthrough_frame_positioned(
    offset_x,
    offset_y,
    device_w,
    device_h,
    frame_depth = 8,
    wall = _MP_DEFAULT_WALL,
    clearance = _MP_DEFAULT_CLEARANCE,
    plate_thick = 4
) {
    slot_w = device_w + clearance;
    slot_h = device_h + clearance;
    holder_w = slot_w + 2 * wall;
    holder_h = slot_h + 2 * wall;

    translate([offset_x - holder_w/2, offset_y - holder_h/2, plate_thick])
    passthrough_frame(device_w, device_h, frame_depth, wall, clearance);
}
