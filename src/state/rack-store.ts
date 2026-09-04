import { create } from 'zustand';
import type {
  RackConfig,
  PlacedDevice,
  MountType,
  EarStyle,
  EarPosition,
  BackStyle,
  VentType,
  RenderMode,
  JoinerType,
  JoinerNutSide,
  JoinerScrewType,
  ShelfNotch,
  StandoffConfig,
  PCBPresetConfig,
} from './types';
import { canOrientDevice, getPlacedDeviceDimensions } from '../utils/device-geometry';
import { compactWall, activeDevices } from '../utils/layout-fit';
import { DEFAULT_RACK_CONFIG, getToollessHookCount } from './types';

interface RackStore {
  // Current configuration
  config: RackConfig;
  fitUndo: { before: RackConfig; after: RackConfig } | null;
  applyFittedLayout: (config: RackConfig) => void;
  undoFittedLayout: () => void;

  // UI state
  selectedDeviceId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number; // mm

  // Rendering state
  isRendering: boolean;
  lastRenderTime: number | null;
  modelUrl: string | null;

  // Actions - Rack settings
  setRackU: (rackU: RackConfig['rackU']) => void;
  setPanelWidth: (width: number) => void;
  setEarStyle: (style: EarStyle) => void;
  setEarPosition: (position: EarPosition) => void;
  setEarThickness: (thickness: number) => void;
  setToollessHookPattern: (pattern: boolean[]) => void;
  toggleToollessHook: (index: number) => void;
  setToollessHookTrimPattern: (pattern: boolean[]) => void;
  toggleToollessHookTrim: (index: number) => void;
  setBackStyle: (style: BackStyle) => void;
  setVentType: (type: VentType) => void;
  setPlateThickness: (thickness: number) => void;
  setCornerRadius: (radius: number) => void;
  setClearance: (clearance: number) => void;
  setHexDiameter: (diameter: number) => void;
  setHexWall: (wall: number) => void;
  setCutoutEdge: (edge: number) => void;
  setCutoutRadius: (radius: number) => void;
  setHeavyDevice: (level: 0 | 1 | 2) => void;
  setShowPreview: (show: boolean) => void;
  setShowLabels: (show: boolean) => void;

  // Actions - Split panel
  setIsSplit: (isSplit: boolean) => void;
  setSplitPosition: (position: number) => void;
  setSplitLocked: (locked: boolean) => void;
  setRenderMode: (mode: RenderMode) => void;
  setJoinerType: (type: JoinerType) => void;
  setJoinerNutSide: (side: JoinerNutSide) => void;
  setJoinerNutDepth: (depth: number) => void;
  setJoinerScrewType: (screwType: JoinerScrewType) => void;
  setJoinerNutFloor: (floor: number) => void;

  // Actions - Device management
  addDevice: (deviceId: string, offsetX?: number, offsetY?: number, mountType?: MountType, side?: 'left' | 'right') => string;
  addCustomDevice: (name: string, width: number, height: number, depth: number, offsetX?: number, offsetY?: number, mountType?: MountType, side?: 'left' | 'right') => string;
  removeDevice: (id: string) => void;
  updateDeviceOrientation: (id: string, orientation: 'normal' | 'side') => void;
  stackDeviceAbove: (id: string, targetId: string) => void;
  detachSharedMount: (id: string) => void;
  updateDevicePosition: (id: string, offsetX: number, offsetY: number) => void;
  updateDeviceMountType: (id: string, mountType: MountType) => void;
  updateDeviceBackStyle: (id: string, backStyle: BackStyle) => void;
  updateDeviceDimensions: (id: string, width: number, height: number, depth: number) => void;
  updateDevicePatchPanelPorts: (id: string, ports: number) => void;
  // Shelf-specific updates
  updateDeviceShelfHoneycomb: (id: string, useHoneycomb: boolean) => void;
  updateDeviceShelfSolidBottom: (id: string, solidBottom: boolean) => void;
  updateDeviceShelfNotch: (id: string, notch: ShelfNotch) => void;
  updateDeviceShelfNotchWidth: (id: string, width: number) => void;
  updateDeviceShelfScrewHoles: (id: string, count: number) => void;
  updateDeviceShelfCableHoles: (id: string, left: number, right: number) => void;
  updateDeviceShelfPullHandle: (id: string, pullHandle: boolean) => void;
  // Standoff updates (can be used on multiple mount types)
  updateDeviceStandoffs: (id: string, standoffs: StandoffConfig[]) => void;
  addDeviceStandoff: (id: string, standoff: StandoffConfig) => void;
  removeDeviceStandoff: (id: string, index: number) => void;
  updateDeviceStandoffCountersink: (id: string, countersink: boolean) => void;
  updateDeviceStandoffReinforced: (id: string, reinforced: boolean) => void;
  updateDevicePCBPreset: (id: string, pcbPreset: PCBPresetConfig | undefined) => void;
  moveDeviceToSide: (id: string, side: 'left' | 'right' | 'main') => void;
  selectDevice: (id: string | null) => void;
  clearDevices: () => void;

  // Actions - View controls
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  toggleShowGrid: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;

  // Actions - Rendering
  setRendering: (rendering: boolean) => void;
  setModelUrl: (url: string | null) => void;
  setLastRenderTime: (time: number) => void;

  // Actions - Configuration
  loadConfig: (config: RackConfig) => void;
  resetConfig: () => void;
}

// Simple UUID generator (fallback if uuid package not installed)
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Return the config with a new device appended to the correct list.
 * In split mode the main `devices` list is never rendered or exported, so a
 * device added without an explicit side is routed to left/right based on its
 * X position relative to the split line (same rule as updateDevicePosition).
 */
function appendDevice(
  config: RackConfig,
  device: PlacedDevice,
  side?: 'left' | 'right'
): RackConfig {
  if (config.isSplit) {
    const resolvedSide = side ?? (device.offsetX < config.splitPosition ? 'left' : 'right');
    const listKey = resolvedSide === 'left' ? 'leftDevices' : 'rightDevices';
    return { ...config, [listKey]: [...config[listKey], device] };
  }
  return { ...config, devices: [...config.devices, device] };
}

export const useRackStore = create<RackStore>((set, get) => ({
  // Initial state
  config: { ...DEFAULT_RACK_CONFIG },
  selectedDeviceId: null,
  fitUndo: null,
  applyFittedLayout: (config) => {
    const before = get().config;
    get().loadConfig(config);
    set({ fitUndo: { before, after: get().config } });
  },
  undoFittedLayout: () => {
    const undo = get().fitUndo;
    if (undo?.after === get().config) get().loadConfig(undo.before);
    set({ fitUndo: null });
  },
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  snapToGrid: true,
  gridSize: 1,
  isRendering: false,
  lastRenderTime: null,
  modelUrl: null,

  // Rack settings
  setRackU: (rackU) =>
    set((state) => {
      // When rack U changes, adjust the hook pattern to fit the new size
      const newHookCount = getToollessHookCount(rackU);
      const currentPattern = state.config.toollessHookPattern;
      const currentTrimPattern = state.config.toollessHookTrimPattern || [];
      let newPattern: boolean[];
      let newTrimPattern: boolean[];

      if (currentPattern.length >= newHookCount) {
        // Truncate patterns if rack is smaller
        newPattern = currentPattern.slice(0, newHookCount);
        newTrimPattern = currentTrimPattern.slice(0, newHookCount);
      } else {
        // Extend patterns if rack is larger
        // Hooks on by default, trim off by default
        newPattern = [...currentPattern];
        newTrimPattern = [...currentTrimPattern];
        while (newPattern.length < newHookCount) {
          newPattern.push(true);
          newTrimPattern.push(false);
        }
      }

      // Ensure at least one hook is enabled
      if (!newPattern.some(h => h) && newPattern.length > 0) {
        newPattern[0] = true;
      }

      return {
        config: { ...state.config, rackU, toollessHookPattern: newPattern, toollessHookTrimPattern: newTrimPattern },
      };
    }),

  setPanelWidth: (panelWidth) =>
    set((state) => ({
      config: { ...state.config, panelWidth },
    })),

  setEarStyle: (earStyle) =>
    set((state) => ({
      config: { ...state.config, earStyle },
    })),

  setEarPosition: (earPosition) =>
    set((state) => ({
      config: { ...state.config, earPosition },
    })),

  setBackStyle: (backStyle) =>
    set((state) => ({
      config: { ...state.config, backStyle },
    })),

  setVentType: (ventType) =>
    set((state) => ({
      config: { ...state.config, ventType },
    })),

  setPlateThickness: (plateThickness) =>
    set((state) => ({
      config: { ...state.config, plateThickness },
    })),

  setCornerRadius: (cornerRadius) =>
    set((state) => ({
      config: { ...state.config, cornerRadius },
    })),

  setClearance: (clearance) =>
    set((state) => ({
      config: { ...state.config, clearance },
    })),

  setHexDiameter: (hexDiameter) =>
    set((state) => ({
      config: { ...state.config, hexDiameter },
    })),

  setHexWall: (hexWall) =>
    set((state) => ({
      config: { ...state.config, hexWall },
    })),

  setCutoutEdge: (cutoutEdge) =>
    set((state) => ({
      config: { ...state.config, cutoutEdge },
    })),

  setCutoutRadius: (cutoutRadius) =>
    set((state) => ({
      config: { ...state.config, cutoutRadius },
    })),

  setHeavyDevice: (heavyDevice) =>
    set((state) => ({
      config: { ...state.config, heavyDevice },
    })),

  setShowPreview: (showPreview) =>
    set((state) => ({
      config: { ...state.config, showPreview },
    })),

  setShowLabels: (showLabels) =>
    set((state) => ({
      config: { ...state.config, showLabels },
    })),

  setEarThickness: (earThickness) =>
    set((state) => ({
      config: { ...state.config, earThickness },
    })),

  setToollessHookPattern: (toollessHookPattern) =>
    set((state) => ({
      config: { ...state.config, toollessHookPattern },
    })),

  toggleToollessHook: (index) =>
    set((state) => {
      const newPattern = [...state.config.toollessHookPattern];
      const newTrimPattern = [...(state.config.toollessHookTrimPattern || [])];
      // Ensure arrays are long enough
      while (newPattern.length <= index) {
        newPattern.push(false);
      }
      while (newTrimPattern.length <= index) {
        newTrimPattern.push(false);
      }
      newPattern[index] = !newPattern[index];

      // If we just enabled a hook, clear its trim setting (trim only applies when hook is disabled)
      if (newPattern[index]) {
        newTrimPattern[index] = false;
      }

      // Ensure at least one hook is enabled
      if (!newPattern.some(h => h)) {
        // If we just disabled the last hook, re-enable it
        newPattern[index] = true;
      }

      return {
        config: { ...state.config, toollessHookPattern: newPattern, toollessHookTrimPattern: newTrimPattern },
      };
    }),

  setToollessHookTrimPattern: (toollessHookTrimPattern) =>
    set((state) => ({
      config: { ...state.config, toollessHookTrimPattern },
    })),

  toggleToollessHookTrim: (index) =>
    set((state) => {
      const hookPattern = state.config.toollessHookPattern || [];
      const newTrimPattern = [...(state.config.toollessHookTrimPattern || [])];

      // Ensure array is long enough
      while (newTrimPattern.length <= index) {
        newTrimPattern.push(false);
      }

      // Only allow trim toggle if the hook at this index is disabled
      if (!hookPattern[index]) {
        newTrimPattern[index] = !newTrimPattern[index];
      }

      return {
        config: { ...state.config, toollessHookTrimPattern: newTrimPattern },
      };
    }),

  // Split panel settings
  setIsSplit: (isSplit) =>
    set((state) => {
      if (isSplit && !state.config.isSplit) {
        // Enabling split mode: move devices to left/right based on position
        const splitPos = state.config.splitPosition;
        const leftDevices = [...state.config.leftDevices];
        const rightDevices = [...state.config.rightDevices];

        // Migrate devices from main list to left/right based on their X position
        for (const device of state.config.devices) {
          if (device.offsetX < splitPos) {
            leftDevices.push(device);
          } else {
            rightDevices.push(device);
          }
        }

        return {
          config: {
            ...state.config,
            isSplit: true,
            renderMode: 'both',
            devices: [], // Clear main list
            leftDevices,
            rightDevices,
          },
        };
      } else if (!isSplit && state.config.isSplit) {
        // Disabling split mode: merge left/right back to main devices
        const devices = [
          ...state.config.devices,
          ...state.config.leftDevices,
          ...state.config.rightDevices,
        ];

        return {
          config: {
            ...state.config,
            isSplit: false,
            renderMode: 'single',
            devices,
            leftDevices: [],
            rightDevices: [],
          },
        };
      }

      return {
        config: {
          ...state.config,
          isSplit,
          renderMode: isSplit ? 'both' : 'single',
        },
      };
    }),

  setSplitPosition: (splitPosition) =>
    set((state) => ({
      config: { ...state.config, splitPosition },
    })),

  setSplitLocked: (splitLocked) =>
    set((state) => ({
      config: { ...state.config, splitLocked },
    })),

  setRenderMode: (renderMode) =>
    set((state) => ({
      config: { ...state.config, renderMode },
    })),

  setJoinerType: (joinerType) =>
    set((state) => ({
      config: { ...state.config, joinerType },
    })),

  setJoinerNutSide: (joinerNutSide) => {
    console.log('setJoinerNutSide called with:', joinerNutSide);
    set((state) => {
      console.log('Previous joinerNutSide:', state.config.joinerNutSide);
      console.log('New joinerNutSide:', joinerNutSide);
      return {
        config: { ...state.config, joinerNutSide },
      };
    });
  },

  setJoinerNutDepth: (joinerNutDepth) =>
    set((state) => ({
      config: { ...state.config, joinerNutDepth },
    })),

  setJoinerScrewType: (joinerScrewType) =>
    set((state) => ({
      config: { ...state.config, joinerScrewType },
    })),

  setJoinerNutFloor: (joinerNutFloor) =>
    set((state) => ({
      config: { ...state.config, joinerNutFloor },
    })),

  // Device management
  addDevice: (deviceId, offsetX = 0, offsetY = 0, mountType = 'cage', side) => {
    const id = generateId();
    const { snapToGrid, gridSize } = get();

    // Apply grid snapping to initial position
    const snappedX = snapToGrid ? Math.round(offsetX / gridSize) * gridSize : offsetX;
    const snappedY = snapToGrid ? Math.round(offsetY / gridSize) * gridSize : offsetY;

    const newDevice: PlacedDevice = {
      id,
      deviceId,
      offsetX: snappedX,
      offsetY: snappedY,
      mountType,
    };
    set((state) => ({
      config: appendDevice(state.config, newDevice, side),
      selectedDeviceId: id,
    }));
    return id;
  },

  addCustomDevice: (name, width, height, depth, offsetX = 0, offsetY = 0, mountType = 'cage', side) => {
    const id = generateId();
    const { snapToGrid, gridSize } = get();

    // Apply grid snapping to initial position
    const snappedX = snapToGrid ? Math.round(offsetX / gridSize) * gridSize : offsetX;
    const snappedY = snapToGrid ? Math.round(offsetY / gridSize) * gridSize : offsetY;

    const newDevice: PlacedDevice = {
      id,
      deviceId: 'custom',
      offsetX: snappedX,
      offsetY: snappedY,
      mountType,
      customName: name,
      customWidth: width,
      customHeight: height,
      customDepth: depth,
    };
    set((state) => ({
      config: appendDevice(state.config, newDevice, side),
      selectedDeviceId: id,
    }));
    return id;
  },

  updateDeviceOrientation: (id, orientation) => set((state) => {
    const update = (d: PlacedDevice) => d.id === id && canOrientDevice(d) ? { ...d, orientation, sharedMountGroup: undefined } : d;
    return { config: { ...state.config, devices: state.config.devices.map(update), leftDevices: state.config.leftDevices.map(update), rightDevices: state.config.rightDevices.map(update) } };
  }),

  detachSharedMount: (id) => set((state) => {
    const update = (d: PlacedDevice) => d.id === id ? { ...d, sharedMountGroup: undefined } : d;
    return { config: { ...state.config, devices: state.config.devices.map(update), leftDevices: state.config.leftDevices.map(update), rightDevices: state.config.rightDevices.map(update) } };
  }),

  stackDeviceAbove: (id, targetId) => set((state) => {
    const c = state.config;
    const device = activeDevices(c).find(d => d.id === id);
    const target = activeDevices(c).find(d => d.id === targetId);
    if (!device || !target || id === targetId || !canOrientDevice(device) || !canOrientDevice(target)) return state;
    const list = c.isSplit ? (c.leftDevices.some(d => d.id === targetId) ? 'leftDevices' : 'rightDevices') : 'devices';
    if (!c[list].some(d => d.id === id)) return state;
    const group = target.sharedMountGroup || `shared-${targetId}`;
    const y = target.offsetY + (getPlacedDeviceDimensions(target).height + getPlacedDeviceDimensions(device).height)/2 + c.clearance + compactWall(c);
    return { config: { ...c, [list]: c[list].map(d => d.id === id ? { ...d, mountType: 'compact', sharedMountGroup: group, offsetX: target.offsetX, offsetY: y }
      : d.id === targetId ? { ...d, mountType: 'compact', sharedMountGroup: group } : d) } };
  }),

  removeDevice: (id) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.filter((d) => d.id !== id),
        leftDevices: state.config.leftDevices.filter((d) => d.id !== id),
        rightDevices: state.config.rightDevices.filter((d) => d.id !== id),
      },
      selectedDeviceId: state.selectedDeviceId === id ? null : state.selectedDeviceId,
    })),

  updateDevicePosition: (id, offsetX, offsetY) => {
    const { snapToGrid, gridSize } = get();
    const snappedX = snapToGrid ? Math.round(offsetX / gridSize) * gridSize : offsetX;
    const snappedY = snapToGrid ? Math.round(offsetY / gridSize) * gridSize : offsetY;

    set((state) => {
      // Shared dividers are a physical assembly: translate every member by the
      // same delta so dragging or editing a coordinate preserves the divider.
      const original = activeDevices(state.config).find(d => d.id === id);
      const group = original?.sharedMountGroup;
      if (original && group) {
        const members = activeDevices(state.config).filter(d => d.sharedMountGroup === group);
        if (members.length > 1) {
          const moved = members.map(d => ({ ...d, offsetX: d.offsetX + snappedX - original.offsetX, offsetY: d.offsetY + snappedY - original.offsetY }));
          const keep = (d: PlacedDevice) => d.sharedMountGroup !== group;
          const target = state.config.isSplit ? (snappedX < state.config.splitPosition ? 'leftDevices' : 'rightDevices') : 'devices';
          const config = { ...state.config, devices: state.config.devices.filter(keep), leftDevices: state.config.leftDevices.filter(keep), rightDevices: state.config.rightDevices.filter(keep) };
          config[target] = [...config[target], ...moved];
          return { config };
        }
      }
      // If in split mode, check if device needs to move to the other side
      if (state.config.isSplit) {
        const splitPos = state.config.splitPosition;
        const isInLeft = state.config.leftDevices.some((d) => d.id === id);
        const isInRight = state.config.rightDevices.some((d) => d.id === id);

        // Determine which side the device should be on based on new position
        const shouldBeLeft = snappedX < splitPos;
        const shouldBeRight = snappedX >= splitPos;

        // If device needs to move to the other side
        if (isInLeft && shouldBeRight) {
          const device = state.config.leftDevices.find((d) => d.id === id);
          if (device) {
            return {
              config: {
                ...state.config,
                leftDevices: state.config.leftDevices.filter((d) => d.id !== id),
                rightDevices: [...state.config.rightDevices, { ...device, offsetX: snappedX, offsetY: snappedY }],
              },
            };
          }
        } else if (isInRight && shouldBeLeft) {
          const device = state.config.rightDevices.find((d) => d.id === id);
          if (device) {
            return {
              config: {
                ...state.config,
                rightDevices: state.config.rightDevices.filter((d) => d.id !== id),
                leftDevices: [...state.config.leftDevices, { ...device, offsetX: snappedX, offsetY: snappedY }],
              },
            };
          }
        }
      }

      // Default: just update position in place
      return {
        config: {
          ...state.config,
          devices: state.config.devices.map((d) =>
            d.id === id ? { ...d, offsetX: snappedX, offsetY: snappedY } : d
          ),
          leftDevices: state.config.leftDevices.map((d) =>
            d.id === id ? { ...d, offsetX: snappedX, offsetY: snappedY } : d
          ),
          rightDevices: state.config.rightDevices.map((d) =>
            d.id === id ? { ...d, offsetX: snappedX, offsetY: snappedY } : d
          ),
        },
      };
    });
  },

  updateDeviceMountType: (id, mountType) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, mountType, sharedMountGroup: undefined, orientation: canOrientDevice({ ...d, mountType }) ? d.orientation : undefined } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, mountType, sharedMountGroup: undefined, orientation: canOrientDevice({ ...d, mountType }) ? d.orientation : undefined } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, mountType, sharedMountGroup: undefined, orientation: canOrientDevice({ ...d, mountType }) ? d.orientation : undefined } : d
        ),
      },
    })),

  updateDeviceBackStyle: (id, backStyle) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, backStyle } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, backStyle } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, backStyle } : d
        ),
      },
    })),

  updateDeviceDimensions: (id, width, height, depth) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id && d.deviceId === 'custom'
            ? { ...d, customWidth: width, customHeight: height, customDepth: depth }
            : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id && d.deviceId === 'custom'
            ? { ...d, customWidth: width, customHeight: height, customDepth: depth }
            : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id && d.deviceId === 'custom'
            ? { ...d, customWidth: width, customHeight: height, customDepth: depth }
            : d
        ),
      },
    })),

  updateDevicePatchPanelPorts: (id, ports) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, patchPanelPorts: ports } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, patchPanelPorts: ports } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, patchPanelPorts: ports } : d
        ),
      },
    })),

  // Shelf-specific updates
  updateDeviceShelfHoneycomb: (id, useHoneycomb) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, shelfUseHoneycomb: useHoneycomb } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, shelfUseHoneycomb: useHoneycomb } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, shelfUseHoneycomb: useHoneycomb } : d
        ),
      },
    })),

  updateDeviceShelfSolidBottom: (id, solidBottom) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, shelfSolidBottom: solidBottom } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, shelfSolidBottom: solidBottom } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, shelfSolidBottom: solidBottom } : d
        ),
      },
    })),

  updateDeviceShelfNotch: (id, notch) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, shelfNotch: notch } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, shelfNotch: notch } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, shelfNotch: notch } : d
        ),
      },
    })),

  updateDeviceShelfNotchWidth: (id, width) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, shelfNotchWidth: width } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, shelfNotchWidth: width } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, shelfNotchWidth: width } : d
        ),
      },
    })),

  updateDeviceShelfScrewHoles: (id, count) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, shelfScrewHoles: count } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, shelfScrewHoles: count } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, shelfScrewHoles: count } : d
        ),
      },
    })),

  updateDeviceShelfCableHoles: (id, left, right) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, shelfCableHolesLeft: left, shelfCableHolesRight: right } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, shelfCableHolesLeft: left, shelfCableHolesRight: right } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, shelfCableHolesLeft: left, shelfCableHolesRight: right } : d
        ),
      },
    })),

  updateDeviceShelfPullHandle: (id, pullHandle) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, shelfPullHandle: pullHandle } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, shelfPullHandle: pullHandle } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, shelfPullHandle: pullHandle } : d
        ),
      },
    })),

  // Standoff updates
  updateDeviceStandoffs: (id, standoffs) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, standoffs } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, standoffs } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, standoffs } : d
        ),
      },
    })),

  addDeviceStandoff: (id, standoff) =>
    set((state) => {
      const updateDevice = (d: PlacedDevice) =>
        d.id === id ? { ...d, standoffs: [...(d.standoffs || []), standoff] } : d;
      return {
        config: {
          ...state.config,
          devices: state.config.devices.map(updateDevice),
          leftDevices: state.config.leftDevices.map(updateDevice),
          rightDevices: state.config.rightDevices.map(updateDevice),
        },
      };
    }),

  removeDeviceStandoff: (id, index) =>
    set((state) => {
      const updateDevice = (d: PlacedDevice) =>
        d.id === id
          ? { ...d, standoffs: (d.standoffs || []).filter((_, i) => i !== index) }
          : d;
      return {
        config: {
          ...state.config,
          devices: state.config.devices.map(updateDevice),
          leftDevices: state.config.leftDevices.map(updateDevice),
          rightDevices: state.config.rightDevices.map(updateDevice),
        },
      };
    }),

  updateDeviceStandoffCountersink: (id, countersink) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, standoffCountersink: countersink } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, standoffCountersink: countersink } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, standoffCountersink: countersink } : d
        ),
      },
    })),

  updateDeviceStandoffReinforced: (id, reinforced) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, standoffReinforced: reinforced } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, standoffReinforced: reinforced } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, standoffReinforced: reinforced } : d
        ),
      },
    })),

  updateDevicePCBPreset: (id, pcbPreset) =>
    set((state) => ({
      config: {
        ...state.config,
        devices: state.config.devices.map((d) =>
          d.id === id ? { ...d, pcbPreset } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, pcbPreset } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, pcbPreset } : d
        ),
      },
    })),

  moveDeviceToSide: (id, side) =>
    set((state) => {
      // Find the device in any list
      const device =
        state.config.devices.find((d) => d.id === id) ||
        state.config.leftDevices.find((d) => d.id === id) ||
        state.config.rightDevices.find((d) => d.id === id);

      if (!device) return state;

      // Remove from all lists
      const newDevices = state.config.devices.filter((d) => d.id !== id);
      const newLeftDevices = state.config.leftDevices.filter((d) => d.id !== id);
      const newRightDevices = state.config.rightDevices.filter((d) => d.id !== id);

      // Add to target list
      if (side === 'left') {
        newLeftDevices.push(device);
      } else if (side === 'right') {
        newRightDevices.push(device);
      } else {
        newDevices.push(device);
      }

      return {
        config: {
          ...state.config,
          devices: newDevices,
          leftDevices: newLeftDevices,
          rightDevices: newRightDevices,
        },
      };
    }),

  selectDevice: (id) => set({ selectedDeviceId: id }),

  clearDevices: () =>
    set((state) => ({
      config: {
        ...state.config,
        devices: [],
        leftDevices: [],
        rightDevices: [],
      },
      selectedDeviceId: null,
    })),

  // View controls
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),

  setPan: (panX, panY) => set({ panX, panY }),

  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),

  toggleShowGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

  setGridSize: (gridSize) => set({ gridSize }),

  // Rendering
  setRendering: (isRendering) => set({ isRendering }),

  setModelUrl: (modelUrl) => set({ modelUrl }),

  setLastRenderTime: (lastRenderTime) => set({ lastRenderTime }),

  // Configuration
  loadConfig: (config) => {
    // Migrate old configs that don't have toollessHookPattern or toollessHookTrimPattern
    const hookCount = getToollessHookCount(config.rackU);
    let migratedConfig: RackConfig = {
      ...DEFAULT_RACK_CONFIG,
      ...config,
      devices: config.devices || [],
      leftDevices: config.leftDevices || [],
      rightDevices: config.rightDevices || [],
      toollessHookPattern: config.toollessHookPattern || Array(hookCount).fill(true),
      toollessHookTrimPattern: config.toollessHookTrimPattern || Array(hookCount).fill(false),
    };
    // Split configs saved with devices stranded in the main list (older bug):
    // move them to the correct side so they show up and get exported.
    if (migratedConfig.isSplit && migratedConfig.devices.length > 0) {
      const stranded = migratedConfig.devices;
      migratedConfig = { ...migratedConfig, devices: [] };
      for (const device of stranded) {
        migratedConfig = appendDevice(migratedConfig, device);
      }
    }
    set({
      config: migratedConfig,
      selectedDeviceId: null,
    });
  },

  resetConfig: () =>
    set({
      config: { ...DEFAULT_RACK_CONFIG },
      selectedDeviceId: null,
    }),
}));
