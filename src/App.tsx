import { useEffect, useCallback, useState, useRef } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { DeviceLibrary } from './components/DeviceLibrary';
import { RackConfigurator } from './components/RackConfigurator';
import { RackToolbar } from './components/RackToolbar';
import { PropertyPanel } from './components/PropertyPanel';
import { RackPreview3D } from './components/RackPreview3D';
import { MobileLayout } from './components/MobileLayout';
import { useRackStore } from './state/rack-store';
import { useIsMobile } from './hooks/useMediaQuery';
import type { RackDevice } from './data/devices';
import { getDevice } from './data/devices';
import { getPlacedDeviceDimensions, parseConfigJson } from './utils/scad-generator';
import { clampToRackBounds, calculateFitScale } from './utils/coordinates';
import { loadConfigFromUrl, clearUrlConfig } from './utils/url-sharing';
import { readWorkingRack, saveWorkingRack } from './utils/working-rack';
import type { RackConfig } from './state/types';

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

function DesktopLayout() {
  const {
    config,
    selectedDeviceId,
    snapToGrid,
    gridSize,
    zoom,
    addDevice,
    removeDevice,
    updateDevicePosition,
    selectDevice,
    loadConfig,
  } = useRackStore();

  // Track active drag for overlay
  const [activeDragDevice, setActiveDragDevice] = useState<RackDevice | null>(null);

  // Track last pointer position during drag for accurate drop placement
  const lastPointerPosition = useRef<{ x: number; y: number } | null>(null);

  // Main view mode toggle
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('2d');

  // Track file drag-and-drop state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounter = useRef(0);

  // Handle file drag events for loading JSON configs
  const handleFileDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDraggingFile(false);
    }
  }, []);

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.json')) {
      console.warn('Only JSON files are supported');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsedConfig = parseConfigJson(content);
      if (parsedConfig) {
        loadConfig(parsedConfig as RackConfig);
      } else {
        console.error('Invalid rack configuration file');
      }
    };
    reader.onerror = () => {
      console.error('Error reading file');
    };
    reader.readAsText(file);
  }, [loadConfig]);

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
            const baseScale = calculateFitScale(rect.width, rect.height, config.rackU, 40, config.panelWidth);
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
        // Use patch_panel mount type for patch panel devices
        const mountType = deviceId === 'patch_panel' ? 'patch_panel' : 'cage';
        addDevice(deviceId, 0, 0, mountType, side);
      }
      lastPointerPosition.current = null;
      return;
    }

    // Handle repositioning a placed device
    if (active.data.current?.type === 'placed-device') {
      const placedDevice = active.data.current.device;
      if (!placedDevice) return;

      const dims = getPlacedDeviceDimensions(placedDevice);

      // Get the drop zone to calculate accurate scale
      const dropZone = document.querySelector('[data-droppable-id="rack-drop-zone"]') as HTMLElement;
      let scale: number;
      if (dropZone) {
        const rect = dropZone.getBoundingClientRect();
        scale = calculateFitScale(rect.width, rect.height, config.rackU, 40, config.panelWidth) * zoom;
      } else {
        // Fallback
        scale = calculateFitScale(800, 600, config.rackU, 40, config.panelWidth) * zoom;
      }

      // Convert delta from pixels to mm
      const deltaXMm = delta.x / scale;
      const deltaYMm = -delta.y / scale; // Flip Y

      // Calculate new center position
      let newCenterX = placedDevice.offsetX + deltaXMm;
      let newCenterY = placedDevice.offsetY + deltaYMm;

      // Snap the device corner to grid (so edges align with grid lines)
      if (snapToGrid) {
        // Calculate bottom-left corner
        const cornerX = newCenterX - dims.width / 2;
        const cornerY = newCenterY - dims.height / 2;

        // Snap corner to grid
        const snappedCornerX = Math.round(cornerX / gridSize) * gridSize;
        const snappedCornerY = Math.round(cornerY / gridSize) * gridSize;

        // Calculate new center from snapped corner
        newCenterX = snappedCornerX + dims.width / 2;
        newCenterY = snappedCornerY + dims.height / 2;
      }

      // Clamp to rack bounds
      const clamped = clampToRackBounds(newCenterX, newCenterY, dims.width, dims.height, config.rackU, config.panelWidth);

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
      <div
        className="app-shell flex flex-col bg-gray-900 overflow-hidden relative"
        onDragEnter={handleFileDragEnter}
        onDragLeave={handleFileDragLeave}
        onDragOver={handleFileDragOver}
        onDrop={handleFileDrop}
      >
        {/* File drop overlay */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-50 bg-blue-900/80 flex items-center justify-center pointer-events-none">
            <div className="bg-gray-800 border-2 border-dashed border-blue-400 rounded-xl p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xl font-medium text-white">Drop JSON config to load</p>
              <p className="text-sm text-gray-400 mt-2">Release to load rack configuration</p>
            </div>
          </div>
        )}
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
                {mainViewMode === '2d' ? 'Drag devices to configure rack' : 'Drag: rotate | Shift/right-drag: pan | Scroll: zoom'}
              </span>
            </div>

            {/* View content */}
            {mainViewMode === '2d' ? (
              <RackConfigurator />
            ) : (
              <RackPreview3D />
            )}
          </div>

          {/* Right side: Properties panel */}
          <PropertyPanel />
        </div>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-xs text-gray-500 flex items-center justify-between flex-shrink-0">
          <div>
            {(() => {
              const total = config.devices.length + config.leftDevices.length + config.rightDevices.length;
              return `${total} device${total !== 1 ? 's' : ''} placed`;
            })()}
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

function App() {
  const isMobile = useIsMobile();
  const { loadConfig } = useRackStore();

  const [startup, setStartup] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadConfigFromUrl().then((urlConfig) => {
      if (cancelled) return;
      const initial = urlConfig ?? readWorkingRack();
      if (initial) loadConfig(initial);
      // Only remove a share link once a refresh can restore its contents.
      if (urlConfig && saveWorkingRack(useRackStore.getState().config)) clearUrlConfig();
      setStartup('ready');
    }).catch(() => {
      if (!cancelled) setStartup('error');
    });
    return () => { cancelled = true; };
  }, [loadConfig, attempt]);

  useEffect(() => {
    if (startup !== 'ready') return;
    return useRackStore.subscribe((state, previous) => {
      if (state.config !== previous.config) saveWorkingRack(state.config);
    });
  }, [startup]);

  if (startup !== 'ready') {
    return <div className="app-shell bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="max-w-sm space-y-4" role={startup === 'error' ? 'alert' : 'status'}>
        <h1 className="text-xl font-semibold">{startup === 'error' ? 'Couldn’t open this rack' : 'Opening your rack…'}</h1>
        {startup === 'error' && <>
          <p className="text-gray-300">The link may be incomplete, or the saved file couldn’t be reached. Your working rack hasn’t been replaced.</p>
          <button className="bg-blue-600 rounded-lg px-4 py-3" onClick={() => { setStartup('loading'); setAttempt(a => a + 1); }}>Try again</button>
          <button className="block underline py-3" onClick={() => {
            const saved = readWorkingRack();
            if (saved) loadConfig(saved);
            clearUrlConfig();
            setStartup('ready');
          }}>Open my working rack</button>
        </>}
      </div>
    </div>;
  }

  if (isMobile) {
    return <MobileLayout />;
  }

  return <DesktopLayout />;
}

export default App;
