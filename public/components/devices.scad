/*
 * Rack Scad - Device Dimension Database
 * Centralized storage for common device measurements
 *
 * Usage:
 *   include <components/devices.scad>
 *   dims = get_device("minisforum_um890");
 *   width = dims[0]; height = dims[1]; depth = dims[2];
 *
 * Or use helper functions:
 *   w = device_width("minisforum_um890");
 *   h = device_height("minisforum_um890");
 *   d = device_depth("minisforum_um890");
 */

// ============================================================================
// DEVICE DATABASE
// Format: ["device_id", [width, height, depth], "Display Name", "Category"]
// Dimensions are in mm: [face_width, face_height, depth]
// ============================================================================

DEVICES = [
    // -------------------------------------------------------------------------
    // Rack Accessories
    // -------------------------------------------------------------------------
    ["patch_panel",          [114, 30, 15],   "Keystone Patch Panel",           "accessories"],

    // -------------------------------------------------------------------------
    // Mini PCs / NUCs
    // -------------------------------------------------------------------------
    ["minisforum_um890",     [128, 52, 126],  "Minisforum UM890 Pro",    "mini_pc"],
    ["minisforum_um780",     [127, 47, 128],  "Minisforum UM780 XTX",    "mini_pc"],
    ["minisforum_ms01",      [196, 35, 188],  "Minisforum MS-01",        "mini_pc"],
    ["intel_nuc_11",         [117, 37, 112],  "Intel NUC 11",            "mini_pc"],
    ["intel_nuc_12",         [117, 37, 112],  "Intel NUC 12",            "mini_pc"],
    ["beelink_ser5",         [126, 42, 113],  "Beelink SER5",            "mini_pc"],
    ["beelink_eq12",         [115, 42, 102],  "Beelink EQ12",            "mini_pc"],
    ["geekom_mini_it13",     [117, 37, 112],  "GEEKOM Mini IT13",        "mini_pc"],

    // -------------------------------------------------------------------------
    // Network Equipment - Ubiquiti
    // -------------------------------------------------------------------------
    ["ucg_fiber",            [213, 30, 128],  "Ubiquiti UCG-Fiber",             "network"],
    ["ucg_ultra",            [134, 34, 106],  "Ubiquiti UCG-Ultra",             "network"],
    ["udm_se",               [442, 43, 312],  "Ubiquiti Dream Machine SE",      "network"],
    ["usw_flex_mini",        [109, 26, 81],   "Ubiquiti USW-Flex-Mini",         "network"],
    ["usw_lite_8_poe",       [200, 32, 115],  "Ubiquiti USW-Lite-8-PoE",        "network"],
    ["usw_lite_16_poe",      [296, 32, 174],  "Ubiquiti USW-Lite-16-PoE",       "network"],
    ["uap_ac_lite",          [160, 31, 160],  "Ubiquiti UAP-AC-Lite",           "network"],

    // -------------------------------------------------------------------------
    // Network Equipment - Other
    // -------------------------------------------------------------------------
    ["mikrotik_hex",         [113, 29, 89],   "MikroTik hEX",                   "network"],
    ["mikrotik_rb5009",      [220, 30, 145],  "MikroTik RB5009UG+S+IN",         "network"],
    ["tp_link_er605",        [158, 25, 101],  "TP-Link ER605",                  "network"],
    ["netgear_gs108",        [158, 27, 101],  "Netgear GS108",                  "network"],

    // -------------------------------------------------------------------------
    // KVM / Remote Management
    // -------------------------------------------------------------------------
    ["jetkvm",               [43, 31, 60],    "JetKVM",                  "kvm"],
    ["pikvm_v4_plus",        [91, 37, 63],    "PiKVM V4 Plus",           "kvm"],
    ["pikvm_v4_mini",        [68, 23, 68],    "PiKVM V4 Mini",           "kvm"],
    ["tinypilot_voyager2",   [83, 30, 85],    "TinyPilot Voyager 2",     "kvm"],

    // -------------------------------------------------------------------------
    // Smart Home Controllers
    // -------------------------------------------------------------------------
    ["lutron_caseta",        [70, 31, 70],    "Lutron Caseta Smart Bridge",     "smart_home"],
    ["lutron_ra2_select",    [105, 34, 105],  "Lutron RA2 Select Main Repeater","smart_home"],
    ["hue_bridge",           [88, 26, 88],    "Philips Hue Bridge",             "smart_home"],
    ["homey_pro",            [110, 46, 110],  "Homey Pro",                      "smart_home"],
    ["hubitat_c8",           [130, 28, 130],  "Hubitat Elevation C-8",          "smart_home"],
    ["home_assistant_yellow",[125, 37, 125],  "Home Assistant Yellow",          "smart_home"],
    ["home_assistant_green", [112, 29, 112],  "Home Assistant Green",           "smart_home"],

    // -------------------------------------------------------------------------
    // Zigbee / Z-Wave Coordinators
    // -------------------------------------------------------------------------
    ["slzb_06",              [23.4, 20, 90],  "SLZB-06 Zigbee",          "coordinator"],
    ["slzb_06m",             [35, 25, 70],    "SLZB-06M Zigbee",         "coordinator"],
    ["sonoff_zbdongle_p",    [25, 15, 80],    "Sonoff ZBDongle-P",       "coordinator"],
    ["sonoff_zbdongle_e",    [26, 13, 80],    "Sonoff ZBDongle-E",       "coordinator"],
    ["conbee_ii",            [22, 6, 70],     "ConBee II",               "coordinator"],
    ["skyconnect",           [22, 8, 45],     "Home Assistant SkyConnect","coordinator"],
    ["zooz_zst10",           [20, 9, 50],     "Zooz ZST10 Z-Wave",       "coordinator"],

    // -------------------------------------------------------------------------
    // Single Board Computers
    // -------------------------------------------------------------------------
    ["raspberry_pi_5",       [85, 17, 56],    "Raspberry Pi 5",          "sbc"],
    ["raspberry_pi_5_case",  [93, 64, 35],    "Raspberry Pi 5 (Case)",   "sbc"],
    ["raspberry_pi_4",       [85, 17, 56],    "Raspberry Pi 4",          "sbc"],
    ["raspberry_pi_zero_2w", [65, 5, 30],     "Raspberry Pi Zero 2 W",   "sbc"],
    ["orange_pi_5",          [100, 17, 62],   "Orange Pi 5",             "sbc"],
    ["odroid_h3_plus",       [110, 39, 110],  "ODROID-H3+",              "sbc"],
    ["rock_5b",              [100, 17, 72],   "Rock 5B",                 "sbc"],

    // -------------------------------------------------------------------------
    // Storage / NAS
    // -------------------------------------------------------------------------
    ["synology_ds220j",      [165, 108, 225], "Synology DS220j",         "storage"],
    ["synology_ds223",       [165, 108, 225], "Synology DS223",          "storage"],
    ["qnap_ts_233",          [90, 169, 156],  "QNAP TS-233",             "storage"],
    ["terramaster_f2_223",   [119, 133, 227], "TerraMaster F2-223",      "storage"],

    // -------------------------------------------------------------------------
    // Power / UPS
    // -------------------------------------------------------------------------
    ["apc_be425m",           [116, 55, 220],  "APC BE425M UPS",          "power"],
    ["cyberpower_cp425slg",  [99, 87, 261],   "CyberPower CP425SLG",     "power"],
    ["eaton_3s_550",         [100, 90, 280],  "Eaton 3S 550VA",          "power"],
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get full device entry [width, height, depth]
function get_device(device_id) =
    let(idx = search([device_id], DEVICES))
    len(idx) > 0 && idx[0] < len(DEVICES) ? DEVICES[idx[0]][1] : [0, 0, 0];

// Get individual dimensions
function device_width(device_id) = get_device(device_id)[0];
function device_height(device_id) = get_device(device_id)[1];
function device_depth(device_id) = get_device(device_id)[2];

// Get display name
function device_name(device_id) =
    let(idx = search([device_id], DEVICES))
    len(idx) > 0 && idx[0] < len(DEVICES) ? DEVICES[idx[0]][2] : "Unknown";

// Get category
function device_category(device_id) =
    let(idx = search([device_id], DEVICES))
    len(idx) > 0 && idx[0] < len(DEVICES) ? DEVICES[idx[0]][3] : "unknown";

// Check if device exists
function device_exists(device_id) =
    let(idx = search([device_id], DEVICES))
    len(idx) > 0 && idx[0] < len(DEVICES);

// Get all devices in a category
function devices_in_category(category) =
    [for (d = DEVICES) if (d[3] == category) d[0]];

// ============================================================================
// KEYSTONE / PASSTHROUGH DIMENSIONS
// Standard sizes for keystone jacks and passthroughs
// ============================================================================

KEYSTONE_STANDARD = [14.5, 19.5, 20];    // Standard keystone jack opening
KEYSTONE_XL = [17, 22, 25];              // XL keystone opening
USB_PASSTHROUGH = [13, 6, 20];           // USB-A passthrough
USBC_PASSTHROUGH = [9, 3.5, 15];         // USB-C passthrough
HDMI_PASSTHROUGH = [15, 6, 25];          // HDMI passthrough
RJ45_PASSTHROUGH = [16, 14, 22];         // RJ45/Ethernet passthrough

// ============================================================================
// HARD DRIVE / SSD MOUNTING PATTERNS
// Standard screw hole positions for storage drives
// Format: [device_width, device_depth, [[x1,y1], [x2,y2], ...], screw_size, "name"]
// Positions are from bottom-left corner of device
// ============================================================================

HDD_MOUNT_PATTERNS = [
    // 2.5" drives (SSD, laptop HDD) - Standard SATA
    // Device: 70mm x 100mm, M3 screws
    ["hdd_25", 70, 100, [
        [3, 14],              // Front left
        [3 + 61.72, 14],      // Front right (61.72mm width spacing)
        [3, 14 + 76.6],       // Back left (76.6mm depth spacing)
        [3 + 61.72, 14 + 76.6] // Back right
    ], 3, "2.5\" Drive"],

    // 3.5" drives (Desktop HDD) - Standard SATA
    // Device: 101.6mm x 147mm, M3 or 6-32 screws
    ["hdd_35", 101.6, 147, [
        [3.18, 28.5],           // Front left bottom
        [3.18 + 95.25, 28.5],   // Front right bottom
        [3.18, 28.5 + 101.6],   // Back left
        [3.18 + 95.25, 28.5 + 101.6] // Back right
    ], 3, "3.5\" Drive"],

    // M.2 2280 (80mm length) - common SSD form factor
    // Device: 22mm x 80mm, M2 screw
    ["m2_2280", 22, 80, [
        [11, 77]               // Single screw at end
    ], 2, "M.2 2280 SSD"],

    // M.2 2242 (42mm length)
    ["m2_2242", 22, 42, [
        [11, 39]
    ], 2, "M.2 2242 SSD"],
];

// ============================================================================
// SBC (Single Board Computer) MOUNTING PATTERNS
// Screw hole positions for common SBCs
// Format: [device_id, [[x1,y1], [x2,y2], ...], screw_size, standoff_height]
// Positions are from bottom-left corner of PCB
// ============================================================================

SBC_MOUNT_PATTERNS = [
    // Raspberry Pi 4/3 B+ - 85mm x 56mm, M2.5 screws
    // Holes are 3.5mm from edges, 58mm x 49mm spacing
    ["raspberry_pi_4", [
        [3.5, 3.5],
        [3.5 + 58, 3.5],
        [3.5, 3.5 + 49],
        [3.5 + 58, 3.5 + 49]
    ], 2.5, 5],

    // Raspberry Pi 5 - same as Pi 4
    ["raspberry_pi_5", [
        [3.5, 3.5],
        [3.5 + 58, 3.5],
        [3.5, 3.5 + 49],
        [3.5 + 58, 3.5 + 49]
    ], 2.5, 5],

    // Raspberry Pi Zero 2 W - 65mm x 30mm, M2.5 screws
    // Holes at corners, 58mm x 23mm spacing
    ["raspberry_pi_zero_2w", [
        [3.5, 3.5],
        [3.5 + 58, 3.5],
        [3.5, 3.5 + 23],
        [3.5 + 58, 3.5 + 23]
    ], 2.5, 3],

    // Orange Pi 5 - 100mm x 62mm, M2.5 screws
    ["orange_pi_5", [
        [4, 4],
        [4 + 92, 4],
        [4, 4 + 54],
        [4 + 92, 4 + 54]
    ], 2.5, 5],

    // Rock 5B - 100mm x 72mm, M2.5 screws
    ["rock_5b", [
        [4, 4],
        [4 + 92, 4],
        [4, 4 + 64],
        [4 + 92, 4 + 64]
    ], 2.5, 5],

    // ODROID-H3+ - 110mm x 110mm, M3 screws
    ["odroid_h3_plus", [
        [5, 5],
        [5 + 100, 5],
        [5, 5 + 100],
        [5 + 100, 5 + 100]
    ], 3, 6],

    // Intel NUC (standard) - 117mm x 112mm, M3 screws
    // VESA mount pattern: 75mm or 100mm
    ["intel_nuc_11", [
        [21, 18.5],
        [21 + 75, 18.5],
        [21, 18.5 + 75],
        [21 + 75, 18.5 + 75]
    ], 3, 0],

    ["intel_nuc_12", [
        [21, 18.5],
        [21 + 75, 18.5],
        [21, 18.5 + 75],
        [21 + 75, 18.5 + 75]
    ], 3, 0],
];

// ============================================================================
// MOUNTING PATTERN HELPER FUNCTIONS
// ============================================================================

// Get HDD mount pattern by ID
function get_hdd_pattern(pattern_id) =
    let(idx = search([pattern_id], HDD_MOUNT_PATTERNS))
    len(idx) > 0 && idx[0] < len(HDD_MOUNT_PATTERNS) ? HDD_MOUNT_PATTERNS[idx[0]] : undef;

// Get SBC mount pattern by device ID
function get_sbc_pattern(device_id) =
    let(idx = search([device_id], SBC_MOUNT_PATTERNS))
    len(idx) > 0 && idx[0] < len(SBC_MOUNT_PATTERNS) ? SBC_MOUNT_PATTERNS[idx[0]] : undef;

// Get screw positions for a device (returns array of [x,y] positions)
function get_screw_positions(device_id) =
    let(sbc = get_sbc_pattern(device_id))
    sbc != undef ? sbc[1] : [];

// Get screw size for a device
function get_screw_size(device_id) =
    let(sbc = get_sbc_pattern(device_id))
    sbc != undef ? sbc[2] : 3;

// Get recommended standoff height for a device
function get_standoff_height(device_id) =
    let(sbc = get_sbc_pattern(device_id))
    sbc != undef ? sbc[3] : 5;
