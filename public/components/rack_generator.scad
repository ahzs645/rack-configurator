/*
 * Rack Scad - Rack Generator
 * Template module for easily creating rack mount faceplates
 *
 * This module provides a declarative way to define rack mounts using
 * a device configuration list instead of manually positioning each device.
 *
 * Usage Example:
 *   devices = [
 *       // [device_id or "custom", offset_x, offset_y, mount_type, custom_dims]
 *       ["minisforum_um890", 0, 0, "cage"],
 *       ["ucg_fiber", 0, -15, "cage"],
 *       ["custom", 60, 20, "passthrough", [25, 20, 90]],  // custom dimensions
 *   ];
 *
 *   rack_faceplate(
 *       rack_u = 2,
 *       devices = devices,
 *       ear_style = "toolless"
 *   );
 *
 * Mount Types:
 *   - "cage"       : Full cage with honeycomb ventilation (cage_structure)
 *   - "cage_rect"  : Full cage with rectangular slot ventilation
 *   - "cage_open"  : Open cage - just side walls, no front block (like Example 7)
 *   - "enclosed"   : Enclosed box with side rails
 *   - "angle"      : L-bracket style sides
 *   - "simple"     : Basic box enclosure
 *   - "passthrough": Thin frame for pass-through devices
 *   - "tray"       : Open tray mount
 *   - "none"       : Cutout only, no mount structure
 *
 * License: CC BY-NC-SA 4.0
 */

use <utilities.scad>
use <cage.scad>
use <custom_mounts.scad>
use <joiners.scad>
use <rack_ears.scad>
include <constants.scad>
include <devices.scad>
use <../rack_mounts/enclosed_box.scad>

// ============================================================================
// CONFIGURATION DEFAULTS
// ============================================================================

// Default cage settings
_RG_DEFAULT_CLEARANCE = 1.0;
_RG_DEFAULT_HEX_DIA = 8;
_RG_DEFAULT_HEX_WALL = 2;
_RG_DEFAULT_PLATE_THICK = 4;
_RG_DEFAULT_HEAVY = 0;

_RG_EPS = 0.01;

// ============================================================================
// DEVICE CONFIGURATION HELPERS
// ============================================================================

// Extract device dimensions - handles both library devices and custom
// device_entry: [device_id, offset_x, offset_y, mount_type] or
//               ["custom", offset_x, offset_y, mount_type, [w, h, d]]
function _get_dev_dims(device_entry) =
    device_entry[0] == "custom"
        ? device_entry[4]
        : get_device(device_entry[0]);

function _get_dev_w(device_entry) = _get_dev_dims(device_entry)[0];
function _get_dev_h(device_entry) = _get_dev_dims(device_entry)[1];
function _get_dev_d(device_entry) = _get_dev_dims(device_entry)[2];
function _get_dev_x(device_entry) = device_entry[1];
function _get_dev_y(device_entry) = device_entry[2];
function _get_dev_mount(device_entry) = device_entry[3];
function _get_dev_name(device_entry) =
    device_entry[0] == "custom"
        ? (len(device_entry) > 5 ? device_entry[5] : "Custom")
        : device_name(device_entry[0]);

// ============================================================================
// MAIN RACK FACEPLATE MODULE
// Creates a complete single-piece rack faceplate with devices
//
// Parameters:
//   rack_u        - Rack units (1U, 2U, etc.)
//   devices       - Array of device configurations (see format above)
//   plate_thick   - Faceplate thickness
//   corner_radius - Corner rounding (0 for square)
//   ear_style     - "toolless", "fusion", "simple", "none"
//   ear_thickness - Thickness for toolless/fusion ears
//   ear_position  - "bottom", "top", "center"
//   clearance     - Device clearance
//   hex_diameter  - Honeycomb hole size
//   hex_wall      - Honeycomb wall thickness
//   heavy_device  - Wall thickness level (0, 1, 2)
//   back_style    - Back plate style: "solid", "vent", "none"
//   cutout_edge   - Edge margin for rectangular vent cutouts
//   cutout_radius - Corner radius for rectangular vent cutouts
//   show_preview  - Show device preview boxes
//   show_labels   - Show device labels
// ============================================================================

module rack_faceplate(
    rack_u = 1,
    devices = [],
    plate_thick = _RG_DEFAULT_PLATE_THICK,
    corner_radius = 0,
    ear_style = "toolless",
    ear_thickness = 2.9,
    ear_position = "bottom",
    clearance = _RG_DEFAULT_CLEARANCE,
    hex_diameter = _RG_DEFAULT_HEX_DIA,
    hex_wall = _RG_DEFAULT_HEX_WALL,
    heavy_device = _RG_DEFAULT_HEAVY,
    back_style = "vent",  // "solid", "vent", "none"
    cutout_edge = 5,
    cutout_radius = 5,
    show_preview = true,
    show_labels = true
) {
    height = rack_height(rack_u);
    width = EIA_19_PANEL_WIDTH;
    center_x = width / 2;
    center_z = height / 2;

    difference() {
        union() {
            // Base faceplate
            _rg_faceplate_base(width, height, plate_thick, corner_radius);

            // Rack ears
            if (ear_style != "none") {
                _rg_rack_ears(
                    width, height, plate_thick,
                    ear_style, ear_thickness, ear_position, rack_u
                );
            }

            // Device mount structures
            for (i = [0 : len(devices) - 1]) {
                dev = devices[i];
                mount_type = _get_dev_mount(dev);

                if (mount_type != "none") {
                    translate([center_x, 0, center_z])
                    rotate([-90, 0, 0])
                    _rg_device_mount(
                        dev,
                        plate_thick,
                        clearance,
                        heavy_device,
                        hex_diameter,
                        hex_wall,
                        back_style,
                        cutout_edge,
                        cutout_radius
                    );
                }
            }
        }

        // Device cutouts
        for (i = [0 : len(devices) - 1]) {
            dev = devices[i];
            translate([center_x + _get_dev_x(dev), -_RG_EPS, center_z + _get_dev_y(dev)])
            _rg_device_cutout(_get_dev_w(dev), _get_dev_h(dev), plate_thick, clearance);
        }
    }

    // Preview boxes
    if ($preview && show_preview) {
        _rg_preview_devices(devices, center_x, center_z, plate_thick);
    }

    // Labels
    if ($preview && show_labels) {
        _rg_preview_labels(devices, center_x, center_z);
    }
}

// ============================================================================
// SPLIT RACK FACEPLATE MODULE
// Creates a two-piece rack faceplate that joins in the middle
//
// Parameters:
//   (same as rack_faceplate plus:)
//   split_x       - X position of the split (default: auto-center)
//   left_devices  - Devices for left half
//   right_devices - Devices for right half
//   render_part   - "left", "right", "both", "left_print", "right_print"
// ============================================================================

module rack_faceplate_split(
    rack_u = 1,
    left_devices = [],
    right_devices = [],
    split_x = 0,  // 0 = auto-calculate center
    plate_thick = _RG_DEFAULT_PLATE_THICK,
    corner_radius = 0,
    ear_style = "toolless",
    ear_thickness = 2.9,
    ear_position = "bottom",
    clearance = _RG_DEFAULT_CLEARANCE,
    hex_diameter = _RG_DEFAULT_HEX_DIA,
    hex_wall = _RG_DEFAULT_HEX_WALL,
    heavy_device = _RG_DEFAULT_HEAVY,
    back_style = "vent",
    cutout_edge = 5,
    cutout_radius = 5,
    show_preview = true,
    show_labels = true,
    render_part = "both"
) {
    height = rack_height(rack_u);
    total_width = EIA_19_PANEL_WIDTH;

    // Auto-calculate split point or use provided
    left_width = split_x > 0 ? split_x : total_width / 2;
    right_width = total_width - left_width;

    if (render_part == "left" || render_part == "both" || render_part == "left_print") {
        _render_transform = render_part == "left_print" ? [0, 0, 0] : [0, 0, 0];
        _render_rotate = render_part == "left_print";

        if (_render_rotate) {
            rotate([90, 0, 0])
            _rg_split_half_left(
                rack_u, left_width, height, left_devices,
                plate_thick, corner_radius, ear_style, ear_thickness, ear_position,
                clearance, hex_diameter, hex_wall, heavy_device, back_style,
                cutout_edge, cutout_radius, show_preview, show_labels
            );
        } else {
            color("SteelBlue")
            _rg_split_half_left(
                rack_u, left_width, height, left_devices,
                plate_thick, corner_radius, ear_style, ear_thickness, ear_position,
                clearance, hex_diameter, hex_wall, heavy_device, back_style,
                cutout_edge, cutout_radius, show_preview, show_labels
            );
        }
    }

    if (render_part == "right" || render_part == "both" || render_part == "right_print") {
        _render_rotate = render_part == "right_print";
        _offset = render_part == "right_print" ? left_width + 20 : left_width;

        translate([_offset, 0, 0])
        if (_render_rotate) {
            rotate([90, 0, 0])
            _rg_split_half_right(
                rack_u, right_width, height, right_devices,
                plate_thick, corner_radius, ear_style, ear_thickness, ear_position,
                clearance, hex_diameter, hex_wall, heavy_device, back_style,
                cutout_edge, cutout_radius, show_preview, show_labels
            );
        } else {
            color("Coral")
            _rg_split_half_right(
                rack_u, right_width, height, right_devices,
                plate_thick, corner_radius, ear_style, ear_thickness, ear_position,
                clearance, hex_diameter, hex_wall, heavy_device, back_style,
                cutout_edge, cutout_radius, show_preview, show_labels
            );
        }
    }

    // Preview for both halves
    if ($preview && (render_part == "both" || render_part == "left" || render_part == "right")) {
        if (show_preview) {
            _rg_preview_devices(left_devices, left_width/2, height/2, plate_thick);
            _rg_preview_devices(right_devices, left_width + right_width/2, height/2, plate_thick);
        }
        if (show_labels) {
            _rg_preview_labels(left_devices, left_width/2, height/2);
            _rg_preview_labels(right_devices, left_width + right_width/2, height/2);
        }
    }
}

// ============================================================================
// INTERNAL MODULES
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

// Rack ear placement
module _rg_rack_ears(width, height, plate_thick, style, thickness, position, rack_u) {
    if (style == "toolless") {
        // Left ear
        positioned_rack_hook(
            thickness = thickness,
            rack_height = height,
            position = position,
            side = "left"
        );
        // Right ear
        translate([width, 0, 0])
        positioned_rack_hook(
            thickness = thickness,
            rack_height = height,
            position = position,
            side = "right"
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

// Device mount structure dispatcher
// back_style: "solid" = solid back, "vent" = ventilated back, "none" = no back
module _rg_device_mount(
    device_entry,
    plate_thick,
    clearance,
    heavy,
    hex_dia,
    hex_wall,
    back_style,
    cutout_edge = 5,
    cutout_radius = 5
) {
    dev_w = _get_dev_w(device_entry);
    dev_h = _get_dev_h(device_entry);
    dev_d = _get_dev_d(device_entry);
    offset_x = _get_dev_x(device_entry);
    offset_y = -_get_dev_y(device_entry);  // Flip Y for cage coords
    mount_type = _get_dev_mount(device_entry);

    // Convert back_style string to cage parameters
    _back_open = (back_style == "vent");
    _no_back = (back_style == "none");

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
        // Open cage - side walls only, no front reinforcing block
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
        translate([offset_x - dev_w/2, offset_y - dev_h/2, plate_thick])
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
        // Ventilated shelf with lips
        ventilated_shelf_positioned(
            offset_x, offset_y,
            dev_w, dev_d,
            3, 5, true, true, plate_thick
        );
    }
    else if (mount_type == "storage" || mount_type == "storage_tray") {
        // Deep storage tray
        storage_tray_positioned(
            offset_x, offset_y,
            dev_w, dev_d,
            dev_h,  // Use device height as wall height
            0, plate_thick
        );
    }
}

// Enclosed box using library rails
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
        defaultThickness = rail_thickness,
        supportedZ = dev_h,
        supportedY = dev_d,
        supportedX = dev_w,
        zOrientation = "middle",
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
        defaultThickness = rail_thickness,
        supportedZ = dev_h,
        supportedY = dev_d,
        supportedX = dev_w,
        zOrientation = "middle",
        railSideThickness = rail_side_thick,
        sideVent = true
    );
}

// Device cutout in faceplate
module _rg_device_cutout(w, h, plate_thick, clearance) {
    translate([-w/2 - clearance/2, 0, -h/2 - clearance/2])
    cube([w + clearance, plate_thick + 2*_RG_EPS, h + clearance]);
}

// Preview device boxes
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

// Preview device labels
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

// ============================================================================
// SPLIT HALF MODULES
// ============================================================================

module _rg_split_half_left(
    rack_u, width, height, devices,
    plate_thick, corner_radius, ear_style, ear_thickness, ear_position,
    clearance, hex_dia, hex_wall, heavy, back_style,
    cutout_edge, cutout_radius, show_preview, show_labels
) {
    center_x = width / 2;
    center_z = height / 2;

    difference() {
        union() {
            // Faceplate - rounded on left, flat on right
            _rg_faceplate_left(width, height, plate_thick, corner_radius);

            // Left rack ear
            if (ear_style != "none") {
                _rg_rack_ear_single(
                    height, plate_thick, ear_style, ear_thickness, ear_position, rack_u,
                    "left", 0
                );
            }

            // Joiner wall
            translate([width, 0, height/2])
            rotate([-90, 0, 0])
            joiner_wall_addon(unit_height = rack_u, side = "left");

            // Device mounts
            for (i = [0 : len(devices) - 1]) {
                dev = devices[i];
                if (_get_dev_mount(dev) != "none") {
                    translate([center_x, 0, center_z])
                    rotate([-90, 0, 0])
                    _rg_device_mount(
                        dev, plate_thick, clearance, heavy,
                        hex_dia, hex_wall, back_style,
                        cutout_edge, cutout_radius
                    );
                }
            }
        }

        // Device cutouts
        for (i = [0 : len(devices) - 1]) {
            dev = devices[i];
            translate([center_x + _get_dev_x(dev), -_RG_EPS, center_z + _get_dev_y(dev)])
            _rg_device_cutout(_get_dev_w(dev), _get_dev_h(dev), plate_thick, clearance);
        }
    }
}

module _rg_split_half_right(
    rack_u, width, height, devices,
    plate_thick, corner_radius, ear_style, ear_thickness, ear_position,
    clearance, hex_dia, hex_wall, heavy, back_style,
    cutout_edge, cutout_radius, show_preview, show_labels
) {
    center_x = width / 2;
    center_z = height / 2;

    difference() {
        union() {
            // Faceplate - flat on left, rounded on right
            _rg_faceplate_right(width, height, plate_thick, corner_radius);

            // Right rack ear
            if (ear_style != "none") {
                _rg_rack_ear_single(
                    height, plate_thick, ear_style, ear_thickness, ear_position, rack_u,
                    "right", width
                );
            }

            // Joiner wall
            translate([0, 0, height/2])
            rotate([-90, 0, 0])
            joiner_wall_addon(unit_height = rack_u, side = "right");

            // Device mounts
            for (i = [0 : len(devices) - 1]) {
                dev = devices[i];
                if (_get_dev_mount(dev) != "none") {
                    translate([center_x, 0, center_z])
                    rotate([-90, 0, 0])
                    _rg_device_mount(
                        dev, plate_thick, clearance, heavy,
                        hex_dia, hex_wall, back_style,
                        cutout_edge, cutout_radius
                    );
                }
            }
        }

        // Device cutouts
        for (i = [0 : len(devices) - 1]) {
            dev = devices[i];
            translate([center_x + _get_dev_x(dev), -_RG_EPS, center_z + _get_dev_y(dev)])
            _rg_device_cutout(_get_dev_w(dev), _get_dev_h(dev), plate_thick, clearance);
        }
    }
}

// Single rack ear for split panels
module _rg_rack_ear_single(height, plate_thick, style, thickness, position, rack_u, side, x_offset) {
    if (style == "toolless") {
        translate([x_offset, 0, 0])
        positioned_rack_hook(
            thickness = thickness,
            rack_height = height,
            position = position,
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
// UTILITY FUNCTIONS
// ============================================================================

// Calculate minimum width needed to fit all devices
function calc_min_width(devices) =
    let(
        positions = [for (d = devices) abs(_get_dev_x(d)) + _get_dev_w(d)/2]
    )
    max(positions) * 2 + 20;

// Calculate minimum height needed to fit all devices
function calc_min_height(devices) =
    let(
        positions = [for (d = devices) abs(_get_dev_y(d)) + _get_dev_h(d)/2]
    )
    max(positions) * 2 + 10;

// Calculate suggested split point for devices
function calc_split_point(left_devices, right_devices) =
    let(
        left_max = max([for (d = left_devices) abs(_get_dev_x(d)) + _get_dev_w(d)/2]),
        right_max = max([for (d = right_devices) abs(_get_dev_x(d)) + _get_dev_w(d)/2])
    )
    left_max + 20;
