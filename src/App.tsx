import { useEffect, useCallback, useState } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { DeviceLibrary } from './components/DeviceLibrary';
import { RackConfigurator } from './components/RackConfigurator';
import { RackToolbar } from './components/RackToolbar';
import { PropertyPanel } from './components/PropertyPanel';
import { MainViewer3D } from './components/MainViewer3D';
import { useRackStore } from './state/rack-store';
import type { RackDevice } from './data/devices';
import { getDevice } from './data/devices';
import { getPlacedDeviceDimensions } from './utils/scad-generator';
import { clampToRackBounds, calculateFitScale } from './utils/coordinates';

type MainViewMode = '2d' | '3d';

// Drag overlay content for library devices
function DragPreview({ device }: { device: RackDevice }) {
  return (
    <div className="bg-blue-500 text-white px-3 py-2 rounded shadow-lg opacity-90 pointer-events-none">
      <div className="font-medium text-sm">{device.name}</div>
      <div className="text-xs opacity-75">
        {device.width} x {device.height} mm
      </div>
    </div>
  );
}

function App() {
  const {
    config,
    selectedDeviceId,
    addDevice,
    removeDevice,
    updateDevicePosition,
    selectDevice,
  } = useRackStore();

  // Track active drag for overlay
  const [activeDragDevice, setActiveDragDevice] = useState<RackDevice | null>(null);

  // Main view mode toggle
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('2d');

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedDeviceId) return;

      const device = config.devices.find((d) => d.id === selectedDeviceId);
      if (!device) return;

      const nudgeAmount = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          removeDevice(selectedDeviceId);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          updateDevicePosition(selectedDeviceId, device.offsetX - nudgeAmount, device.offsetY);
          break;
        case 'ArrowRight':
          e.preventDefault();
          updateDevicePosition(selectedDeviceId, device.offsetX + nudgeAmount, device.offsetY);
          break;
        case 'ArrowUp':
          e.preventDefault();
          updateDevicePosition(selectedDeviceId, device.offsetX, device.offsetY + nudgeAmount);
          break;
        case 'ArrowDown':
          e.preventDefault();
          updateDevicePosition(selectedDeviceId, device.offsetX, device.offsetY - nudgeAmount);
          break;
        case 'Escape':
          selectDevice(null);
          break;
      }
    },
    [selectedDeviceId, config.devices, removeDevice, updateDevicePosition, selectDevice]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'library-device') {
      const deviceId = active.data.current.deviceId as string;
      const device = getDevice(deviceId);
      setActiveDragDevice(device || null);
    }
  };

  // Handle drag end from library to rack or repositioning
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveDragDevice(null);

    // Check if dragging from library and dropped over the rack
    if (active.data.current?.type === 'library-device' && over?.id === 'rack-drop-zone') {
      const deviceId = active.data.current.deviceId as string;
      const device = getDevice(deviceId);

      if (device) {
        // Determine which side to add to in split mode
        let side: 'left' | 'right' | undefined;
        if (config.isSplit) {
          // Default position (0) - if split is at 0 or positive, go left; if negative, go right
          side = config.splitPosition >= 0 ? 'left' : 'right';
        }
        addDevice(deviceId, 0, 0, 'cage', side);
      }
      return;
    }

    // Handle repositioning a placed device
    if (active.data.current?.type === 'placed-device') {
      const placedDevice = active.data.current.device;
      if (!placedDevice) return;

      const dims = getPlacedDeviceDimensions(placedDevice);

      // Estimate scale based on typical viewport size
      const baseScale = calculateFitScale(800, 600, config.rackU, 40);
      const scale = baseScale * 1; // zoom = 1

      // Convert delta from pixels to mm
      const deltaXMm = delta.x / scale;
      const deltaYMm = -delta.y / scale; // Flip Y

      // New position
      const newX = placedDevice.offsetX + deltaXMm;
      const newY = placedDevice.offsetY + deltaYMm;

      // Clamp to rack bounds
      const clamped = clampToRackBounds(newX, newY, dims.width, dims.height, config.rackU);

      updateDevicePosition(placedDevice.id, clamped.x, clamped.y);
    }
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveDragDevice(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <h1 className="text-xl font-bold text-white">Rack Configurator</h1>
          <div className="text-sm text-gray-400">
            Visual drag-and-drop rack mount designer
          </div>
        </header>

        {/* Toolbar */}
        <RackToolbar />

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Device Library - only show in 2D mode */}
          {mainViewMode === '2d' && <DeviceLibrary />}

          {/* Main view area with tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* View mode tabs */}
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
                <button
                  onClick={() => setMainViewMode('2d')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    mainViewMode === '2d'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  2D Editor
                </button>
                <button
                  onClick={() => setMainViewMode('3d')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    mainViewMode === '3d'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  3D Preview
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {mainViewMode === '2d' ? 'Drag devices to configure rack' : 'Rotate: drag | Zoom: scroll'}
              </span>
            </div>

            {/* View content */}
            {mainViewMode === '2d' ? (
              <RackConfigurator />
            ) : (
              <MainViewer3D />
            )}
          </div>

          {/* Right side: Properties panel */}
          <PropertyPanel />
        </div>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-xs text-gray-500 flex items-center justify-between flex-shrink-0">
          <div>
            {config.devices.length} device{config.devices.length !== 1 ? 's' : ''} placed
          </div>
          <div>
            Rack: {config.rackU}U | Ears: {config.earStyle} | Back: {config.backStyle}
          </div>
        </footer>
      </div>

      {/* Drag overlay - renders the floating preview while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeDragDevice ? <DragPreview device={activeDragDevice} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
