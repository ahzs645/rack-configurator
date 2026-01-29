import { useState, useEffect } from 'react';
import { useRackStore } from '../state/rack-store';
import type { MountType, PlacedDevice, BackStyle, JoinerScrewType, JoinerType, ShelfNotch } from '../state/types';
import { MOUNT_TYPE_LABELS, BACK_STYLE_LABELS, JOINER_SCREW_TYPE_LABELS, JOINER_TYPE_LABELS, SHELF_NOTCH_LABELS } from '../state/types';
import { getPlacedDeviceDimensions } from '../utils/scad-generator';
import { getAllowedMountTypes } from '../data/devices';

// Separate component for patch panel ports input to handle local state properly
function PatchPanelPortsInput({
  deviceId,
  currentPorts,
  onUpdate,
}: {
  deviceId: string;
  currentPorts: number;
  onUpdate: (id: string, ports: number) => void;
}) {
  const [inputValue, setInputValue] = useState(String(currentPorts));

  // Sync input value when currentPorts changes from outside (e.g., device selection change)
  useEffect(() => {
    setInputValue(String(currentPorts));
  }, [currentPorts, deviceId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Only update store if it's a valid number
    const parsed = parseInt(value);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 24) {
      onUpdate(deviceId, parsed);
    }
  };

  const handleBlur = () => {
    // On blur, validate and reset to valid value
    const parsed = parseInt(inputValue);
    if (isNaN(parsed) || parsed < 1) {
      setInputValue('1');
      onUpdate(deviceId, 1);
    } else if (parsed > 24) {
      setInputValue('24');
      onUpdate(deviceId, 24);
    } else {
      setInputValue(String(parsed));
      onUpdate(deviceId, parsed);
    }
  };

  return (
    <div className="mt-2">
      <label className="block text-xs text-gray-400 mb-1">Number of Ports</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          min={1}
          max={24}
          className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
        />
        <span className="text-xs text-gray-400">keystone slots</span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Each port is 19mm wide (standard keystone spacing)
      </div>
    </div>
  );
}

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
    updateDeviceDimensions,
    updateDevicePatchPanelPorts,
    updateDeviceShelfHoneycomb,
    updateDeviceShelfSolidBottom,
    updateDeviceShelfNotch,
    updateDeviceShelfNotchWidth,
    updateDeviceShelfScrewHoles,
    updateDeviceShelfCableHoles,
    addDeviceStandoff,
    removeDeviceStandoff,
    removeDevice,
    moveDeviceToSide,
    setJoinerType,
    setJoinerNutSide,
    setJoinerNutDepth,
    setJoinerScrewType,
    setJoinerNutFloor,
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
                      {config.joinerType === 'dovetail'
                        ? 'Dovetail (tool-free)'
                        : `${config.joinerScrewType || 'M5'} bolt joint • Nut on ${config.joinerNutSide || 'right'}`}
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
              {config.joinerType === 'dovetail' ? 'Tool-free sliding dovetail joint' : 'Hex bolt with captive nut pocket'}
            </div>
          </div>

          {/* Joiner Type */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Joiner Type</label>
            <select
              value={config.joinerType || 'screw'}
              onChange={(e) => setJoinerType(e.target.value as JoinerType)}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {Object.entries(JOINER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Screw-specific options (only show for screw type) */}
          {config.joinerType !== 'dovetail' && (
          <>
          {/* Screw Type */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Bolt Size</label>
            <select
              value={config.joinerScrewType || 'M5'}
              onChange={(e) => setJoinerScrewType(e.target.value as JoinerScrewType)}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {Object.entries(JOINER_SCREW_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
          <div className="mb-3">
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
              Depth for the nut pocket. Set to 0 to use the default for the selected bolt size.
            </div>
          </div>

          {/* Captive Nut Floor */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Captive Nut Floor</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config.joinerNutFloor ?? 0}
                onChange={(e) => setJoinerNutFloor(Number(e.target.value))}
                step={0.1}
                min={0}
                max={2}
                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-gray-400">mm</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Thin floor covering the nut pocket (captive nut). Set to 0 for an open pocket.
            </div>
          </div>
          </>
          )}
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
              {selectedDevice.deviceId !== 'custom' && (
                <div className="text-gray-500 text-xs">
                  {dims.width} x {dims.height} x {dims.depth} mm
                </div>
              )}
            </div>
            <button
              onClick={() => removeDevice(selectedDevice.id)}
              className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
            >
              Remove
            </button>
          </div>

          {/* Custom device dimensions (editable) */}
          {selectedDevice.deviceId === 'custom' && (
            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">Dimensions (mm)</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-0.5">Width</label>
                  <input
                    type="number"
                    value={selectedDevice.customWidth || 100}
                    onChange={(e) => {
                      const width = parseFloat(e.target.value) || 1;
                      updateDeviceDimensions(
                        selectedDevice.id,
                        width,
                        selectedDevice.customHeight || 40,
                        selectedDevice.customDepth || 100
                      );
                    }}
                    step={1}
                    min={1}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-0.5">Height</label>
                  <input
                    type="number"
                    value={selectedDevice.customHeight || 40}
                    onChange={(e) => {
                      const height = parseFloat(e.target.value) || 1;
                      updateDeviceDimensions(
                        selectedDevice.id,
                        selectedDevice.customWidth || 100,
                        height,
                        selectedDevice.customDepth || 100
                      );
                    }}
                    step={1}
                    min={1}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-0.5">Depth</label>
                  <input
                    type="number"
                    value={selectedDevice.customDepth || 100}
                    onChange={(e) => {
                      const depth = parseFloat(e.target.value) || 1;
                      updateDeviceDimensions(
                        selectedDevice.id,
                        selectedDevice.customWidth || 100,
                        selectedDevice.customHeight || 40,
                        depth
                      );
                    }}
                    step={1}
                    min={1}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

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

          {/* Mount Type and Back Style (hide for patch_panel, hide Back for shelf) */}
          {selectedDevice.mountType !== 'patch_panel' && (
            <div className="flex gap-2">
              {/* Mount Type */}
              <div className={selectedDevice.mountType === 'shelf' ? 'flex-1' : 'flex-1'}>
                <label className="block text-xs text-gray-400 mb-1">Mount</label>
                <select
                  value={selectedDevice.mountType}
                  onChange={(e) => updateDeviceMountType(selectedDevice.id, e.target.value as MountType)}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {(() => {
                    // Get allowed mount types for this device
                    const allowedTypes = selectedDevice.deviceId !== 'custom'
                      ? getAllowedMountTypes(selectedDevice.deviceId)
                      : undefined;
                    // If no specific allowed types, exclude device-specific mounts (pi5_case, patch_panel)
                    const mountTypes = allowedTypes
                      || (Object.keys(MOUNT_TYPE_LABELS) as MountType[]).filter(mt => mt !== 'pi5_case' && mt !== 'patch_panel');

                    return mountTypes.map((value) => (
                      <option key={value} value={value}>
                        {MOUNT_TYPE_LABELS[value]}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              {/* Back Style - Hide for shelf mount type */}
              {selectedDevice.mountType !== 'shelf' && (
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
              )}
            </div>
          )}

          {/* Patch Panel Ports (only for patch_panel mount type) */}
          {selectedDevice.mountType === 'patch_panel' && (
            <PatchPanelPortsInput
              deviceId={selectedDevice.id}
              currentPorts={selectedDevice.patchPanelPorts || 6}
              onUpdate={updateDevicePatchPanelPorts}
            />
          )}

          {/* Shelf Options (only for shelf mount type) */}
          {selectedDevice.mountType === 'shelf' && (
            <div className="space-y-2 border-t border-gray-700 pt-2 mt-2">
              <div className="text-xs font-medium text-gray-400">Shelf Options</div>

              {/* Solid Bottom Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDevice.shelfSolidBottom === true}
                  onChange={(e) => updateDeviceShelfSolidBottom(selectedDevice.id, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                />
                <span className="text-xs text-gray-300">Solid Bottom</span>
              </label>

              {/* Honeycomb Pattern Toggle (only if not solid bottom) */}
              {!selectedDevice.shelfSolidBottom && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDevice.shelfUseHoneycomb !== false}
                    onChange={(e) => updateDeviceShelfHoneycomb(selectedDevice.id, e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                  <span className="text-xs text-gray-300">Honeycomb Pattern</span>
                </label>
              )}

              {/* LED Notch Position */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-16">LED Notch</label>
                <select
                  value={selectedDevice.shelfNotch || 'none'}
                  onChange={(e) => updateDeviceShelfNotch(selectedDevice.id, e.target.value as ShelfNotch)}
                  className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:border-blue-500"
                >
                  {Object.entries(SHELF_NOTCH_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Notch Width (only show if notch is not 'none') */}
              {selectedDevice.shelfNotch && selectedDevice.shelfNotch !== 'none' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 w-16">Width</label>
                  <input
                    type="number"
                    value={selectedDevice.shelfNotchWidth || 100}
                    onChange={(e) => updateDeviceShelfNotchWidth(selectedDevice.id, parseInt(e.target.value) || 100)}
                    className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:border-blue-500"
                    min={20}
                    max={200}
                  />
                  <span className="text-xs text-gray-500">mm</span>
                </div>
              )}

              {/* Screw Holes */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-16">Screws</label>
                <input
                  type="range"
                  value={selectedDevice.shelfScrewHoles || 0}
                  onChange={(e) => updateDeviceShelfScrewHoles(selectedDevice.id, parseInt(e.target.value))}
                  className="flex-1"
                  min={0}
                  max={5}
                />
                <span className="text-xs text-gray-300 w-4 text-center">{selectedDevice.shelfScrewHoles || 0}</span>
              </div>

              {/* Cable Holes */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-16">Cables L</label>
                <input
                  type="range"
                  value={selectedDevice.shelfCableHolesLeft || 0}
                  onChange={(e) => updateDeviceShelfCableHoles(
                    selectedDevice.id,
                    parseInt(e.target.value),
                    selectedDevice.shelfCableHolesRight || 0
                  )}
                  className="flex-1"
                  min={0}
                  max={5}
                />
                <span className="text-xs text-gray-300 w-4 text-center">{selectedDevice.shelfCableHolesLeft || 0}</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-16">Cables R</label>
                <input
                  type="range"
                  value={selectedDevice.shelfCableHolesRight || 0}
                  onChange={(e) => updateDeviceShelfCableHoles(
                    selectedDevice.id,
                    selectedDevice.shelfCableHolesLeft || 0,
                    parseInt(e.target.value)
                  )}
                  className="flex-1"
                  min={0}
                  max={5}
                />
                <span className="text-xs text-gray-300 w-4 text-center">{selectedDevice.shelfCableHolesRight || 0}</span>
              </div>

              {/* Standoffs/Mounting Points */}
              <div className="border-t border-gray-600 pt-2 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-400">Mounting Standoffs</span>
                  <button
                    onClick={() => addDeviceStandoff(selectedDevice.id, {
                      x: 0,
                      y: 20,
                      height: 5,
                      outerDia: 6,
                      holeDia: 2.5
                    })}
                    className="text-xs px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded"
                  >
                    + Add
                  </button>
                </div>
                {(selectedDevice.standoffs || []).length === 0 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    No standoffs added
                  </div>
                )}
                {(selectedDevice.standoffs || []).map((standoff, idx) => (
                  <div key={idx} className="bg-gray-700 rounded p-2 mb-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-300">Standoff {idx + 1}</span>
                      <button
                        onClick={() => removeDeviceStandoff(selectedDevice.id, idx)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>
                        <label className="text-gray-500">X</label>
                        <input
                          type="number"
                          value={standoff.x}
                          onChange={(e) => {
                            const newStandoffs = [...(selectedDevice.standoffs || [])];
                            newStandoffs[idx] = { ...standoff, x: parseFloat(e.target.value) || 0 };
                            useRackStore.getState().updateDeviceStandoffs(selectedDevice.id, newStandoffs);
                          }}
                          className="w-full px-1 py-0.5 bg-gray-600 border border-gray-500 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500">Y</label>
                        <input
                          type="number"
                          value={standoff.y}
                          onChange={(e) => {
                            const newStandoffs = [...(selectedDevice.standoffs || [])];
                            newStandoffs[idx] = { ...standoff, y: parseFloat(e.target.value) || 0 };
                            useRackStore.getState().updateDeviceStandoffs(selectedDevice.id, newStandoffs);
                          }}
                          className="w-full px-1 py-0.5 bg-gray-600 border border-gray-500 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500">Height</label>
                        <input
                          type="number"
                          value={standoff.height}
                          onChange={(e) => {
                            const newStandoffs = [...(selectedDevice.standoffs || [])];
                            newStandoffs[idx] = { ...standoff, height: parseFloat(e.target.value) || 5 };
                            useRackStore.getState().updateDeviceStandoffs(selectedDevice.id, newStandoffs);
                          }}
                          className="w-full px-1 py-0.5 bg-gray-600 border border-gray-500 rounded text-white"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="text-gray-500">Hole Ø</label>
                        <input
                          type="number"
                          value={standoff.holeDia}
                          onChange={(e) => {
                            const newStandoffs = [...(selectedDevice.standoffs || [])];
                            newStandoffs[idx] = { ...standoff, holeDia: parseFloat(e.target.value) || 2.5 };
                            useRackStore.getState().updateDeviceStandoffs(selectedDevice.id, newStandoffs);
                          }}
                          className="w-full px-1 py-0.5 bg-gray-600 border border-gray-500 rounded text-white"
                          min={1}
                          step={0.5}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
