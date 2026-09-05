import { useState, useCallback, useRef } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { useMobileViewportHeight } from '../hooks/useMobileViewportHeight';
import { MobileTabBar } from './MobileTabBar';
import type { MobileTab } from './MobileTabBar';
import { MobileSheet } from './MobileSheet';
import { MobileSettingsPanel } from './MobileSettingsPanel';
import { MobileDeviceLibrary } from './MobileDeviceLibrary';
import { PropertyPanel } from './PropertyPanel';
import { RackConfigurator } from './RackConfigurator';
import { RackPreview3D } from './RackPreview3D';
import { useRackStore } from '../state/rack-store';
import type { RackDevice } from '../data/devices';
import { getDevice } from '../data/devices';
import { getPlacedDeviceDimensions, parseConfigJson } from '../utils/scad-generator';
import { clampToRackBounds, calculateFitScale } from '../utils/coordinates';
import type { RackConfig } from '../state/types';

type MainViewMode = '2d' | '3d';

function DragPreview({ device }: { device: RackDevice }) {
  return (
    <div className="bg-blue-500 text-white px-3 py-2 rounded shadow-lg opacity-90 pointer-events-none">
      <div className="font-medium text-sm">{device.name}</div>
      <div className="text-xs opacity-75">{device.width} x {device.height} mm</div>
    </div>
  );
}

export function MobileLayout() {
  const viewportHeight = useMobileViewportHeight();
  const {
    config,
    snapToGrid,
    gridSize,
    zoom,
    addDevice,
    updateDevicePosition,
    loadConfig,
  } = useRackStore();

  const [activeTab, setActiveTab] = useState<MobileTab>('editor');
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('2d');
  const [activeDragDevice, setActiveDragDevice] = useState<RackDevice | null>(null);
  const lastPointerPosition = useRef<{ x: number; y: number } | null>(null);

  // File drag-drop
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounter = useRef(0);

  const handleFileDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDraggingFile(true);
  }, []);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDraggingFile(false);
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
    if (!file.name.endsWith('.json')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsedConfig = parseConfigJson(content);
      if (parsedConfig) loadConfig(parsedConfig as RackConfig);
    };
    reader.readAsText(file);
  }, [loadConfig]);

  // Sheet open state derived from tab
  const isSheetOpen = activeTab !== 'editor';
  const handleCloseSheet = () => setActiveTab('editor');

  const sheetTitle = {
    editor: '',
    devices: 'Device Library',
    properties: 'Properties',
    settings: 'Settings',
    files: 'Files & sharing',
  }[activeTab];

  // DnD sensors - with touch support for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'library-device') {
      const deviceId = active.data.current.deviceId as string;
      setActiveDragDevice(getDevice(deviceId) || null);
    }
    lastPointerPosition.current = null;
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const pointerEvent = event.activatorEvent as PointerEvent;
    if (pointerEvent && event.delta) {
      lastPointerPosition.current = {
        x: pointerEvent.clientX + event.delta.x,
        y: pointerEvent.clientY + event.delta.y,
      };
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveDragDevice(null);

    if (active.data.current?.type === 'library-device' && over?.id === 'rack-drop-zone') {
      const deviceId = active.data.current.deviceId as string;
      const device = getDevice(deviceId);
      if (device) {
        let side: 'left' | 'right' | undefined;
        if (config.isSplit && lastPointerPosition.current) {
          const dropZone = document.querySelector('[data-droppable-id="rack-drop-zone"]') as HTMLElement;
          if (dropZone) {
            const rect = dropZone.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const baseScale = calculateFitScale(rect.width, rect.height, config.rackU, 40, config.panelWidth);
            const splitOffsetPx = config.splitPosition * baseScale;
            const splitLineX = centerX + splitOffsetPx;
            side = lastPointerPosition.current.x < splitLineX ? 'left' : 'right';
          } else {
            side = config.splitPosition >= 0 ? 'left' : 'right';
          }
        }
        const mountType = deviceId === 'patch_panel' ? 'patch_panel' : 'cage';
        addDevice(deviceId, 0, 0, mountType, side);
      }
      lastPointerPosition.current = null;
      return;
    }

    if (active.data.current?.type === 'placed-device') {
      const placedDevice = active.data.current.device;
      if (!placedDevice) return;
      const dims = getPlacedDeviceDimensions(placedDevice);
      const dropZone = document.querySelector('[data-droppable-id="rack-drop-zone"]') as HTMLElement;
      let scale: number;
      if (dropZone) {
        const rect = dropZone.getBoundingClientRect();
        scale = calculateFitScale(rect.width, rect.height, config.rackU, 40, config.panelWidth) * zoom;
      } else {
        scale = calculateFitScale(800, 600, config.rackU, 40, config.panelWidth) * zoom;
      }
      const deltaXMm = delta.x / scale;
      const deltaYMm = -delta.y / scale;
      let newCenterX = placedDevice.offsetX + deltaXMm;
      let newCenterY = placedDevice.offsetY + deltaYMm;
      if (snapToGrid) {
        const cornerX = newCenterX - dims.width / 2;
        const cornerY = newCenterY - dims.height / 2;
        const snappedCornerX = Math.round(cornerX / gridSize) * gridSize;
        const snappedCornerY = Math.round(cornerY / gridSize) * gridSize;
        newCenterX = snappedCornerX + dims.width / 2;
        newCenterY = snappedCornerY + dims.height / 2;
      }
      const clamped = clampToRackBounds(newCenterX, newCenterY, dims.width, dims.height, config.rackU, config.panelWidth);
      updateDevicePosition(placedDevice.id, clamped.x, clamped.y);
    }
  };

  const handleDragCancel = () => {
    setActiveDragDevice(null);
    lastPointerPosition.current = null;
  };

  const totalDevices = config.devices.length + config.leftDevices.length + config.rightDevices.length;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className="app-shell mobile-shell flex flex-col bg-gray-900 overflow-hidden relative"
        style={{ height: viewportHeight, '--app-height': `${viewportHeight}px` } as React.CSSProperties}
        onDragEnter={handleFileDragEnter}
        onDragLeave={handleFileDragLeave}
        onDragOver={handleFileDragOver}
        onDrop={handleFileDrop}
      >
        {/* File drop overlay */}
        {isDraggingFile && (
          <div className="absolute inset-0 z-50 bg-blue-900/80 flex items-center justify-center pointer-events-none">
            <div className="bg-gray-800 border-2 border-dashed border-blue-400 rounded-xl p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium text-white">Drop JSON config</p>
            </div>
          </div>
        )}

        {/* Mobile header bar */}
        <header className="bg-gray-800 border-b border-gray-700 px-3 py-2 flex items-center justify-between flex-shrink-0 mobile-header">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white truncate">Rack Configurator</h1>
              <span className="text-xs text-gray-300 bg-gray-700 px-1.5 py-0.5 rounded">
                {config.rackU}U
              </span>
            </div>
            <p className="text-xs text-gray-400">{totalDevices} device{totalDevices !== 1 ? 's' : ''}</p>
          </div>
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-0.5">
            <button
              aria-pressed={mainViewMode === '2d'} aria-label="2D Editor" onClick={() => setMainViewMode('2d')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                mainViewMode === '2d'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              2D
            </button>
            <button
              aria-pressed={mainViewMode === '3d'} aria-label="3D Preview" onClick={() => setMainViewMode('3d')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                mainViewMode === '3d'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              3D
            </button>
          </div>
        </header>

        {/* Main editor view - takes all available space */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {mainViewMode === '2d' ? (
            <RackConfigurator touchControls onAddDevice={() => setActiveTab('devices')} onEditDevice={() => setActiveTab('properties')} />
          ) : (
            <RackPreview3D />
          )}
        </div>

        {/* Sheets for each tab */}
        <MobileSheet
          isOpen={isSheetOpen}
          onClose={handleCloseSheet}
          title={sheetTitle}
        >
          {activeTab === 'devices' && <MobileDeviceLibrary />}
          {activeTab === 'properties' && (
            <div className="mobile-property-panel">
              <PropertyPanel />
            </div>
          )}
          <div hidden={activeTab !== 'settings' && activeTab !== 'files'}>
            <MobileSettingsPanel view={activeTab === 'files' ? 'files' : 'settings'} />
          </div>
        </MobileSheet>

        {/* Bottom tab bar */}
        <MobileTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          deviceCount={totalDevices}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragDevice ? <DragPreview device={activeDragDevice} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
