import { useEffect, useRef, useState, useCallback } from 'react';
import { useRackStore } from '../state/rack-store';
import { generateScadCode } from '../utils/scad-generator';
import { initializeWorker, renderScad, isWorkerReady } from '../worker/openscad-runner';
import type { RackConfig } from '../state/types';

export interface LiveRenderState {
  stlData: ArrayBuffer | null;
  isRendering: boolean;
  error: string | null;
  lastRenderTime: number | null;
}

const DEBOUNCE_DELAY = 1000; // 1 second debounce

function getConfigHash(config: RackConfig): string {
  return JSON.stringify({
    rackU: config.rackU,
    earStyle: config.earStyle,
    earPosition: config.earPosition,
    earThickness: config.earThickness,
    backStyle: config.backStyle,
    ventType: config.ventType,
    plateThickness: config.plateThickness,
    cornerRadius: config.cornerRadius,
    clearance: config.clearance,
    hexDiameter: config.hexDiameter,
    hexWall: config.hexWall,
    cutoutEdge: config.cutoutEdge,
    cutoutRadius: config.cutoutRadius,
    heavyDevice: config.heavyDevice,
    isSplit: config.isSplit,
    splitPosition: config.splitPosition,
    renderMode: config.renderMode,
    joinerNutSide: config.joinerNutSide,
    joinerNutDepth: config.joinerNutDepth,
    devices: config.devices,
    leftDevices: config.leftDevices,
    rightDevices: config.rightDevices,
  });
}

export function useLiveScadRender(): LiveRenderState {
  const config = useRackStore((state) => state.config);

  const [state, setState] = useState<LiveRenderState>({
    stlData: null,
    isRendering: false,
    error: null,
    lastRenderTime: null,
  });

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastConfigHashRef = useRef<string>('');
  const isRenderingRef = useRef(false);
  const pendingRenderRef = useRef(false);

  const doRender = useCallback(async (currentConfig: RackConfig) => {
    if (isRenderingRef.current) {
      pendingRenderRef.current = true;
      return;
    }

    isRenderingRef.current = true;
    setState((prev) => ({ ...prev, isRendering: true, error: null }));

    try {
      // Initialize worker if needed
      if (!isWorkerReady()) {
        await initializeWorker();
      }

      // Generate SCAD code with preview disabled (for cleaner geometry)
      const scadCode = generateScadCode(currentConfig, false);

      const startTime = performance.now();

      // Render to STL
      const result = await renderScad({
        scadCode,
        outputFormat: 'stl',
        variables: { '$preview': true },
      });

      const renderTime = Math.round(performance.now() - startTime);

      if (result.success && result.output) {
        setState({
          stlData: result.output,
          isRendering: false,
          error: null,
          lastRenderTime: renderTime,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isRendering: false,
          error: result.error || 'Unknown render error',
        }));
      }
    } catch (e) {
      setState((prev) => ({
        ...prev,
        isRendering: false,
        error: e instanceof Error ? e.message : 'Render failed',
      }));
    } finally {
      isRenderingRef.current = false;

      // If there was a pending render request, trigger it now
      if (pendingRenderRef.current) {
        pendingRenderRef.current = false;
        // Get the latest config from the store
        const latestConfig = useRackStore.getState().config;
        doRender(latestConfig);
      }
    }
  }, []);

  useEffect(() => {
    const configHash = getConfigHash(config);

    // Skip if config hasn't changed
    if (configHash === lastConfigHashRef.current) {
      return;
    }
    lastConfigHashRef.current = configHash;

    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set up debounced render
    debounceTimeoutRef.current = setTimeout(() => {
      doRender(config);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [config, doRender]);

  // Trigger initial render
  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      doRender(config);
    }, 100);

    return () => clearTimeout(initialTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
