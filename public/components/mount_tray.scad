/*
 * Rack Scad - Tray and Holder Mounts
 * USB dongle holders, tray mounts, and clip mounts
 *
 * License: CC BY-NC-SA 4.0
 */

_MT_EPS = 0.01;
_MT_DEFAULT_WALL = 3;

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
        translate([wall, -_MT_EPS, wall])
        cube([channel_w, device_d + _MT_EPS, channel_h + _MT_EPS]);
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
    wall = _MT_DEFAULT_WALL,
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
    wall = _MT_DEFAULT_WALL,
    lip_height = 0,
    lip_style = "sides",
    plate_thick = 4
) {
    tray_w = device_w + 2;
    actual_depth = device_d + 5;
    actual_lip = lip_height > 0 ? lip_height : device_h * 0.3;

    translate([offset_x - tray_w/2 - wall, offset_y + device_h/2, 0])
    mirror([0, 1, 0]) {
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
