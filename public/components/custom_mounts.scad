/*
 * Rack Scad - Custom Mount Components
 * Modular Component: Custom device mounting structures
 *
 * This module aggregates all custom mount types and provides
 * a unified dispatcher for the rack generator.
 *
 * Mount Types:
 *   - passthrough_frame: Thin frame for pass-through devices (keystones, dongles)
 *   - angle_bracket_cage: L-shaped side brackets with ventilation
 *   - simple_box_cage: Basic box enclosure without ventilation
 *   - usb_dongle_holder: Holder for USB stick-style devices
 *   - tray_mount: Open tray for devices that sit on top
 *   - clip_mount: Spring clip mount for thin devices
 *   - screw_mount: Mount plate with standoffs
 *   - sbc_mount: Mount for single board computers
 *   - hdd_mount: Mount for 2.5" or 3.5" drives
 *   - ventilated_shelf: Shelf with ventilation slots
 *   - storage_tray: Deep tray for storage
 *   - enhanced_shelf: Full-featured shelf with honeycomb, supports, LED notch
 *
 * License: CC BY-NC-SA 4.0
 */

// Include all mount type modules
use <mount_passthrough.scad>
use <mount_bracket.scad>
use <mount_tray.scad>
use <mount_screw.scad>
use <mount_shelf.scad>

// ============================================================================
// CONSTANTS
// ============================================================================

_CM_EPS = 0.01;
_CM_DEFAULT_WALL = 3;
_CM_DEFAULT_CLEARANCE = 1.0;

// ============================================================================
// GENERIC CUSTOM MOUNT DISPATCHER
// Use this to call any custom mount by type string
//
// Parameters:
//   mount_type - String identifier for mount type
//   offset_x, offset_y - Position offsets
//   device_w, device_h, device_d - Device dimensions
//   plate_thick - Faceplate thickness
//   params - Optional parameters array [wall, clearance, ...]
// ============================================================================

module custom_mount(
    mount_type,
    offset_x,
    offset_y,
    device_w,
    device_h,
    device_d,
    plate_thick = 4,
    wall = _CM_DEFAULT_WALL,
    clearance = _CM_DEFAULT_CLEARANCE,
    frame_depth = 8
) {
    if (mount_type == "passthrough" || mount_type == "keystone") {
        passthrough_frame_positioned(
            offset_x, offset_y,
            device_w, device_h,
            frame_depth, wall, clearance, plate_thick
        );
    }
    else if (mount_type == "angle" || mount_type == "angle_bracket") {
        angle_bracket_cage_positioned(
            offset_x, offset_y,
            device_w, device_h, device_d,
            wall, 140, plate_thick
        );
    }
    else if (mount_type == "simple" || mount_type == "box") {
        simple_box_cage_positioned(
            offset_x, offset_y,
            device_w, device_h, device_d,
            wall, 140, plate_thick
        );
    }
    else if (mount_type == "dongle" || mount_type == "usb") {
        usb_dongle_holder_positioned(
            offset_x, offset_y,
            device_w, device_h, device_d,
            wall, plate_thick
        );
    }
    else if (mount_type == "tray") {
        tray_mount_positioned(
            offset_x, offset_y,
            device_w, device_h, device_d,
            wall, 0, "sides", plate_thick
        );
    }
    else if (mount_type == "screw" || mount_type == "standoff") {
        screw_mount_positioned(
            offset_x, offset_y,
            device_w, device_h, device_d,
            [], 3, wall, 5, 6, plate_thick
        );
    }
    // Add more mount types here as needed
}
