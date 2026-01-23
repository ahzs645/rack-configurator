/*
 * Rack Scad - Custom Mount Components
 * Modular Component: Custom device mounting structures
 *
 * This module contains specialized mount types that don't fit into
 * the standard cage_structure or enclosed_box categories.
 *
 * Mount Types:
 *   - passthrough_frame: Thin frame for pass-through devices (keystones, dongles)
 *   - angle_bracket_cage: L-shaped side brackets with ventilation
 *   - simple_box_cage: Basic box enclosure without ventilation
 *   - usb_dongle_holder: Holder for USB stick-style devices
 *
 * License: CC BY-NC-SA 4.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

_CM_EPS = 0.01;
_CM_DEFAULT_WALL = 3;
_CM_DEFAULT_CLEARANCE = 1.0;

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
    wall = _CM_DEFAULT_WALL,
    clearance = _CM_DEFAULT_CLEARANCE
) {
    slot_w = device_w + clearance;
    slot_h = device_h + clearance;
    holder_w = slot_w + 2 * wall;
    holder_h = slot_h + 2 * wall;

    difference() {
        // Outer frame
        cube([holder_w, holder_h, frame_depth]);

        // Inner opening
        translate([wall, wall, -_CM_EPS])
        cube([slot_w, slot_h, frame_depth + 2 * _CM_EPS]);
    }
}

// Positioned version - places frame at offset from center
module passthrough_frame_positioned(
    offset_x,
    offset_y,
    device_w,
    device_h,
    frame_depth = 8,
    wall = _CM_DEFAULT_WALL,
    clearance = _CM_DEFAULT_CLEARANCE,
    plate_thick = 4
) {
    slot_w = device_w + clearance;
    slot_h = device_h + clearance;
    holder_w = slot_w + 2 * wall;
    holder_h = slot_h + 2 * wall;

    translate([offset_x - holder_w/2, offset_y - holder_h/2, plate_thick])
    passthrough_frame(device_w, device_h, frame_depth, wall, clearance);
}

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
    wall = _CM_DEFAULT_WALL,
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
            translate([-_CM_EPS, dy, device_h/4])
            cube([wall + 2*_CM_EPS, vent_slot_width, device_h/2]);
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
            translate([-_CM_EPS, dy, device_h/4])
            cube([wall + 2*_CM_EPS, vent_slot_width, device_h/2]);
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
    wall = _CM_DEFAULT_WALL,
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
    wall = _CM_DEFAULT_WALL,
    max_depth = 140
) {
    actual_depth = min(max_depth, device_d + 15);

    difference() {
        // Outer shell
        translate([-(device_w/2 + wall), -(device_h/2 + wall), 0])
        cube([device_w + 2*wall, device_h + 2*wall, actual_depth]);

        // Inner cavity
        translate([-device_w/2, -device_h/2, -_CM_EPS])
        cube([device_w, device_h, actual_depth + 2*_CM_EPS]);
    }
}

// Positioned version - places cage at offset from center
module simple_box_cage_positioned(
    offset_x,
    offset_y,
    device_w,
    device_h,
    device_d,
    wall = _CM_DEFAULT_WALL,
    max_depth = 140,
    plate_thick = 4
) {
    translate([offset_x, offset_y, plate_thick])
    simple_box_cage(device_w, device_h, device_d, wall, max_depth);
}

// ============================================================================
// USB DONGLE HOLDER
// Specialized holder for USB stick-style devices (Zigbee coordinators, etc.)
// Creates a channel with retention clips
//
// Parameters:
//   device_w - Device width
//   device_h - Device height (thickness)
//   device_d - Device length/depth
//   wall - Wall thickness
//   clip_height - Height of retention clips
//   clip_inset - How far clips extend inward
// ============================================================================

module usb_dongle_holder(
    device_w,
    device_h,
    device_d,
    wall = 2,
    clip_height = 3,
    clip_inset = 1.5
) {
    channel_w = device_w + 1;  // 1mm clearance
    channel_h = device_h + 0.5;  // 0.5mm clearance

    difference() {
        // Main body
        cube([channel_w + 2*wall, device_d + wall, channel_h + wall]);

        // Channel for device
        translate([wall, -_CM_EPS, wall])
        cube([channel_w, device_d + _CM_EPS, channel_h + _CM_EPS]);
    }

    // Retention clips (flexible tabs)
    for (x = [wall + 2, wall + channel_w - 2 - clip_inset]) {
        translate([x, device_d * 0.3, wall + channel_h - 0.5])
        cube([clip_inset, 3, 0.5 + clip_height]);

        translate([x, device_d * 0.7, wall + channel_h - 0.5])
        cube([clip_inset, 3, 0.5 + clip_height]);
    }
}

// Positioned version
module usb_dongle_holder_positioned(
    offset_x,
    offset_y,
    device_w,
    device_h,
    device_d,
    wall = 2,
    plate_thick = 4
) {
    holder_w = device_w + 1 + 2*wall;
    holder_h = device_h + 0.5 + wall;

    translate([offset_x - holder_w/2, offset_y - holder_h/2, plate_thick])
    usb_dongle_holder(device_w, device_h, device_d, wall);
}

// ============================================================================
// TRAY MOUNT
// Open tray for devices that sit on top rather than being enclosed
// Good for devices with irregular shapes or that need easy access
//
// Parameters:
//   device_w - Device width
//   device_h - Device height (used for lip height)
//   device_d - Device depth
//   wall - Wall/floor thickness
//   lip_height - Height of retaining lip (default: device_h * 0.3)
//   lip_style - "full" = all sides, "sides" = left/right only, "back" = back only
// ============================================================================

module tray_mount(
    device_w,
    device_h,
    device_d,
    wall = _CM_DEFAULT_WALL,
    lip_height = 0,  // 0 = auto-calculate
    lip_style = "sides"
) {
    actual_lip = lip_height > 0 ? lip_height : device_h * 0.3;
    tray_w = device_w + 2;
    tray_d = device_d + 5;

    // Base tray floor
    cube([tray_w + 2*wall, tray_d + wall, wall]);

    // Side lips
    if (lip_style == "full" || lip_style == "sides") {
        // Left lip
        cube([wall, tray_d + wall, wall + actual_lip]);
        // Right lip
        translate([tray_w + wall, 0, 0])
        cube([wall, tray_d + wall, wall + actual_lip]);
    }

    // Back lip
    if (lip_style == "full" || lip_style == "back") {
        translate([0, tray_d, 0])
        cube([tray_w + 2*wall, wall, wall + actual_lip]);
    }

    // Front lip (only for full)
    if (lip_style == "full") {
        cube([tray_w + 2*wall, wall, wall + actual_lip * 0.5]);
    }
}

// Positioned version
module tray_mount_positioned(
    offset_x,
    offset_y,
    device_w,
    device_h,
    device_d,
    wall = _CM_DEFAULT_WALL,
    lip_height = 0,
    lip_style = "sides",
    plate_thick = 4
) {
    tray_w = device_w + 2 + 2*wall;
    tray_d = device_d + 5 + wall;

    translate([offset_x - tray_w/2, offset_y - (device_h/2), plate_thick])
    tray_mount(device_w, device_h, device_d, wall, lip_height, lip_style);
}

// ============================================================================
// CLIP MOUNT
// Spring clip style mount for thin/flat devices
// Creates opposing clips that flex to hold the device
//
// Parameters:
//   device_w - Device width
//   device_h - Device height/thickness
//   clip_depth - How deep the clips extend
//   wall - Base wall thickness
//   clip_gap - Gap between clips (should be slightly less than device_h)
// ============================================================================

module clip_mount(
    device_w,
    device_h,
    clip_depth = 15,
    wall = 2,
    clip_gap = 0  // 0 = auto-calculate
) {
    actual_gap = clip_gap > 0 ? clip_gap : device_h - 0.5;
    base_w = device_w + 10;
    clip_thickness = 1.5;

    // Base
    cube([base_w, clip_depth, wall]);

    // Bottom clips
    for (x = [3, base_w - 3 - clip_thickness]) {
        translate([x, 0, wall])
        cube([clip_thickness, clip_depth, 2]);

        // Angled entry
        translate([x, 0, wall + 2])
        rotate([-15, 0, 0])
        cube([clip_thickness, clip_depth * 0.6, 1]);
    }

    // Top clips
    for (x = [3, base_w - 3 - clip_thickness]) {
        translate([x, 0, wall + actual_gap + 2])
        cube([clip_thickness, clip_depth, 2]);

        // Angled entry
        translate([x, 0, wall + actual_gap + 4])
        rotate([15, 0, 0])
        cube([clip_thickness, clip_depth * 0.6, 1]);
    }
}

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
            translate([margin + pos[0], margin + pos[1], -_CM_EPS])
            cylinder(h = thickness + standoff_height + 2*_CM_EPS, d = screw_diameter, $fn = 16);
        }

        // Ventilation cutout in center (if device is large enough)
        if (device_w > 50 && device_d > 50) {
            vent_w = device_w - 30;
            vent_d = device_d - 30;
            translate([margin + 15, margin + 15, -_CM_EPS])
            cube([vent_w, vent_d, thickness + 2*_CM_EPS]);
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
//   device_id - Device ID from devices.scad (e.g., "raspberry_pi_4")
//   thickness - Base plate thickness
//   standoff_override - Override standoff height (0 = use database default)
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

// ============================================================================
// VENTILATED SHELF
// Shelf with ventilation slots and optional cable routing
// Inspired by HomeRacker switch_shelf - great for network equipment
//
// Parameters:
//   width - Shelf width
//   depth - Shelf depth
//   thickness - Base thickness
//   lip_height - Height of retaining lips (0 for flat)
//   lip_sides - [front, back, left, right] which sides get lips
//   vent_slots - Add ventilation slots
//   cable_slot - Add cable routing slot at back
//   slot_length - Length of vent slots
//   slot_width - Width of vent slots
//   slot_spacing - Spacing between slots
// ============================================================================

module ventilated_shelf(
    width,
    depth,
    thickness = 3,
    lip_height = 5,
    lip_sides = [false, true, true, true],  // [front, back, left, right]
    vent_slots = true,
    cable_slot = true,
    slot_length = 40,
    slot_width = 6,
    slot_spacing_x = 50,
    slot_spacing_y = 30
) {
    lip_thick = 2;
    margin = 20;  // Margin from edges for vent slots

    difference() {
        union() {
            // Base plate
            cube([width, depth, thickness]);

            // Lips
            if (lip_height > 0) {
                // Front lip
                if (lip_sides[0])
                    cube([width, lip_thick, thickness + lip_height]);

                // Back lip
                if (lip_sides[1])
                    translate([0, depth - lip_thick, 0])
                    cube([width, lip_thick, thickness + lip_height]);

                // Left lip
                if (lip_sides[2])
                    cube([lip_thick, depth, thickness + lip_height]);

                // Right lip
                if (lip_sides[3])
                    translate([width - lip_thick, 0, 0])
                    cube([lip_thick, depth, thickness + lip_height]);
            }
        }

        // Ventilation slots
        if (vent_slots) {
            for (x = [margin : slot_spacing_x : width - margin - slot_length]) {
                for (y = [margin : slot_spacing_y : depth - margin]) {
                    translate([x, y - slot_width/2, -_CM_EPS])
                    cube([slot_length, slot_width, thickness + 2*_CM_EPS]);
                }
            }
        }

        // Cable routing slot at back
        if (cable_slot) {
            cable_w = min(width * 0.4, 120);
            cable_d = 10;
            translate([(width - cable_w)/2, depth - margin - cable_d, -_CM_EPS])
            cube([cable_w, cable_d, thickness + 2*_CM_EPS]);
        }
    }
}

// Positioned version for rack generator
module ventilated_shelf_positioned(
    offset_x,
    offset_y,
    width,
    depth,
    thickness = 3,
    lip_height = 5,
    vent_slots = true,
    cable_slot = true,
    plate_thick = 4
) {
    translate([offset_x - width/2, offset_y, plate_thick])
    ventilated_shelf(width, depth, thickness, lip_height,
                     [false, true, true, true], vent_slots, cable_slot);
}

// ============================================================================
// STORAGE TRAY
// Deep tray with walls for storing loose items, cables, tools, etc.
// Inspired by HomeRacker equipment_tray
//
// Parameters:
//   width - Tray outer width
//   depth - Tray outer depth
//   wall_height - Height of tray walls
//   wall_thickness - Thickness of walls
//   base_thickness - Thickness of base
//   dividers - Number of internal dividers (0 = none)
// ============================================================================

module storage_tray(
    width,
    depth,
    wall_height = 30,
    wall_thickness = 2,
    base_thickness = 3,
    dividers = 0
) {
    total_height = base_thickness + wall_height;

    difference() {
        // Outer shell
        cube([width, depth, total_height]);

        // Inner cavity
        translate([wall_thickness, wall_thickness, base_thickness])
        cube([width - wall_thickness*2, depth - wall_thickness*2, wall_height + _CM_EPS]);
    }

    // Optional dividers
    if (dividers > 0) {
        divider_spacing = (width - wall_thickness*2) / (dividers + 1);
        for (i = [1 : dividers]) {
            translate([wall_thickness + i * divider_spacing - wall_thickness/2, wall_thickness, base_thickness])
            cube([wall_thickness, depth - wall_thickness*2, wall_height * 0.8]);
        }
    }
}

// Positioned version for rack generator
module storage_tray_positioned(
    offset_x,
    offset_y,
    width,
    depth,
    wall_height = 30,
    dividers = 0,
    plate_thick = 4
) {
    translate([offset_x - width/2, offset_y, plate_thick])
    storage_tray(width, depth, wall_height, 2, 3, dividers);
}
