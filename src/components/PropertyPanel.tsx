import { useState } from 'react';
import { useRackStore } from '../state/rack-store';
import type { MountType, PlacedDevice, BackStyle, JoinerNutSide } from '../state/types';
import { MOUNT_TYPE_LABELS, BACK_STYLE_LABELS, JOINER_NUT_SIDE_LABELS } from '../state/types';
import { getPlacedDeviceDimensions } from '../utils/scad-generator';

// Placed device list item
interface PlacedDeviceItemProps {
  device: PlacedDevice;
  isSelected: boolean;
  side?: 'left' | 'right' | null;
  onSelect: () => void;
  onRemove: () => void;
}

function PlacedDeviceItem({ device, isSelected, side, onSelect, onRemove }: PlacedDeviceItemProps) {
  const dims = getPlacedDeviceDimensions(device);

  return (
    <div
      onClick={onSelect}
      className={`relative rounded p-2 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-600 ring-2 ring-blue-400'
          : 'bg-gray-700 hover:bg-gray-600'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium truncate">{dims.name}</div>
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <span>{dims.width}x{dims.height}mm</span>
            {side && (
              <span className={`px-1 rounded text-xs ${
                side === 'left' ? 'bg-blue-500/30 text-blue-300' : 'bg-pink-500/30 text-pink-300'
              }`}>
                {side === 'left' ? 'L' : 'R'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-gray-400 hover:text-red-400 p-1"
          title="Remove device"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function PropertyPanel() {
  const [joinerSelected, setJoinerSelected] = useState(false);

  const {
    config,
    selectedDeviceId,
    selectDevice,
    updateDevicePosition,
    updateDeviceMountType,
    updateDeviceBackStyle,
    removeDevice,
    moveDeviceToSide,
    setJoinerNutSide,
    setJoinerNutDepth,
  } = useRackStore();

  // Get all placed devices with their side info
  const allPlacedDevices = config.isSplit
    ? [
        ...config.leftDevices.map(d => ({ device: d, side: 'left' as const })),
        ...config.rightDevices.map(d => ({ device: d, side: 'right' as const })),
      ]
    : config.devices.map(d => ({ device: d, side: null }));

  // Search all device lists for the selected device and determine which side it's on
  let selectedDevice: PlacedDevice | null = null;
  let deviceSide: 'main' | 'left' | 'right' = 'main';

  if (selectedDeviceId) {
    selectedDevice = config.devices.find((d) => d.id === selectedDeviceId) || null;
    if (selectedDevice) {
      deviceSide = 'main';
    } else {
      selectedDevice = config.leftDevices.find((d) => d.id === selectedDeviceId) || null;
      if (selectedDevice) {
        deviceSide = 'left';
      } else {
        selectedDevice = config.rightDevices.find((d) => d.id === selectedDeviceId) || null;
        if (selectedDevice) {
          deviceSide = 'right';
        }
      }
    }
  }

  const dims = selectedDevice ? getPlacedDeviceDimensions(selectedDevice) : null;

  const handlePositionChange = (axis: 'x' | 'y', value: string) => {
    if (!selectedDevice) return;
    const numValue = parseFloat(value) || 0;
    if (axis === 'x') {
      updateDevicePosition(selectedDevice.id, numValue, selectedDevice.offsetY);
    } else {
      updateDevicePosition(selectedDevice.id, selectedDevice.offsetX, numValue);
    }
  };

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full flex-shrink-0 overflow-hidden">
      {/* Placed Devices List */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-green-400">On Faceplate</h3>
          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
            {allPlacedDevices.length}
          </span>
        </div>
        {allPlacedDevices.length === 0 && !config.isSplit ? (
          <div className="text-gray-500 text-xs text-center py-4">
            No devices placed yet.<br />
            Drag devices from the library.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {/* Joiner item (only in split mode) */}
            {config.isSplit && (
              <div
                onClick={() => {
                  setJoinerSelected(true);
                  selectDevice(null);
                }}
                className={`relative rounded p-2 cursor-pointer transition-colors ${
                  joinerSelected
                    ? 'bg-purple-600 ring-2 ring-purple-400'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium">Split Joiner</div>
                    <div className="text-xs text-gray-400">
                      M5 bolt joint • Nut on {config.joinerNutSide || 'right'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {allPlacedDevices.map(({ device, side }) => (
              <PlacedDeviceItem
                key={device.id}
                device={device}
                isSelected={selectedDeviceId === device.id && !joinerSelected}
                side={side}
                onSelect={() => {
                  setJoinerSelected(false);
                  selectDevice(device.id);
                }}
                onRemove={() => removeDevice(device.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Joiner Properties */}
      {joinerSelected && config.isSplit && (
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Joiner Properties</h3>

          {/* Joiner info */}
          <div className="mb-3">
            <div className="text-white font-medium text-sm">Split Panel Joiner</div>
            <div className="text-gray-500 text-xs">
              M5 hex bolt with captive nut pocket
            </div>
          </div>

          {/* Nut Side */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Nut Pocket Side</label>
            <div className="flex gap-1">
              <button
                onClick={() => setJoinerNutSide('left')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                  (config.joinerNutSide || 'right') === 'left'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                Left Side
              </button>
              <button
                onClick={() => setJoinerNutSide('right')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                  (config.joinerNutSide || 'right') === 'right'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                Right Side
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              The other side will have clearance holes for the screw head
            </div>
          </div>

          {/* Nut Pocket Depth */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nut Pocket Depth</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config.joinerNutDepth || 4.5}
                onChange={(e) => setJoinerNutDepth(Number(e.target.value))}
                step={0.5}
                min={2}
                max={10}
                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-gray-400">mm</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Standard M5 nut is 4mm thick. Default 4.5mm allows some clearance.
            </div>
          </div>
        </div>
      )}

      {/* Selected Device Properties */}
      {selectedDevice && dims && !joinerSelected && (
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Device Properties</h3>

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

          {/* Split side selector (only in split mode) */}
          {config.isSplit && (
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => moveDeviceToSide(selectedDevice.id, 'left')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                  deviceSide === 'left'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                Left Half
              </button>
              <button
                onClick={() => moveDeviceToSide(selectedDevice.id, 'right')}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                  deviceSide === 'right'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                Right Half
              </button>
            </div>
          )}

          {/* Position controls */}
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
          </div>

          {/* Mount Type and Back Style */}
          <div className="flex gap-2">
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

            {/* Back Style */}
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Back</label>
              <select
                value={selectedDevice.backStyle || config.backStyle}
                onChange={(e) => updateDeviceBackStyle(selectedDevice.id, e.target.value as BackStyle)}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {Object.entries(BACK_STYLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Empty state when no device selected */}
      {!selectedDevice && !joinerSelected && (allPlacedDevices.length > 0 || config.isSplit) && (
        <div className="p-3 text-gray-500 text-xs text-center">
          Select {config.isSplit ? 'the joiner or a device' : 'a device'} to edit its properties
        </div>
      )}
    </div>
  );
}
