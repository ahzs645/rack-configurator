// Device database extracted from OpenSCAD components/devices.scad
// Format: id, dimensions [width, height, depth] in mm, display name, category

import type { MountType } from '../state/types';

export interface RackDevice {
  id: string;
  name: string;
  category: DeviceCategory;
  width: number;   // mm
  height: number;  // mm
  depth: number;   // mm
  allowedMountTypes?: MountType[];  // If specified, only these mount types are allowed
}

export type DeviceCategory =
  | 'accessories'
  | 'mini_pc'
  | 'network'
  | 'kvm'
  | 'smart_home'
  | 'coordinator'
  | 'sbc'
  | 'storage'
  | 'power';

export const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  accessories: 'Rack Accessories',
  mini_pc: 'Mini PCs / NUCs',
  network: 'Network Equipment',
  kvm: 'KVM / Remote Management',
  smart_home: 'Smart Home Controllers',
  coordinator: 'Zigbee / Z-Wave',
  sbc: 'Single Board Computers',
  storage: 'Storage / NAS',
  power: 'Power / UPS',
};

export const DEVICES: RackDevice[] = [
  // Rack Accessories
  { id: 'patch_panel', name: 'Keystone Patch Panel', category: 'accessories', width: 114, height: 30, depth: 15 },

  // Mini PCs / NUCs
  { id: 'minisforum_um890', name: 'Minisforum UM890 Pro', category: 'mini_pc', width: 128, height: 52, depth: 126 },
  { id: 'minisforum_um780', name: 'Minisforum UM780 XTX', category: 'mini_pc', width: 127, height: 47, depth: 128 },
  { id: 'minisforum_ms01', name: 'Minisforum MS-01', category: 'mini_pc', width: 196, height: 35, depth: 188 },
  { id: 'intel_nuc_11', name: 'Intel NUC 11', category: 'mini_pc', width: 117, height: 37, depth: 112 },
  { id: 'intel_nuc_12', name: 'Intel NUC 12', category: 'mini_pc', width: 117, height: 37, depth: 112 },
  { id: 'beelink_ser5', name: 'Beelink SER5', category: 'mini_pc', width: 126, height: 42, depth: 113 },
  { id: 'beelink_eq12', name: 'Beelink EQ12', category: 'mini_pc', width: 115, height: 42, depth: 102 },
  { id: 'geekom_mini_it13', name: 'GEEKOM Mini IT13', category: 'mini_pc', width: 117, height: 37, depth: 112 },

  // Network Equipment - Ubiquiti
  { id: 'ucg_fiber', name: 'Ubiquiti UCG-Fiber', category: 'network', width: 213, height: 30, depth: 128 },
  { id: 'ucg_ultra', name: 'Ubiquiti UCG-Ultra', category: 'network', width: 134, height: 34, depth: 106 },
  { id: 'udm_se', name: 'Ubiquiti Dream Machine SE', category: 'network', width: 442, height: 43, depth: 312 },
  { id: 'usw_flex_mini', name: 'Ubiquiti USW-Flex-Mini', category: 'network', width: 109, height: 26, depth: 81 },
  { id: 'usw_lite_8_poe', name: 'Ubiquiti USW-Lite-8-PoE', category: 'network', width: 200, height: 32, depth: 115 },
  { id: 'usw_lite_16_poe', name: 'Ubiquiti USW-Lite-16-PoE', category: 'network', width: 296, height: 32, depth: 174 },
  { id: 'uap_ac_lite', name: 'Ubiquiti UAP-AC-Lite', category: 'network', width: 160, height: 31, depth: 160 },

  // Network Equipment - Other
  { id: 'mikrotik_hex', name: 'MikroTik hEX', category: 'network', width: 113, height: 29, depth: 89 },
  { id: 'mikrotik_rb5009', name: 'MikroTik RB5009UG+S+IN', category: 'network', width: 220, height: 30, depth: 145 },
  { id: 'tp_link_er605', name: 'TP-Link ER605', category: 'network', width: 158, height: 25, depth: 101 },
  { id: 'netgear_gs108', name: 'Netgear GS108', category: 'network', width: 158, height: 27, depth: 101 },

  // KVM / Remote Management
  { id: 'jetkvm', name: 'JetKVM', category: 'kvm', width: 43, height: 31, depth: 60 },
  { id: 'pikvm_v4_plus', name: 'PiKVM V4 Plus', category: 'kvm', width: 91, height: 37, depth: 63 },
  { id: 'pikvm_v4_mini', name: 'PiKVM V4 Mini', category: 'kvm', width: 68, height: 23, depth: 68 },
  { id: 'tinypilot_voyager2', name: 'TinyPilot Voyager 2', category: 'kvm', width: 83, height: 30, depth: 85 },

  // Smart Home Controllers
  { id: 'lutron_caseta', name: 'Lutron Caseta Smart Bridge', category: 'smart_home', width: 70, height: 31, depth: 70 },
  { id: 'lutron_ra2_select', name: 'Lutron RA2 Select Main Repeater', category: 'smart_home', width: 105, height: 34, depth: 105 },
  { id: 'hue_bridge', name: 'Philips Hue Bridge', category: 'smart_home', width: 88, height: 26, depth: 88 },
  { id: 'homey_pro', name: 'Homey Pro', category: 'smart_home', width: 110, height: 46, depth: 110 },
  { id: 'hubitat_c8', name: 'Hubitat Elevation C-8', category: 'smart_home', width: 130, height: 28, depth: 130 },
  { id: 'home_assistant_yellow', name: 'Home Assistant Yellow', category: 'smart_home', width: 125, height: 37, depth: 125 },
  { id: 'home_assistant_green', name: 'Home Assistant Green', category: 'smart_home', width: 112, height: 29, depth: 112 },

  // Zigbee / Z-Wave Coordinators (passthrough only - these are small USB-style devices)
  { id: 'slzb_06', name: 'SLZB-06 Zigbee', category: 'coordinator', width: 23.4, height: 20, depth: 90, allowedMountTypes: ['passthrough', 'none'] },
  { id: 'slzb_06m', name: 'SLZB-06M Zigbee', category: 'coordinator', width: 35, height: 25, depth: 70, allowedMountTypes: ['passthrough', 'none'] },
  { id: 'sonoff_zbdongle_p', name: 'Sonoff ZBDongle-P', category: 'coordinator', width: 25, height: 15, depth: 80, allowedMountTypes: ['passthrough', 'none'] },
  { id: 'sonoff_zbdongle_e', name: 'Sonoff ZBDongle-E', category: 'coordinator', width: 26, height: 13, depth: 80, allowedMountTypes: ['passthrough', 'none'] },
  { id: 'conbee_ii', name: 'ConBee II', category: 'coordinator', width: 22, height: 6, depth: 70, allowedMountTypes: ['passthrough', 'none'] },
  { id: 'skyconnect', name: 'Home Assistant SkyConnect', category: 'coordinator', width: 22, height: 8, depth: 45, allowedMountTypes: ['passthrough', 'none'] },
  { id: 'zooz_zst10', name: 'Zooz ZST10 Z-Wave', category: 'coordinator', width: 20, height: 9, depth: 50, allowedMountTypes: ['passthrough', 'none'] },

  // Single Board Computers
  { id: 'raspberry_pi_5', name: 'Raspberry Pi 5', category: 'sbc', width: 85, height: 17, depth: 56 },
  { id: 'raspberry_pi_5_case', name: 'Raspberry Pi 5 (Case Mount)', category: 'sbc', width: 93, height: 64, depth: 35, allowedMountTypes: ['pi5_case', 'none'] },
  { id: 'raspberry_pi_4', name: 'Raspberry Pi 4', category: 'sbc', width: 85, height: 17, depth: 56 },
  { id: 'raspberry_pi_zero_2w', name: 'Raspberry Pi Zero 2 W', category: 'sbc', width: 65, height: 5, depth: 30 },
  { id: 'orange_pi_5', name: 'Orange Pi 5', category: 'sbc', width: 100, height: 17, depth: 62 },
  { id: 'odroid_h3_plus', name: 'ODROID-H3+', category: 'sbc', width: 110, height: 39, depth: 110 },
  { id: 'rock_5b', name: 'Rock 5B', category: 'sbc', width: 100, height: 17, depth: 72 },

  // Storage / NAS
  { id: 'synology_ds220j', name: 'Synology DS220j', category: 'storage', width: 165, height: 108, depth: 225 },
  { id: 'synology_ds223', name: 'Synology DS223', category: 'storage', width: 165, height: 108, depth: 225 },
  { id: 'qnap_ts_233', name: 'QNAP TS-233', category: 'storage', width: 90, height: 169, depth: 156 },
  { id: 'terramaster_f2_223', name: 'TerraMaster F2-223', category: 'storage', width: 119, height: 133, depth: 227 },

  // Power / UPS
  { id: 'apc_be425m', name: 'APC BE425M UPS', category: 'power', width: 116, height: 55, depth: 220 },
  { id: 'cyberpower_cp425slg', name: 'CyberPower CP425SLG', category: 'power', width: 99, height: 87, depth: 261 },
  { id: 'eaton_3s_550', name: 'Eaton 3S 550VA', category: 'power', width: 100, height: 90, depth: 280 },
];

// Helper functions
export function getDevice(id: string): RackDevice | undefined {
  return DEVICES.find(d => d.id === id);
}

export function getDevicesByCategory(category: DeviceCategory): RackDevice[] {
  return DEVICES.filter(d => d.category === category);
}

export function getAllCategories(): DeviceCategory[] {
  return Object.keys(CATEGORY_LABELS) as DeviceCategory[];
}

export function getDevicesGroupedByCategory(): Record<DeviceCategory, RackDevice[]> {
  const grouped = {} as Record<DeviceCategory, RackDevice[]>;
  for (const category of getAllCategories()) {
    grouped[category] = getDevicesByCategory(category);
  }
  return grouped;
}

// Get allowed mount types for a device (returns all types if not restricted)
export function getAllowedMountTypes(deviceId: string): MountType[] | undefined {
  const device = getDevice(deviceId);
  return device?.allowedMountTypes;
}
