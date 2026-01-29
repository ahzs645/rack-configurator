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
 *   - enhanced_shelf: Full-featured shelf with honeycomb, supports, LED notch
 *
 * License: CC BY-NC-SA 4.0
 */

use <honeycomb.scad>

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

// Positioned version - builds directly in rack coordinates (Z = depth)
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
    tray_w = device_w + 2;
    actual_depth = device_d + 5;
    actual_lip = lip_height > 0 ? lip_height : device_h * 0.3;

    translate([offset_x - tray_w/2 - wall, offset_y - device_h/2, plate_thick])
    mirror([0, 0, 1]) {
        // Base tray floor (extends in -Z for depth into rack)
        cube([tray_w + 2*wall, wall, actual_depth]);

        // Side lips (extend in +Y for height)
        if (lip_style == "full" || lip_style == "sides") {
            // Left lip
            cube([wall, wall + actual_lip, actual_depth]);
            // Right lip
            translate([tray_w + wall, 0, 0])
            cube([wall, wall + actual_lip, actual_depth]);
        }

        // Back lip
        if (lip_style == "full" || lip_style == "back") {
            translate([0, 0, actual_depth - wall])
            cube([tray_w + 2*wall, wall + actual_lip, wall]);
        }

        // Front lip (only for full)
        if (lip_style == "full") {
            cube([tray_w + 2*wall, wall + actual_lip * 0.5, wall]);
        }
    }
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

// Positioned version for rack generator - builds directly in rack coordinates (Z = depth)
module ventilated_shelf_positioned(
    offset_x,
    offset_y,
    width,
    depth,
    device_h = 0,
    thickness = 3,
    lip_height = 5,
    vent_slots = true,
    cable_slot = true,
    plate_thick = 4
) {
    lip_thick = 2;
    margin = 20;
    slot_length = 40;
    slot_width = 6;
    slot_spacing_x = 50;
    slot_spacing_z = 30;
    // Use device_h if provided, otherwise use thickness as fallback
    y_offset = device_h > 0 ? device_h/2 : thickness;

    translate([offset_x - width/2, offset_y - y_offset, plate_thick])
    mirror([0, 0, 1]) {
        difference() {
            union() {
                // Base plate (extends in -Z for depth into rack)
                cube([width, thickness, depth]);

                // Lips (extend in +Y for height)
                if (lip_height > 0) {
                    // Back lip
                    translate([0, 0, depth - lip_thick])
                    cube([width, thickness + lip_height, lip_thick]);

                    // Left lip
                    cube([lip_thick, thickness + lip_height, depth]);

                    // Right lip
                    translate([width - lip_thick, 0, 0])
                    cube([lip_thick, thickness + lip_height, depth]);
                }
            }

            // Ventilation slots
            if (vent_slots) {
                for (x = [margin : slot_spacing_x : width - margin - slot_length]) {
                    for (z = [margin : slot_spacing_z : depth - margin]) {
                        translate([x, -_CM_EPS, z - slot_width/2])
                        cube([slot_length, thickness + 2*_CM_EPS, slot_width]);
                    }
                }
            }

            // Cable routing slot at back
            if (cable_slot) {
                cable_w = min(width * 0.4, 120);
                cable_d = 10;
                translate([(width - cable_w)/2, -_CM_EPS, depth - margin - cable_d])
                cube([cable_w, thickness + 2*_CM_EPS, cable_d]);
            }
        }
    }
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

// Positioned version for rack generator - builds directly in rack coordinates (Z = depth)
module storage_tray_positioned(
    offset_x,
    offset_y,
    width,
    depth,
    wall_height = 30,
    device_h = 0,
    dividers = 0,
    plate_thick = 4
) {
    wall_thickness = 2;
    base_thickness = 3;
    // Use device_h for positioning if provided, otherwise use wall_height
    y_offset = device_h > 0 ? device_h/2 : wall_height/2;

    translate([offset_x - width/2, offset_y - y_offset, plate_thick])
    mirror([0, 0, 1]) {
        difference() {
            // Outer shell (extends in -Z for depth into rack, Y for height)
            cube([width, base_thickness + wall_height, depth]);

            // Inner cavity
            translate([wall_thickness, base_thickness, wall_thickness])
            cube([width - wall_thickness*2, wall_height + _CM_EPS, depth - wall_thickness*2]);
        }

        // Optional dividers
        if (dividers > 0) {
            divider_spacing = (width - wall_thickness*2) / (dividers + 1);
            for (i = [1 : dividers]) {
                translate([wall_thickness + i * divider_spacing - wall_thickness/2, base_thickness, wall_thickness])
                cube([wall_thickness, wall_height * 0.8, depth - wall_thickness*2]);
            }
        }
    }
}

// ============================================================================
// ENHANCED SHELF
// Full-featured shelf inspired by universal-rack-shelf project
// Features: honeycomb ventilation, side supports, LED notch, screw holes
//
// Parameters:
//   width - Shelf width (mm)
//   depth - Shelf depth (mm)
//   height - Wall/lip height (mm)
//   thickness - Base/wall thickness (mm)
//   use_honeycomb - Use honeycomb pattern (true) or rectangular slots (false)
//   hex_dia - Honeycomb hole diameter (mm)
//   hex_wall - Honeycomb wall thickness (mm)
//   notch - LED notch position: "none", "left", "right", "center"
//   notch_size - [width, height, depth] of notch (mm)
//   screw_holes - Number of auto-positioned screw holes (0-5)
//   screw_inner_dia - Inner screw hole diameter (mm)
//   screw_outer_dia - Outer screw hole diameter (mm)
//   cable_holes_left - Number of cable holes on left side (0-5)
//   cable_holes_right - Number of cable holes on right side (0-5)
//   cable_hole_dia - Cable hole diameter (mm)
//   top_support_depth - Depth of top support beam (mm)
// ============================================================================

module enhanced_shelf(
    width,
    depth,
    height,
    thickness = 3,
    use_honeycomb = true,
    hex_dia = 8,
    hex_wall = 2,
    notch = "none",
    notch_size = [100, 5, 15],
    screw_holes = 0,
    screw_inner_dia = 3,
    screw_outer_dia = 8,
    cable_holes_left = 0,
    cable_holes_right = 0,
    cable_hole_dia = 8,
    top_support_depth = 20
) {
    // Calculate derived dimensions
    inner_width = width - thickness * 2;
    top_thickness = min(height * 0.5, 7);  // Top beam thickness

    difference() {
        union() {
            // ============================================
            // Bottom shelf plate with honeycomb
            // ============================================
            if (use_honeycomb) {
                linear_extrude(thickness) {
                    honey_shape(thickness, hex_dia, hex_wall) {
                        square([width, depth]);
                    }
                }
            } else {
                // Rectangular slot ventilation
                _shelf_rect_vent_base(width, depth, thickness);
            }

            // ============================================
            // Side walls with honeycomb
            // ============================================
            for (side = [0, 1]) {
                x_offset = side * (width - thickness);
                translate([x_offset, -height, 0]) {
                    if (use_honeycomb) {
                        rotate([0, -90, 0])
                        linear_extrude(thickness) {
                            honey_shape(thickness, hex_dia, hex_wall) {
                                // Trapezoidal side wall profile - extends downward from shelf
                                polygon([
                                    [0, height],
                                    [0, 0],
                                    [top_support_depth, 0],
                                    [depth, height]
                                ]);
                            }
                        }
                    } else {
                        rotate([0, -90, 0])
                        linear_extrude(thickness) {
                            polygon([
                                [0, height],
                                [0, 0],
                                [top_support_depth, 0],
                                [depth, height]
                            ]);
                        }
                    }
                }
            }

            // ============================================
            // Top support beam (now at bottom since walls extend down)
            // ============================================
            translate([0, -height, 0]) {
                cube([width, top_thickness, top_support_depth]);
            }

            // ============================================
            // Support triangles at corners (extending down from shelf)
            // ============================================
            _shelf_support_triangle_length = min(height * 0.8, depth * 0.3);
            for (side = [0, 1]) {
                x_offset = side * (width - thickness);
                translate([x_offset, -_shelf_support_triangle_length, 0]) {
                    rotate([0, -90, 0])
                    linear_extrude(thickness) {
                        polygon([
                            [0, _shelf_support_triangle_length],
                            [0, 0],
                            [_shelf_support_triangle_length, _shelf_support_triangle_length]
                        ]);
                    }
                }
            }

            // ============================================
            // Screw hole standoffs (if any)
            // ============================================
            if (screw_holes > 0) {
                _shelf_screw_positions = _get_shelf_screw_positions(inner_width, depth, screw_holes, thickness);
                for (pos = _shelf_screw_positions) {
                    translate([pos[0], pos[1], 0]) {
                        difference() {
                            cylinder(h = thickness, d = screw_outer_dia, $fn = 24);
                            translate([0, 0, -_CM_EPS])
                            cylinder(h = thickness + 2*_CM_EPS, d = screw_inner_dia, $fn = 16);
                        }
                    }
                }
            }
        }

        // ============================================
        // Subtract: LED notch
        // ============================================
        if (notch != "none") {
            notch_x = notch == "left" ? width - notch_size[0] - thickness :
                      notch == "right" ? thickness :
                      (width - notch_size[0]) / 2;  // center

            translate([notch_x, height - notch_size[1], notch_size[2]])
            rotate([0, 90, 0])
            linear_extrude(notch_size[0]) {
                polygon([
                    [0, 0],
                    [notch_size[2], notch_size[1]],
                    [notch_size[2], 0]
                ]);
            }
        }

        // ============================================
        // Subtract: Cable holes (left side)
        // ============================================
        if (cable_holes_left > 0) {
            spacing = (depth - 20) / (cable_holes_left + 1);
            for (i = [1 : cable_holes_left]) {
                translate([-_CM_EPS, 10 + i * spacing, height / 2])
                rotate([0, 90, 0])
                cylinder(h = thickness + 2*_CM_EPS, d = cable_hole_dia, $fn = 24);
            }
        }

        // ============================================
        // Subtract: Cable holes (right side)
        // ============================================
        if (cable_holes_right > 0) {
            spacing = (depth - 20) / (cable_holes_right + 1);
            for (i = [1 : cable_holes_right]) {
                translate([width - thickness - _CM_EPS, 10 + i * spacing, height / 2])
                rotate([0, 90, 0])
                cylinder(h = thickness + 2*_CM_EPS, d = cable_hole_dia, $fn = 24);
            }
        }

        // ============================================
        // Subtract: Screw through-holes
        // ============================================
        if (screw_holes > 0) {
            _shelf_screw_positions = _get_shelf_screw_positions(inner_width, depth, screw_holes, thickness);
            for (pos = _shelf_screw_positions) {
                translate([pos[0], pos[1], -_CM_EPS])
                cylinder(h = thickness + 2*_CM_EPS, d = screw_inner_dia, $fn = 16);
            }
        }
    }
}

// Helper: Calculate screw positions based on count
function _get_shelf_screw_positions(width, depth, count, margin) =
    count == 1 ? [[width/2 + margin, depth/2]] :
    count == 2 ? [[margin + 15, depth/2], [width - 15, depth/2]] :
    count == 3 ? [[margin + 15, depth * 0.3], [width/2 + margin, depth * 0.7], [width - 15, depth * 0.3]] :
    count == 4 ? [[margin + 15, depth * 0.25], [width - 15, depth * 0.25],
                  [margin + 15, depth * 0.75], [width - 15, depth * 0.75]] :
    count >= 5 ? [[margin + 15, depth * 0.25], [width/2 + margin, depth * 0.25], [width - 15, depth * 0.25],
                  [margin + 15, depth * 0.75], [width - 15, depth * 0.75]] :
    [];

// Helper: Create rectangular vent slots for non-honeycomb mode
module _shelf_rect_vent_base(width, depth, thickness) {
    slot_length = 40;
    slot_width = 6;
    margin = 20;
    spacing_x = 50;
    spacing_y = 30;

    difference() {
        cube([width, depth, thickness]);

        for (x = [margin : spacing_x : width - margin - slot_length]) {
            for (y = [margin : spacing_y : depth - margin]) {
                translate([x, y - slot_width/2, -_CM_EPS])
                cube([slot_length, slot_width, thickness + 2*_CM_EPS]);
            }
        }
    }
}

// ============================================================================
// ENHANCED SHELF - POSITIONED VERSION
// Wrapper that positions the shelf in rack coordinates (Z = depth into rack)
//
// Additional Parameters:
//   offset_x - X offset from rack center (mm)
//   offset_y - Y offset from rack center (mm)
//   plate_thick - Faceplate thickness (mm)
// ============================================================================

module enhanced_shelf_positioned(
    offset_x,
    offset_y,
    width,
    depth,
    device_h,
    thickness = 3,
    use_honeycomb = true,
    hex_dia = 8,
    hex_wall = 2,
    notch = "none",
    notch_size = [100, 5, 15],
    screw_holes = 0,
    screw_inner_dia = 3,
    screw_outer_dia = 8,
    cable_holes_left = 0,
    cable_holes_right = 0,
    cable_hole_dia = 8,
    top_support_depth = 20,
    plate_thick = 4
) {
    // Position shelf so the platform is at the bottom of the cutout
    // After rotate([90,0,0]), the shelf geometry is inverted in Y
    // Offset by thickness so the top surface of the platform aligns with cutout bottom

    translate([offset_x - width/2, offset_y + device_h/2 + thickness, plate_thick])
    rotate([0, 0, -90])
    rotate([90, 0, 0])
    enhanced_shelf(
        width = width,
        depth = depth,
        height = device_h > 0 ? device_h : 30,
        thickness = thickness,
        use_honeycomb = use_honeycomb,
        hex_dia = hex_dia,
        hex_wall = hex_wall,
        notch = notch,
        notch_size = notch_size,
        screw_holes = screw_holes,
        screw_inner_dia = screw_inner_dia,
        screw_outer_dia = screw_outer_dia,
        cable_holes_left = cable_holes_left,
        cable_holes_right = cable_holes_right,
        cable_hole_dia = cable_hole_dia,
        top_support_depth = top_support_depth
    );
}
