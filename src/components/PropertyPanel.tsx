import { useRackStore } from '../state/rack-store';
import type { MountType } from '../state/types';
import { MOUNT_TYPE_LABELS } from '../state/types';
import { getPlacedDeviceDimensions } from '../utils/scad-generator';

export function PropertyPanel() {
  const {
    config,
    selectedDeviceId,
    updateDevicePosition,
    updateDeviceMountType,
    removeDevice,
  } = useRackStore();

  // Search all device lists for the selected device
  const selectedDevice = selectedDeviceId
    ? config.devices.find((d) => d.id === selectedDeviceId) ||
      config.leftDevices.find((d) => d.id === selectedDeviceId) ||
      config.rightDevices.find((d) => d.id === selectedDeviceId)
    : null;

  if (!selectedDevice) {
    return (
      <div className="w-80 bg-gray-800 border-t border-gray-700 p-3 flex-shrink-0">
        <div className="text-gray-400 text-sm text-center py-2">
          Select a device to edit properties
        </div>
      </div>
    );
  }

  const dims = getPlacedDeviceDimensions(selectedDevice);

  const handlePositionChange = (axis: 'x' | 'y', value: string) => {
    const numValue = parseFloat(value) || 0;
    if (axis === 'x') {
      updateDevicePosition(selectedDevice.id, numValue, selectedDevice.offsetY);
    } else {
      updateDevicePosition(selectedDevice.id, selectedDevice.offsetX, numValue);
    }
  };

  return (
    <div className="w-80 bg-gray-800 border-t border-gray-700 p-3 flex-shrink-0">
      {/* Device info row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-white font-medium text-sm">{dims.name}</div>
          <div className="text-gray-500 text-xs">
            {dims.width} x {dims.height} x {dims.depth} mm
          </div>
        </div>
        <button
          onClick={() => removeDevice(selectedDevice.id)}
          className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
        >
          Remove
        </button>
      </div>

      {/* Position and Mount controls */}
      <div className="flex gap-2 mb-2">
        {/* Position X */}
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">X (mm)</label>
          <input
            type="number"
            value={selectedDevice.offsetX}
            onChange={(e) => handlePositionChange('x', e.target.value)}
            step={1}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Position Y */}
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Y (mm)</label>
          <input
            type="number"
            value={selectedDevice.offsetY}
            onChange={(e) => handlePositionChange('y', e.target.value)}
            step={1}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Mount Type */}
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Mount</label>
          <select
            value={selectedDevice.mountType}
            onChange={(e) => updateDeviceMountType(selectedDevice.id, e.target.value as MountType)}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {Object.entries(MOUNT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
