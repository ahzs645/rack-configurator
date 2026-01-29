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
 *   - "cage_open"  : Open cage - just side walls, no front block
 *   - "enclosed"   : Enclosed box with side rails
 *   - "angle"      : L-bracket style sides
 *   - "simple"     : Basic box enclosure
 *   - "passthrough": Thin frame for pass-through devices
 *   - "tray"       : Open tray mount
 *   - "shelf"      : Enhanced shelf with honeycomb, supports, LED notch
 *   - "storage"    : Deep storage tray
 *   - "patch_panel": Keystone patch panel
 *   - "pi5_case"   : Raspberry Pi 5 case mount
 *   - "none"       : Cutout only, no mount structure
 *
 * License: CC BY-NC-SA 4.0
 */

// Include internal modules (which includes helpers and all dependencies)
include <rack_generator_internal.scad>
include <rack_generator_split.scad>

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
    panel_width = 0,  // 0 = use standard EIA_19_PANEL_WIDTH (450.85mm)
    devices = [],
    plate_thick = _RG_DEFAULT_PLATE_THICK,
    corner_radius = 0,
    ear_style = "toolless",
    ear_thickness = 2.9,
    ear_position = "bottom",
    hook_pattern = [true],  // Array of booleans for toolless hook positions
    trim_pattern = [],      // Array of booleans for sections to trim (when hook is disabled)
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
    width = panel_width > 0 ? panel_width : EIA_19_PANEL_WIDTH;
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
                    ear_style, ear_thickness, ear_position, rack_u, hook_pattern
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

        // Trim notches for hookless sections
        if (ear_style == "toolless" && len(trim_pattern) > 0) {
            _rg_trim_notches(width, height, plate_thick, hook_pattern, trim_pattern, ear_thickness, rack_u);
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
