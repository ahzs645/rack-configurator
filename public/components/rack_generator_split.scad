/*
 * Rack Scad - Rack Generator Split Modules
 * Two-piece rack faceplate that joins in the middle
 *
 * License: CC BY-NC-SA 4.0
 */

use <joiners.scad>
include <rack_generator_internal.scad>

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
    panel_width = 0,
    left_devices = [],
    right_devices = [],
    split_x = 0,
    plate_thick = _RG_DEFAULT_PLATE_THICK,
    corner_radius = 0,
    ear_style = "toolless",
    ear_thickness = 2.9,
    ear_position = "bottom",
    hook_pattern = [true],
    trim_pattern = [],
    clearance = _RG_DEFAULT_CLEARANCE,
    hex_diameter = _RG_DEFAULT_HEX_DIA,
    hex_wall = _RG_DEFAULT_HEX_WALL,
    heavy_device = _RG_DEFAULT_HEAVY,
    back_style = "vent",
    cutout_edge = 5,
    cutout_radius = 5,
    show_preview = true,
    show_labels = true,
    render_part = "both",
    joiner_type = "screw",
    joiner_nut_side = "right",
    joiner_nut_depth = 4.5,
    joiner_screw_type = "M5",
    joiner_nut_floor = 0
) {
    height = rack_height(rack_u);
    total_width = panel_width > 0 ? panel_width : EIA_19_PANEL_WIDTH;

    left_width = total_width / 2 + split_x;
    right_width = total_width - left_width;

    full_center_x = total_width / 2;

    if (render_part == "left" || render_part == "both" || render_part == "left_print") {
        _render_rotate = render_part == "left_print";

        if (_render_rotate) {
            rotate([90, 0, 0])
            _rg_split_half_left(
                rack_u, left_width, height, left_devices,
                plate_thick, corner_radius, ear_style, ear_thickness, ear_position, hook_pattern, trim_pattern,
                clearance, hex_diameter, hex_wall, heavy_device, back_style,
                cutout_edge, cutout_radius, show_preview, show_labels,
                full_center_x,
                joiner_type, joiner_nut_side, joiner_nut_depth, joiner_screw_type, joiner_nut_floor
            );
        } else {
            color("SteelBlue")
            _rg_split_half_left(
                rack_u, left_width, height, left_devices,
                plate_thick, corner_radius, ear_style, ear_thickness, ear_position, hook_pattern, trim_pattern,
                clearance, hex_diameter, hex_wall, heavy_device, back_style,
                cutout_edge, cutout_radius, show_preview, show_labels,
                full_center_x,
                joiner_type, joiner_nut_side, joiner_nut_depth, joiner_screw_type, joiner_nut_floor
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
                plate_thick, corner_radius, ear_style, ear_thickness, ear_position, hook_pattern, trim_pattern,
                clearance, hex_diameter, hex_wall, heavy_device, back_style,
                cutout_edge, cutout_radius, show_preview, show_labels,
                full_center_x, left_width,
                joiner_type, joiner_nut_side, joiner_nut_depth, joiner_screw_type, joiner_nut_floor
            );
        } else {
            color("Coral")
            _rg_split_half_right(
                rack_u, right_width, height, right_devices,
                plate_thick, corner_radius, ear_style, ear_thickness, ear_position, hook_pattern, trim_pattern,
                clearance, hex_diameter, hex_wall, heavy_device, back_style,
                cutout_edge, cutout_radius, show_preview, show_labels,
                full_center_x, left_width,
                joiner_type, joiner_nut_side, joiner_nut_depth, joiner_screw_type, joiner_nut_floor
            );
        }
    }

    // Preview for both halves
    if ($preview && (render_part == "both" || render_part == "left" || render_part == "right")) {
        if (show_preview) {
            _rg_preview_devices(left_devices, full_center_x, height/2, plate_thick);
            _rg_preview_devices(right_devices, full_center_x, height/2, plate_thick);
        }
        if (show_labels) {
            _rg_preview_labels(left_devices, full_center_x, height/2);
            _rg_preview_labels(right_devices, full_center_x, height/2);
        }
    }
}

// ============================================================================
// SPLIT HALF MODULES
// ============================================================================

module _rg_split_half_left(
    rack_u, width, height, devices,
    plate_thick, corner_radius, ear_style, ear_thickness, ear_position, hook_pattern, trim_pattern = [],
    clearance, hex_dia, hex_wall, heavy, back_style,
    cutout_edge, cutout_radius, show_preview, show_labels,
    full_center_x = undef,
    joiner_type = "screw",
    joiner_nut_side = "right",
    joiner_nut_depth = 4.5,
    joiner_screw_type = "M5",
    joiner_nut_floor = 0
) {
    center_x = full_center_x != undef ? full_center_x : width / 2;
    center_z = height / 2;

    difference() {
        union() {
            _rg_faceplate_left(width, height, plate_thick, corner_radius);

            if (ear_style != "none") {
                _rg_rack_ear_single(
                    height, plate_thick, ear_style, ear_thickness, ear_position, rack_u,
                    "left", 0, hook_pattern
                );
            }

            translate([width, 0, height/2])
            rotate([-90, 0, 0])
            if (joiner_type == "dovetail") {
                dovetail_wall_addon(unit_height = rack_u, side = "left");
            } else {
                joiner_wall_addon(unit_height = rack_u, side = "left", nut_side = joiner_nut_side, nut_pocket_depth = joiner_nut_depth, screw_type = joiner_screw_type, nut_floor = joiner_nut_floor);
            }

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

        for (i = [0 : len(devices) - 1]) {
            dev = devices[i];
            translate([center_x + _get_dev_x(dev), -_RG_EPS, center_z + _get_dev_y(dev)])
            _rg_device_cutout(_get_dev_w(dev), _get_dev_h(dev), plate_thick, clearance);
        }

        if (ear_style == "toolless" && len(trim_pattern) > 0) {
            _rg_trim_notches_left(width, height, plate_thick, hook_pattern, trim_pattern, ear_thickness, rack_u);
        }
    }
}

module _rg_split_half_right(
    rack_u, width, height, devices,
    plate_thick, corner_radius, ear_style, ear_thickness, ear_position, hook_pattern, trim_pattern = [],
    clearance, hex_dia, hex_wall, heavy, back_style,
    cutout_edge, cutout_radius, show_preview, show_labels,
    full_center_x = undef,
    left_width = 0,
    joiner_type = "screw",
    joiner_nut_side = "right",
    joiner_nut_depth = 4.5,
    joiner_screw_type = "M5",
    joiner_nut_floor = 0
) {
    center_x = full_center_x != undef ? full_center_x - left_width : width / 2;
    center_z = height / 2;

    difference() {
        union() {
            _rg_faceplate_right(width, height, plate_thick, corner_radius);

            if (ear_style != "none") {
                _rg_rack_ear_single(
                    height, plate_thick, ear_style, ear_thickness, ear_position, rack_u,
                    "right", width, hook_pattern
                );
            }

            translate([0, 0, height/2])
            rotate([-90, 0, 0])
            if (joiner_type == "dovetail") {
                dovetail_wall_addon(unit_height = rack_u, side = "right");
            } else {
                joiner_wall_addon(unit_height = rack_u, side = "right", nut_side = joiner_nut_side, nut_pocket_depth = joiner_nut_depth, screw_type = joiner_screw_type, nut_floor = joiner_nut_floor);
            }

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

        for (i = [0 : len(devices) - 1]) {
            dev = devices[i];
            translate([center_x + _get_dev_x(dev), -_RG_EPS, center_z + _get_dev_y(dev)])
            _rg_device_cutout(_get_dev_w(dev), _get_dev_h(dev), plate_thick, clearance);
        }

        if (ear_style == "toolless" && len(trim_pattern) > 0) {
            _rg_trim_notches_right(width, height, plate_thick, hook_pattern, trim_pattern, ear_thickness, rack_u);
        }
    }
}
