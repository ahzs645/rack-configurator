import { useEffect, useCallback, useState, useRef } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
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

  // Track last pointer position during drag for accurate drop placement
  const lastPointerPosition = useRef<{ x: number; y: number } | null>(null);

  // Main view mode toggle
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('2d');

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedDeviceId) return;

      // Search in all device lists (main, left, right)
      const device = config.devices.find((d) => d.id === selectedDeviceId)
        || config.leftDevices.find((d) => d.id === selectedDeviceId)
        || config.rightDevices.find((d) => d.id === selectedDeviceId);
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
    [selectedDeviceId, config.devices, config.leftDevices, config.rightDevices, removeDevice, updateDevicePosition, selectDevice]
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
    lastPointerPosition.current = null;
  };

  // Handle drag move to track pointer position
  const handleDragMove = (event: DragMoveEvent) => {
    // Track the pointer position from activatorEvent
    const pointerEvent = event.activatorEvent as PointerEvent;
    if (pointerEvent && event.delta) {
      // Calculate current pointer position from initial position + delta
      lastPointerPosition.current = {
        x: pointerEvent.clientX + event.delta.x,
        y: pointerEvent.clientY + event.delta.y,
      };
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
        // Determine which side to add to in split mode based on pointer position
        let side: 'left' | 'right' | undefined;
        if (config.isSplit && lastPointerPosition.current) {
          // Get the drop zone element to calculate relative position
          const dropZone = document.querySelector('[data-droppable-id="rack-drop-zone"]') as HTMLElement;
          if (dropZone) {
            const rect = dropZone.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;

            // Estimate scale to convert splitPosition (in mm) to pixels
            const baseScale = calculateFitScale(rect.width, rect.height, config.rackU, 40);
            const splitOffsetPx = config.splitPosition * baseScale;
            const splitLineX = centerX + splitOffsetPx;

            // If pointer is left of the split line, go left; otherwise right
            side = lastPointerPosition.current.x < splitLineX ? 'left' : 'right';
          } else {
            // Fallback: use split position sign
            side = config.splitPosition >= 0 ? 'left' : 'right';
          }
        }

        // For position, start at center (0, 0) - user can drag to reposition
        addDevice(deviceId, 0, 0, 'cage', side);
      }
      lastPointerPosition.current = null;
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
    lastPointerPosition.current = null;
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
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
