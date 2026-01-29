/*
 * Rack Scad - Rack Generator Helpers
 * Device configuration helpers and utility functions
 *
 * License: CC BY-NC-SA 4.0
 */

include <devices.scad>

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

// Get per-device back style (returns "default" if not specified)
// Standard device: ["device_id", offsetX, offsetY, mountType, backStyle]
// Custom device: ["custom", offsetX, offsetY, mountType, [w,h,d], "name", backStyle]
function _get_dev_back_style(device_entry) =
    device_entry[0] == "custom"
        ? (len(device_entry) > 6 ? device_entry[6] : "default")
        : (len(device_entry) > 4 ? device_entry[4] : "default");

// Get patch panel port count (returns 6 if not specified)
// Standard device with patch panel: ["device_id", offsetX, offsetY, mountType, backStyle, patchPanelPorts]
// Custom device with patch panel: ["custom", offsetX, offsetY, mountType, [w,h,d], "name", backStyle, patchPanelPorts]
function _get_dev_patch_ports(device_entry) =
    device_entry[0] == "custom"
        ? (len(device_entry) > 7 ? device_entry[7] : 6)
        : (len(device_entry) > 5 ? device_entry[5] : 6);

// Get shelf params array (returns defaults if not specified)
// Standard device with shelf: ["device_id", offsetX, offsetY, "shelf", backStyle, [shelfParams]]
// Custom device with shelf: ["custom", offsetX, offsetY, "shelf", [w,h,d], "name", backStyle, [shelfParams]]
// shelfParams = [useHoneycomb, notch, notchWidth, screwHoles, cableHolesLeft, cableHolesRight,
//                solidBottom, standoffs, standoffCountersink, standoffReinforced, pullHandle, pcbPreset]
function _get_dev_shelf_params(device_entry) =
    let(
        raw_params = device_entry[0] == "custom"
            ? (len(device_entry) > 7 ? device_entry[7] : [])
            : (len(device_entry) > 5 ? device_entry[5] : [])
    )
    len(raw_params) >= 6 ? raw_params : [true, "none", 100, 0, 0, 0, false, [], false, false, false, []];

// Extract individual shelf params with defaults
function _shelf_use_honeycomb(params) = len(params) > 0 ? params[0] : true;
function _shelf_notch(params) = len(params) > 1 ? params[1] : "none";
function _shelf_notch_width(params) = len(params) > 2 ? params[2] : 100;
function _shelf_screw_holes(params) = len(params) > 3 ? params[3] : 0;
function _shelf_cable_left(params) = len(params) > 4 ? params[4] : 0;
function _shelf_cable_right(params) = len(params) > 5 ? params[5] : 0;
function _shelf_solid_bottom(params) = len(params) > 6 ? params[6] : false;
function _shelf_standoffs(params) = len(params) > 7 ? params[7] : [];
function _shelf_standoff_countersink(params) = len(params) > 8 ? params[8] : false;
function _shelf_standoff_reinforced(params) = len(params) > 9 ? params[9] : false;
function _shelf_pull_handle(params) = len(params) > 10 ? params[10] : false;
function _shelf_pcb_preset(params) = len(params) > 11 ? params[11] : [];

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
