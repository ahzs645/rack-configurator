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
} from './types';
import { DEFAULT_RACK_CONFIG, getToollessHookCount } from './types';

interface RackStore {
  // Current configuration
  config: RackConfig;

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
  updateDevicePosition: (id: string, offsetX: number, offsetY: number) => void;
  updateDeviceMountType: (id: string, mountType: MountType) => void;
  updateDeviceBackStyle: (id: string, backStyle: BackStyle) => void;
  updateDeviceDimensions: (id: string, width: number, height: number, depth: number) => void;
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

export const useRackStore = create<RackStore>((set, get) => ({
  // Initial state
  config: { ...DEFAULT_RACK_CONFIG },
  selectedDeviceId: null,
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
      let newPattern: boolean[];

      if (currentPattern.length >= newHookCount) {
        // Truncate pattern if rack is smaller
        newPattern = currentPattern.slice(0, newHookCount);
      } else {
        // Extend pattern with true values if rack is larger (hooks on by default)
        newPattern = [...currentPattern];
        while (newPattern.length < newHookCount) {
          newPattern.push(true);
        }
      }

      // Ensure at least one hook is enabled
      if (!newPattern.some(h => h) && newPattern.length > 0) {
        newPattern[0] = true;
      }

      return {
        config: { ...state.config, rackU, toollessHookPattern: newPattern },
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
      // Ensure array is long enough
      while (newPattern.length <= index) {
        newPattern.push(false);
      }
      newPattern[index] = !newPattern[index];

      // Ensure at least one hook is enabled
      if (!newPattern.some(h => h)) {
        // If we just disabled the last hook, re-enable it
        newPattern[index] = true;
      }

      return {
        config: { ...state.config, toollessHookPattern: newPattern },
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
    set((state) => {
      if (state.config.isSplit && side) {
        // Add to specific side in split mode
        const listKey = side === 'left' ? 'leftDevices' : 'rightDevices';
        return {
          config: {
            ...state.config,
            [listKey]: [...state.config[listKey], newDevice],
          },
          selectedDeviceId: id,
        };
      }
      // Add to main devices list
      return {
        config: {
          ...state.config,
          devices: [...state.config.devices, newDevice],
        },
        selectedDeviceId: id,
      };
    });
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
    set((state) => {
      if (state.config.isSplit && side) {
        const listKey = side === 'left' ? 'leftDevices' : 'rightDevices';
        return {
          config: {
            ...state.config,
            [listKey]: [...state.config[listKey], newDevice],
          },
          selectedDeviceId: id,
        };
      }
      return {
        config: {
          ...state.config,
          devices: [...state.config.devices, newDevice],
        },
        selectedDeviceId: id,
      };
    });
    return id;
  },

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
          d.id === id ? { ...d, mountType } : d
        ),
        leftDevices: state.config.leftDevices.map((d) =>
          d.id === id ? { ...d, mountType } : d
        ),
        rightDevices: state.config.rightDevices.map((d) =>
          d.id === id ? { ...d, mountType } : d
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
    // Migrate old configs that don't have toollessHookPattern
    const hookCount = getToollessHookCount(config.rackU);
    const migratedConfig = {
      ...config,
      toollessHookPattern: config.toollessHookPattern || Array(hookCount).fill(true),
    };
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
