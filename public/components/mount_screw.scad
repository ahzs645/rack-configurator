/*
 * Rack Scad - Screw and Standoff Mounts
 * Mount plates with standoffs for SBCs, drives, etc.
 *
 * License: CC BY-NC-SA 4.0
 */

_MS_EPS = 0.01;

// ============================================================================
// SCREW MOUNT
// Mount plate with standoffs and screw holes for devices with mounting holes
// Inspired by HomeRacker device_mount - great for SBCs, drives, etc.
//
// Parameters:
//   device_w - Device width (footprint)
//   device_d - Device depth (footprint)
//   screw_positions - Array of [x, y] positions relative to device corner
//   screw_diameter - Screw hole diameter (default 3mm for M3)
//   thickness - Base plate thickness
//   standoff_height - Height of standoffs (0 for flush mount)
//   standoff_diameter - Outer diameter of standoffs
// ============================================================================

module screw_mount(
    device_w,
    device_d,
    screw_positions = [],
    screw_diameter = 3,
    thickness = 3,
    standoff_height = 5,
    standoff_diameter = 6
) {
    margin = 10;  // Extra margin around device
    plate_w = device_w + margin * 2;
    plate_d = device_d + margin * 2;

    difference() {
        union() {
            // Base plate
            cube([plate_w, plate_d, thickness]);

            // Standoffs
            if (standoff_height > 0 && len(screw_positions) > 0) {
                for (pos = screw_positions) {
                    translate([margin + pos[0], margin + pos[1], thickness])
                    cylinder(h = standoff_height, d = standoff_diameter, $fn = 24);
                }
            }
        }

        // Screw holes through plate and standoffs
        for (pos = screw_positions) {
            translate([margin + pos[0], margin + pos[1], -_MS_EPS])
            cylinder(h = thickness + standoff_height + 2*_MS_EPS, d = screw_diameter, $fn = 16);
        }

        // Ventilation cutout in center (if device is large enough)
        if (device_w > 50 && device_d > 50) {
            vent_w = device_w - 30;
            vent_d = device_d - 30;
            translate([margin + 15, margin + 15, -_MS_EPS])
            cube([vent_w, vent_d, thickness + 2*_MS_EPS]);
        }
    }
}

// Positioned version for rack generator
module screw_mount_positioned(
    offset_x,
    offset_y,
    device_w,
    device_h,  // Note: device_h is the face height, device_d is depth
    device_d,
    screw_positions = [],
    screw_diameter = 3,
    thickness = 3,
    standoff_height = 5,
    standoff_diameter = 6,
    plate_thick = 4
) {
    margin = 10;
    plate_w = device_w + margin * 2;
    plate_d = device_d + margin * 2;

    translate([offset_x - plate_w/2, offset_y - device_h/2, plate_thick])
    screw_mount(device_w, device_d, screw_positions, screw_diameter, thickness, standoff_height, standoff_diameter);
}

// ============================================================================
// SBC MOUNT
// Specialized mount for Single Board Computers using the SBC_MOUNT_PATTERNS
// Automatically looks up screw positions from the device database
//
// Parameters:
//   device_w - Device width
//   device_d - Device depth
//   screw_positions - Array of [x, y] screw positions
//   screw_size - Screw size (e.g., 2.5 for M2.5)
//   standoff_height - Height of standoffs
//   thickness - Base plate thickness
// ============================================================================

module sbc_mount(
    device_w,
    device_d,
    screw_positions,
    screw_size = 2.5,
    standoff_height = 5,
    thickness = 3
) {
    // Convert M2.5 to hole diameter (add 0.2mm clearance)
    hole_dia = screw_size + 0.2;
    standoff_dia = screw_size * 2 + 2;  // Standoff is ~2x screw + margin

    screw_mount(
        device_w, device_d,
        screw_positions,
        hole_dia,
        thickness,
        standoff_height,
        standoff_dia
    );
}

// ============================================================================
// HDD MOUNT
// Mount for 2.5" or 3.5" hard drives / SSDs
// Uses standard SATA mounting hole patterns
//
// Parameters:
//   drive_type - "25" for 2.5" or "35" for 3.5" drives
//   thickness - Base plate thickness
// ============================================================================

module hdd_mount(
    drive_type = "25",
    thickness = 3
) {
    // 2.5" drive: 70mm x 100mm
    // 3.5" drive: 101.6mm x 147mm

    if (drive_type == "25") {
        device_w = 70;
        device_d = 100;
        screw_positions = [
            [3, 14],
            [3 + 61.72, 14],
            [3, 14 + 76.6],
            [3 + 61.72, 14 + 76.6]
        ];
        screw_mount(device_w, device_d, screw_positions, 3.5, thickness, 0, 0);
    }
    else if (drive_type == "35") {
        device_w = 101.6;
        device_d = 147;
        screw_positions = [
            [3.18, 28.5],
            [3.18 + 95.25, 28.5],
            [3.18, 28.5 + 101.6],
            [3.18 + 95.25, 28.5 + 101.6]
        ];
        screw_mount(device_w, device_d, screw_positions, 3.5, thickness, 0, 0);
    }
}
