import type { PlacedDevice, MountType } from '../state/types';
import { getDevice } from '../data/devices';

export function getBaseDeviceDimensions(device: PlacedDevice): {
  width: number;
  height: number;
  depth: number;
  name: string;
} {
  if (device.deviceId === 'custom') {
    return {
      width: device.customWidth || 50,
      height: device.customHeight || 30,
      depth: device.customDepth || 50,
      name: device.customName || 'Custom Device',
    };
  }

  const deviceData = getDevice(device.deviceId);
  if (deviceData) {
    // Special handling for patch panel - calculate width based on port count
    if (device.mountType === 'patch_panel') {
      const ports = device.patchPanelPorts || 6;
      const keystoneSpacing = 19; // mm per keystone slot
      return {
        width: ports * keystoneSpacing,
        height: 30, // Standard keystone visible height
        depth: 15,
        name: `${ports}-Port Patch Panel`,
      };
    }

    // Special handling for Pi 5 case mount - use case dimensions
    if (device.mountType === 'pi5_case') {
      return {
        width: 93,   // PI5_CASE_FACE_W (85 + 2*(2+1))
        height: 64,  // PI5_CASE_FACE_H (56 + 2*(2+1))
        depth: 35,   // PI5_CASE_DEPTH
        name: 'Raspberry Pi 5 Case',
      };
    }

    return {
      width: deviceData.width,
      height: deviceData.height,
      depth: deviceData.depth,
      name: deviceData.name,
    };
  }

  // Fallback for unknown device
  return {
    width: 50,
    height: 30,
    depth: 50,
    name: device.deviceId,
  };
}

export function canOrientDevice(device: PlacedDevice): boolean {
  const mounts: MountType[] = ['cage', 'cage_rect', 'cage_open', 'compact', 'none'];
  return mounts.includes(device.mountType) && !getDevice(device.deviceId)?.allowedMountTypes;
}

export function getPlacedDeviceDimensions(device: PlacedDevice) {
  const dims = getBaseDeviceDimensions(device);
  return device.orientation === 'side' && canOrientDevice(device)
    ? { ...dims, width: dims.height, height: dims.width }
    : dims;
}
