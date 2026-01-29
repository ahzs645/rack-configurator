/*
 * Rack Scad - Rack Generator Internal Modules
 * Faceplate, ears, cutouts, and device mount dispatcher
 *
 * License: CC BY-NC-SA 4.0
 */

use <utilities.scad>
use <cage.scad>
use <custom_mounts.scad>
use <rack_ears.scad>
use <mount_passthrough.scad>
use <mount_bracket.scad>
use <mount_tray.scad>
use <mount_screw.scad>
use <mount_shelf.scad>
include <constants.scad>
include <devices.scad>
include <rack_generator_helpers.scad>
include <../rack_mounts/enclosed_box.scad>
include <../rack_mounts/patch_panel.scad>
include <../rack_mounts/pi5_case.scad>

// ============================================================================
// CONFIGURATION DEFAULTS
// ============================================================================

_RG_DEFAULT_CLEARANCE = 1.0;
_RG_DEFAULT_HEX_DIA = 8;
_RG_DEFAULT_HEX_WALL = 2;
_RG_DEFAULT_PLATE_THICK = 4;
_RG_DEFAULT_HEAVY = 0;
_RG_WALL = 3;

_RG_EPS = 0.01;

// Toolless hook dimensions (must match rack_ears.scad)
HOOK_HEIGHT = 30.4;
HOOK_SPACING = 47.625;

// ============================================================================
// FACEPLATE BASE MODULES
// ============================================================================

// Base faceplate with optional rounded corners
module _rg_faceplate_base(width, height, thickness, radius) {
    if (radius > 0) {
        hull() {
            translate([radius, 0, radius])
            rotate([-90, 0, 0])
            cylinder(r = radius, h = thickness, $fn = 32);

            translate([radius, 0, height - radius])
            rotate([-90, 0, 0])
            cylinder(r = radius, h = thickness, $fn = 32);

            translate([width - radius, 0, radius])
            rotate([-90, 0, 0])
            cylinder(r = radius, h = thickness, $fn = 32);

            translate([width - radius, 0, height - radius])
            rotate([-90, 0, 0])
            cylinder(r = radius, h = thickness, $fn = 32);
        }
    } else {
        cube([width, thickness, height]);
    }
}

// Left faceplate (rounded left, flat right)
module _rg_faceplate_left(width, height, thickness, radius) {
    if (radius > 0) {
        hull() {
            translate([radius, 0, radius])
            rotate([-90, 0, 0])
            cylinder(r = radius, h = thickness, $fn = 32);

            translate([radius, 0, height - radius])
            rotate([-90, 0, 0])
            cylinder(r = radius, h = thickness, $fn = 32);

            translate([width - _RG_EPS, 0, 0])
            cube([_RG_EPS, thickness, height]);
        }
    } else {
        cube([width, thickness, height]);
    }
}

// Right faceplate (flat left, rounded right)
module _rg_faceplate_right(width, height, thickness, radius) {
    if (radius > 0) {
        hull() {
            cube([_RG_EPS, thickness, height]);

            translate([width - radius, 0, radius])
            rotate([-90, 0, 0])
            cylinder(r = radius, h = thickness, $fn = 32);

            translate([width - radius, 0, height - radius])
            rotate([-90, 0, 0])
            cylinder(r = radius, h = thickness, $fn = 32);
        }
    } else {
        cube([width, thickness, height]);
    }
}

// ============================================================================
// TRIM NOTCH MODULES
// ============================================================================

// Trim notches for hookless sections
module _rg_trim_notches(width, height, plate_thick, hook_pattern, trim_pattern, ear_thickness, rack_u) {
    max_hooks = floor((height - HOOK_HEIGHT) / HOOK_SPACING) + 1;

    for (i = [0 : min(len(trim_pattern), max_hooks) - 1]) {
        hook_enabled = i < len(hook_pattern) ? hook_pattern[i] : true;
        trim_enabled = trim_pattern[i];

        if (!hook_enabled && trim_enabled) {
            section_start_z = i * HOOK_SPACING;
            section_end_z = min((i + 1) * HOOK_SPACING, height);
            section_height = section_end_z - section_start_z;

            // Left notch
            translate([-_RG_EPS, -_RG_EPS, section_start_z])
            cube([ear_thickness + _RG_EPS, plate_thick + 2*_RG_EPS, section_height]);

            // Right notch
            translate([width - ear_thickness, -_RG_EPS, section_start_z])
            cube([ear_thickness + _RG_EPS, plate_thick + 2*_RG_EPS, section_height]);
        }
    }
}

// Trim notches for left split half
module _rg_trim_notches_left(width, height, plate_thick, hook_pattern, trim_pattern, ear_thickness, rack_u) {
    max_hooks = floor((height - HOOK_HEIGHT) / HOOK_SPACING) + 1;

    for (i = [0 : min(len(trim_pattern), max_hooks) - 1]) {
        hook_enabled = i < len(hook_pattern) ? hook_pattern[i] : true;
        trim_enabled = trim_pattern[i];

        if (!hook_enabled && trim_enabled) {
            section_start_z = i * HOOK_SPACING;
            section_end_z = min((i + 1) * HOOK_SPACING, height);
            section_height = section_end_z - section_start_z;

            translate([-_RG_EPS, -_RG_EPS, section_start_z])
            cube([ear_thickness + _RG_EPS, plate_thick + 2*_RG_EPS, section_height]);
        }
    }
}

// Trim notches for right split half
module _rg_trim_notches_right(width, height, plate_thick, hook_pattern, trim_pattern, ear_thickness, rack_u) {
    max_hooks = floor((height - HOOK_HEIGHT) / HOOK_SPACING) + 1;

    for (i = [0 : min(len(trim_pattern), max_hooks) - 1]) {
        hook_enabled = i < len(hook_pattern) ? hook_pattern[i] : true;
        trim_enabled = trim_pattern[i];

        if (!hook_enabled && trim_enabled) {
            section_start_z = i * HOOK_SPACING;
            section_end_z = min((i + 1) * HOOK_SPACING, height);
            section_height = section_end_z - section_start_z;

            translate([width - ear_thickness, -_RG_EPS, section_start_z])
            cube([ear_thickness + _RG_EPS, plate_thick + 2*_RG_EPS, section_height]);
        }
    }
}

// ============================================================================
// RACK EAR MODULES
// ============================================================================

// Rack ear placement
module _rg_rack_ears(width, height, plate_thick, style, thickness, position, rack_u, hook_pattern = [true]) {
    if (style == "toolless") {
        patterned_rack_hooks_pair(
            thickness = thickness,
            rack_height = height,
            panel_width = width,
            hook_pattern = hook_pattern
        );
    }
    else if (style == "fusion") {
        // Left ear
        translate([0, 0, height/2])
        rotate([0, -90, 0])
        rotate([90, 0, 0])
        rack_ear_left(
            thickness = thickness,
            side_width = height,
            side_height = 40,
            bottom_depth = 22,
            hole_radius = 2.25,
            countersink = true,
            toolless = false
        );

        // Right ear
        translate([width, 0, height/2])
        rotate([0, 90, 0])
        rotate([90, 0, 0])
        mirror([1, 0, 0])
        rack_ear_left(
            thickness = thickness,
            side_width = height,
            side_height = 40,
            bottom_depth = 22,
            hole_radius = 2.25,
            countersink = true,
            toolless = false
        );
    }
    else if (style == "simple") {
        ear_w = EIA_19_EAR_WIDTH;
        // Left ear
        translate([-ear_w, 0, 0])
        difference() {
            cube([ear_w + 5, plate_thick + 3, height]);
            _rg_simple_ear_holes(ear_w / 2, rack_u, plate_thick);
        }
        // Right ear
        translate([width - 5, 0, 0])
        difference() {
            cube([ear_w + 5, plate_thick + 3, height]);
            _rg_simple_ear_holes(ear_w / 2 + 5, rack_u, plate_thick);
        }
    }
}

module _rg_simple_ear_holes(x_pos, rack_u, plate_thick) {
    for (u = [0 : rack_u - 1]) {
        for (offset = [6.35, 22.225, 38.1]) {
            translate([x_pos, -_RG_EPS, u * EIA_UNIT_HEIGHT + offset])
            rotate([-90, 0, 0])
            cylinder(d = 7.5, h = plate_thick + 6, $fn = 32);
        }
    }
}

// Single rack ear for split panels
module _rg_rack_ear_single(height, plate_thick, style, thickness, position, rack_u, side, x_offset, hook_pattern = [true]) {
    if (style == "toolless") {
        translate([x_offset, 0, 0])
        patterned_rack_hooks(
            thickness = thickness,
            rack_height = height,
            hook_pattern = hook_pattern,
            side = side
        );
    }
    else if (style == "fusion") {
        if (side == "left") {
            translate([x_offset, 0, height/2])
            rotate([0, -90, 0])
            rotate([90, 0, 0])
            rack_ear_left(
                thickness = thickness,
                side_width = height,
                side_height = 40,
                bottom_depth = 22,
                hole_radius = 2.25,
                countersink = true,
                toolless = false
            );
        } else {
            translate([x_offset, 0, height/2])
            rotate([0, 90, 0])
            rotate([90, 0, 0])
            mirror([1, 0, 0])
            rack_ear_left(
                thickness = thickness,
                side_width = height,
                side_height = 40,
                bottom_depth = 22,
                hole_radius = 2.25,
                countersink = true,
                toolless = false
            );
        }
    }
    else if (style == "simple") {
        ear_w = EIA_19_EAR_WIDTH;
        if (side == "left") {
            translate([x_offset - ear_w, 0, 0])
            difference() {
                cube([ear_w + 5, plate_thick + 3, height]);
                _rg_simple_ear_holes(ear_w / 2, rack_u, plate_thick);
            }
        } else {
            translate([x_offset - 5, 0, 0])
            difference() {
                cube([ear_w + 5, plate_thick + 3, height]);
                _rg_simple_ear_holes(ear_w / 2 + 5, rack_u, plate_thick);
            }
        }
    }
}

// ============================================================================
// DEVICE MOUNT DISPATCHER
// ============================================================================

module _rg_device_mount(
    device_entry,
    plate_thick,
    clearance,
    heavy,
    hex_dia,
    hex_wall,
    global_back_style,
    cutout_edge = 5,
    cutout_radius = 5
) {
    dev_w = _get_dev_w(device_entry);
    dev_h = _get_dev_h(device_entry);
    dev_d = _get_dev_d(device_entry);
    offset_x = _get_dev_x(device_entry);
    offset_y = -_get_dev_y(device_entry);  // Flip Y for cage coords
    mount_type = _get_dev_mount(device_entry);

    // Get per-device back style, use global if "default"
    dev_back_style = _get_dev_back_style(device_entry);
    effective_back_style = (dev_back_style == "default") ? global_back_style : dev_back_style;

    // Convert back_style string to cage parameters
    _back_open = (effective_back_style == "vent");
    _no_back = (effective_back_style == "none");

    if (mount_type == "cage") {
        cage_structure(
            offset_x = offset_x,
            offset_y = offset_y,
            device_width = dev_w,
            device_height = dev_h,
            device_depth = dev_d,
            device_clearance = clearance,
            heavy_device = heavy,
            extra_support = false,
            cutout_edge = cutout_edge,
            cutout_radius = cutout_radius,
            is_split = false,
            use_honeycomb = true,
            hex_dia = hex_dia,
            hex_wall = hex_wall,
            back_open = _back_open,
            no_back = _no_back
        );
    }
    else if (mount_type == "cage_rect") {
        cage_structure(
            offset_x = offset_x,
            offset_y = offset_y,
            device_width = dev_w,
            device_height = dev_h,
            device_depth = dev_d,
            device_clearance = clearance,
            heavy_device = heavy,
            extra_support = false,
            cutout_edge = cutout_edge,
            cutout_radius = cutout_radius,
            is_split = false,
            use_honeycomb = false,
            back_open = _back_open,
            no_back = _no_back
        );
    }
    else if (mount_type == "cage_open" || mount_type == "open") {
        cage_structure(
            offset_x = offset_x,
            offset_y = offset_y,
            device_width = dev_w,
            device_height = dev_h,
            device_depth = dev_d,
            device_clearance = clearance,
            heavy_device = heavy,
            extra_support = false,
            cutout_edge = cutout_edge,
            cutout_radius = cutout_radius,
            is_split = false,
            use_honeycomb = false,
            back_open = _back_open,
            no_back = _no_back,
            open_frame = false,
            no_front = true
        );
    }
    else if (mount_type == "enclosed") {
        translate([offset_x, offset_y, plate_thick])
        _rg_enclosed_box_rails(dev_w, dev_h, dev_d);
    }
    else if (mount_type == "angle" || mount_type == "angle_bracket") {
        translate([offset_x - dev_w/2 - _RG_WALL, offset_y + dev_h/2 + _RG_WALL, plate_thick])
        rotate([90, 0, 0])
        angle_bracket_cage(dev_w, dev_h, dev_d);
    }
    else if (mount_type == "simple" || mount_type == "box") {
        translate([offset_x, offset_y, plate_thick])
        simple_box_cage(dev_w, dev_h, dev_d);
    }
    else if (mount_type == "passthrough" || mount_type == "keystone") {
        passthrough_frame_positioned(
            offset_x, offset_y,
            dev_w, dev_h,
            8, 3, clearance, plate_thick
        );
    }
    else if (mount_type == "tray") {
        tray_mount_positioned(
            offset_x, offset_y,
            dev_w, dev_h, dev_d,
            3, 0, "sides", plate_thick
        );
    }
    else if (mount_type == "shelf") {
        shelf_params = _get_dev_shelf_params(device_entry);
        enhanced_shelf_positioned(
            offset_x = offset_x,
            offset_y = offset_y,
            width = dev_w,
            depth = dev_d,
            device_h = dev_h,
            thickness = 3,
            use_honeycomb = _shelf_use_honeycomb(shelf_params),
            hex_dia = hex_dia,
            hex_wall = hex_wall,
            notch = _shelf_notch(shelf_params),
            notch_size = [_shelf_notch_width(shelf_params), 5, 15],
            screw_holes = _shelf_screw_holes(shelf_params),
            screw_inner_dia = 3,
            screw_outer_dia = 8,
            cable_holes_left = _shelf_cable_left(shelf_params),
            cable_holes_right = _shelf_cable_right(shelf_params),
            cable_hole_dia = 8,
            top_support_depth = 20,
            plate_thick = plate_thick
        );
    }
    else if (mount_type == "storage" || mount_type == "storage_tray") {
        storage_tray_positioned(
            offset_x, offset_y,
            dev_w, dev_d,
            dev_h,
            dev_h,
            0, plate_thick
        );
    }
    else if (mount_type == "patch_panel") {
        patch_ports = _get_dev_patch_ports(device_entry);
        _rg_keystone_array(offset_x, offset_y, patch_ports, plate_thick);
    }
    else if (mount_type == "pi5_case") {
        pi5_case_mount_positioned(offset_x, offset_y, plate_thick);
    }
}

// ============================================================================
// KEYSTONE ARRAY MODULE
// ============================================================================

module _rg_keystone_array(offset_x, offset_y, port_count, plate_thick) {
    spacing = KEYSTONE_SPACING;
    total_width = port_count * spacing;

    start_x = offset_x - total_width / 2 + spacing / 2;

    for (i = [0 : port_count - 1]) {
        slot_x = start_x + i * spacing;

        translate([slot_x, offset_y, 0])
        keystone_type2(
            plateThickness = plate_thick,
            outerWidth = spacing,
            outerHeight = 30
        );
    }
}

// ============================================================================
// ENCLOSED BOX RAILS MODULE
// ============================================================================

module _rg_enclosed_box_rails(dev_w, dev_h, dev_d) {
    rail_thickness = 1.5;
    rail_side_thick = 3;

    u = findU(dev_h, rail_thickness);
    rail_bottom = railBottomThickness(u, dev_h, rail_thickness, "middle");

    // Left rail
    translate([-dev_w/2 - rail_side_thick, dev_h/2, 0])
    rotate([90, 0, 0])
    side_support_rail_base(
        top = true,
        recess = false,
        supportedZ = dev_h,
        supportedY = dev_d,
        supportedX = dev_w,
        zOrientation = "middle",
        defaultThickness = rail_thickness,
        railSideThickness = rail_side_thick,
        sideVent = true
    );

    // Right rail (mirrored)
    translate([dev_w/2, dev_h/2, 0])
    rotate([90, 0, 0])
    mirror([1, 0, 0])
    side_support_rail_base(
        top = true,
        recess = false,
        supportedZ = dev_h,
        supportedY = dev_d,
        supportedX = dev_w,
        zOrientation = "middle",
        defaultThickness = rail_thickness,
        railSideThickness = rail_side_thick,
        sideVent = true
    );
}

// ============================================================================
// DEVICE CUTOUT MODULE
// ============================================================================

module _rg_device_cutout(w, h, plate_thick, clearance) {
    translate([-w/2 - clearance/2, 0, -h/2 - clearance/2])
    cube([w + clearance, plate_thick + 2*_RG_EPS, h + clearance]);
}

// ============================================================================
// PREVIEW MODULES
// ============================================================================

module _rg_preview_devices(devices, center_x, center_z, plate_thick) {
    colors = ["SteelBlue", "DarkSlateGray", "Coral", "Gold", "LimeGreen",
              "MediumPurple", "Tomato", "Teal"];

    for (i = [0 : len(devices) - 1]) {
        dev = devices[i];
        dev_w = _get_dev_w(dev);
        dev_h = _get_dev_h(dev);
        dev_d = _get_dev_d(dev);

        color(colors[i % len(colors)], 0.7)
        translate([center_x + _get_dev_x(dev) - dev_w/2,
                   plate_thick + 5,
                   center_z + _get_dev_y(dev) - dev_h/2])
        cube([dev_w, dev_d - 10, dev_h]);
    }
}

module _rg_preview_labels(devices, center_x, center_z) {
    for (i = [0 : len(devices) - 1]) {
        dev = devices[i];
        name = _get_dev_name(dev);

        color("White")
        translate([center_x + _get_dev_x(dev), -0.5, center_z + _get_dev_y(dev)])
        rotate([90, 0, 0])
        linear_extrude(0.5)
        text(name, size = 5, halign = "center", valign = "center");
    }
}
