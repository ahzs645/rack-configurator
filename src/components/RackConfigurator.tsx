import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useRackStore } from '../state/rack-store';
import type { ViewConfig } from '../utils/coordinates';
import {
  getRackBoundsSvg,
  rackToSvg,
  svgToRack,
  getRackDimensions,
  rackSizeToSvg,
  devicesOverlap,
} from '../utils/coordinates';
import { getPlacedDeviceDimensions } from '../utils/scad-generator';
import { DeviceOnRack } from './DeviceOnRack';
import { RACK_CONSTANTS, TOOLLESS_HOOK_SPACING, getToollessHookCount, type EarStyle, type EarPosition } from '../state/types';

const PADDING = 40;

// Ear dimensions based on EIA-310 rack standard
const EAR_WIDTH = (RACK_CONSTANTS.FACEPLATE_WIDTH - RACK_CONSTANTS.PANEL_WIDTH) / 2; // ~15.875mm

// Split line exclusion zone - devices (including cage walls) must not overlap
// Components:
// - Joiner wall: 4mm (extends 2mm on each side)
// - Cage wall thickness: 4-6mm (depending on heavy_device setting)
// - Buffer: 2mm for tolerance
// Total: ~10mm on each side of split line
const SPLIT_MARGIN = 10; // mm on each side of split line
const CAGE_WALL_THICKNESS = 6; // max cage wall thickness (heavy_device=2)

// Hook dimensions from OpenSCAD backplate_profile (rack_ears.scad)
// The hook profile: X range -12.1 to 0 (12.1mm), Y range 2.25 to 32.65 (30.4mm)
const HOOK_HEIGHT = 30.4; // mm - total height of the hook profile

// Render ear shapes based on style
interface EarProps {
  side: 'left' | 'right';
  rackBounds: { x: number; y: number; width: number; height: number };
  earStyle: EarStyle;
  earPosition: EarPosition;
  hookPattern: boolean[];  // Which hooks are enabled (for toolless style)
  rackU: number;
  view: ViewConfig;
}

function RackEar({ side, rackBounds, earStyle, earPosition, hookPattern, rackU, view }: EarProps) {
  if (earStyle === 'none') return null;

  // Convert dimensions to SVG pixels
  const hookHeightPx = rackSizeToSvg(HOOK_HEIGHT, view);

  // Position hook on left or right of rack panel
  // For left side: hook extends to the left of the panel
  // For right side: hook extends to the right of the panel
  const panelEdgeX = side === 'left' ? rackBounds.x : rackBounds.x + rackBounds.width;

  // Render a single toolless hook at a given Y offset from bottom of rack
  const renderToollessHookAtPosition = (hookIndex: number) => {
    const s = (mm: number) => rackSizeToSvg(mm, view);
    const dir = side === 'left' ? -1 : 1;
    const maxY = 32.65; // Top of hook in OpenSCAD coords

    // Calculate Y position for this hook
    // Hooks are positioned from bottom, so index 0 is at bottom
    // In SVG, Y increases downward, so we subtract from bottom of rack
    const hookOffsetFromBottom = hookIndex * TOOLLESS_HOOK_SPACING;
    const hookOffsetFromBottomPx = rackSizeToSvg(hookOffsetFromBottom, view);
    const hookY = rackBounds.y + rackBounds.height - hookHeightPx - hookOffsetFromBottomPx;

    // Exact backplate_profile polygon points, converted to SVG coordinates
    // OpenSCAD: Y increases up, X=0 is panel edge, negative X extends outward
    // SVG: Y increases down, we flip Y and mirror X based on side
    const points = [
      // Start at A, go through polygon
      { x: dir * 8.1, y: maxY - 12.55 },   // A
      { x: dir * 4.7, y: maxY - 12.55 },   // B
      { x: dir * 4.7, y: maxY - 2.25 },    // C
      { x: 0, y: maxY - 2.25 },            // D (panel edge, bottom)
      { x: 0, y: maxY - 32.65 },           // E (panel edge, top) = y:0
      { x: dir * 12.1, y: maxY - 32.65 },  // F (outer edge, top)
      { x: dir * 12.1, y: maxY - 22.65 },  // G
      { x: dir * 8.1, y: maxY - 22.65 },   // H
      { x: dir * 8.1, y: maxY - 28.15 },   // I
      { x: dir * 4.7, y: maxY - 28.15 },   // J
      { x: dir * 4.7, y: maxY - 17.05 },   // K
      { x: dir * 12.1, y: maxY - 17.05 },  // L
      { x: dir * 12.1, y: maxY - 7.05 },   // M
      { x: dir * 8.1, y: maxY - 7.05 },    // N (back to A)
    ];

    const pathData = points.map((p, i) => {
      const x = panelEdgeX + s(p.x);
      const y = hookY + s(p.y);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ') + ' Z';

    return (
      <path
        key={`hook-${side}-${hookIndex}`}
        d={pathData}
        fill="#374151"
        stroke="#4b5563"
        strokeWidth={1.5}
      />
    );
  };

  // Render all enabled hooks based on the pattern
  const renderToollessHooks = () => {
    const hookCount = getToollessHookCount(rackU);
    const hooks: React.ReactNode[] = [];

    for (let i = 0; i < hookCount; i++) {
      // Check if this hook is enabled (default to first hook if pattern is shorter)
      const isEnabled = i < hookPattern.length ? hookPattern[i] : (i === 0);
      if (isEnabled) {
        hooks.push(renderToollessHookAtPosition(i));
      }
    }

    return <g>{hooks}</g>;
  };

  // Legacy: Calculate hook Y position based on earPosition (for fusion/simple)
  let hookOffsetY: number;
  switch (earPosition) {
    case 'top':
      hookOffsetY = 0; // Hook at top
      break;
    case 'center':
      hookOffsetY = (rackBounds.height - hookHeightPx) / 2; // Hook centered
      break;
    case 'bottom':
    default:
      hookOffsetY = rackBounds.height - hookHeightPx; // Hook at bottom
      break;
  }

  const hookY = rackBounds.y + hookOffsetY;

  const renderFusionEar = () => {
    // Fusion style uses the same L-bracket as toolless but with mounting holes
    // It's an L-shaped bracket that extends behind the panel
    const earWidth = rackSizeToSvg(40, view); // Standard ear width

    const earX = side === 'left'
      ? panelEdgeX - earWidth
      : panelEdgeX;

    // Mounting hole position
    const holeRadius = rackSizeToSvg(2.25, view);
    const holeCenterX = earX + earWidth / 2;
    const holeCenterY = hookY + hookHeightPx / 2;

    return (
      <g>
        <rect
          x={earX}
          y={hookY}
          width={earWidth}
          height={hookHeightPx}
          rx={rackSizeToSvg(2, view)}
          fill="#374151"
          stroke="#4b5563"
          strokeWidth={1.5}
        />
        {/* Mounting hole */}
        <circle
          cx={holeCenterX}
          cy={holeCenterY}
          r={holeRadius}
          fill="#1f2937"
          stroke="#6b7280"
          strokeWidth={1}
        />
      </g>
    );
  };

  const renderSimpleEar = () => {
    // Simple L-bracket - standard EIA ear width (~15.875mm)
    const earWidthPx = rackSizeToSvg(EAR_WIDTH, view);
    const earX = side === 'left'
      ? panelEdgeX - earWidthPx
      : panelEdgeX;

    // Simple ear spans full rack height
    return (
      <rect
        x={earX}
        y={rackBounds.y}
        width={earWidthPx}
        height={rackBounds.height}
        rx={rackSizeToSvg(2, view)}
        fill="#374151"
        stroke="#4b5563"
        strokeWidth={1.5}
      />
    );
  };

  switch (earStyle) {
    case 'toolless':
      return renderToollessHooks();
    case 'fusion':
      return renderFusionEar();
    case 'simple':
      return renderSimpleEar();
    default:
      return null;
  }
}

// Render trim notches for sections without hooks (when trim is enabled)
interface TrimNotchesProps {
  rackBounds: { x: number; y: number; width: number; height: number };
  hookPattern: boolean[];
  trimPattern: boolean[];
  rackU: number;
  earThickness: number;  // The trim amount (typically 2.9mm)
  view: ViewConfig;
}

function TrimNotches({ rackBounds, hookPattern, trimPattern, rackU, earThickness, view }: TrimNotchesProps) {
  const hookCount = getToollessHookCount(rackU);
  const trimWidthPx = rackSizeToSvg(earThickness, view);
  const rackHeightMm = rackU * RACK_CONSTANTS.UNIT_HEIGHT;
  const notches: React.ReactNode[] = [];

  for (let i = 0; i < hookCount; i++) {
    const isHookDisabled = !(hookPattern[i] ?? true);
    const isTrimEnabled = isHookDisabled && (trimPattern[i] ?? false);

    if (isTrimEnabled) {
      // Calculate the section boundaries for this hook position
      const sectionStartMm = i * TOOLLESS_HOOK_SPACING;
      const sectionEndMm = Math.min((i + 1) * TOOLLESS_HOOK_SPACING, rackHeightMm);
      const sectionHeightMm = sectionEndMm - sectionStartMm;

      // Convert to SVG coordinates (Y increases downward in SVG)
      const sectionHeightPx = rackSizeToSvg(sectionHeightMm, view);
      const sectionOffsetFromBottomPx = rackSizeToSvg(sectionStartMm, view);
      const sectionTopY = rackBounds.y + rackBounds.height - sectionOffsetFromBottomPx - sectionHeightPx;

      // Left notch
      notches.push(
        <rect
          key={`trim-left-${i}`}
          x={rackBounds.x}
          y={sectionTopY}
          width={trimWidthPx}
          height={sectionHeightPx}
          fill="#111827"
          stroke="#f59e0b"
          strokeWidth={1}
          strokeOpacity={0.5}
        />
      );

      // Right notch
      notches.push(
        <rect
          key={`trim-right-${i}`}
          x={rackBounds.x + rackBounds.width - trimWidthPx}
          y={sectionTopY}
          width={trimWidthPx}
          height={sectionHeightPx}
          fill="#111827"
          stroke="#f59e0b"
          strokeWidth={1}
          strokeOpacity={0.5}
        />
      );
    }
  }

  return notches.length > 0 ? <g>{notches}</g> : null;
}

export function RackConfigurator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgSize, setSvgSize] = useState({ width: 800, height: 600 });
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  const {
    config,
    zoom,
    panX,
    panY,
    showGrid,
    snapToGrid,
    gridSize,
    selectDevice,
    setZoom,
    setPan,
    setSplitPosition,
  } = useRackStore();

  // Make this component a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: 'rack-drop-zone',
  });

  // Update SVG size on container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSvgSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // View configuration for coordinate transforms
  const view: ViewConfig = {
    svgWidth: svgSize.width,
    svgHeight: svgSize.height,
    rackU: config.rackU,
    panelWidth: config.panelWidth,
    zoom,
    panX,
    panY,
    padding: PADDING,
  };

  // Get rack bounds in SVG coords
  const rackBounds = getRackBoundsSvg(view);
  const rack = getRackDimensions(config.rackU, config.panelWidth);

  // Calculate pan limits based on rack size, viewport, and zoom level
  const getPanLimits = useCallback(() => {
    // At higher zoom levels, allow panning further to see the whole rack
    // Scale pan limits with zoom so user can reach all parts of the zoomed view
    const baseLimit = 0.4;
    const zoomFactor = Math.max(1, zoom);
    const maxPanX = svgSize.width * baseLimit * zoomFactor;
    const maxPanY = svgSize.height * baseLimit * zoomFactor;
    return { maxPanX, maxPanY };
  }, [svgSize.width, svgSize.height, zoom]);

  // Clamp pan values to limits
  const clampPan = useCallback((x: number, y: number) => {
    const { maxPanX, maxPanY } = getPanLimits();
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y)),
    };
  }, [getPanLimits]);

  // Handle wheel for zoom - use native event listener to prevent page zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Always prevent default to stop page zoom

      if (e.ctrlKey || e.metaKey) {
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(zoom * zoomDelta);
      } else {
        // Pan with limits
        const newPan = clampPan(panX - e.deltaX, panY - e.deltaY);
        setPan(newPan.x, newPan.y);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, panX, panY, setZoom, setPan, clampPan]);

  // Handle background mouse down for panning
  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    // Only start panning on left click and not on a device
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY, panX, panY });
  };

  // Deselect on background click (only if we didn't pan)
  const handleBackgroundClick = () => {
    if (!isPanning) {
      selectDevice(null);
    }
  };

  // Get all devices to display (either main devices or split devices)
  const allDevices = config.isSplit
    ? [...config.leftDevices, ...config.rightDevices]
    : config.devices;

  // Calculate split line position (moved here so it's available for overlap detection)
  const splitLineX = config.splitPosition || 0; // 0 = center

  // Check if a device overlaps with the split exclusion zone
  const deviceOverlapsSplitZone = (device: typeof allDevices[0]) => {
    if (!config.isSplit) return false;

    const dims = getPlacedDeviceDimensions(device);
    // Include cage wall thickness in bounds (cage walls extend beyond cutout)
    // For "none" mount type, there's no cage, so no extra margin needed
    const cageMargin = device.mountType === 'none' ? 0 : CAGE_WALL_THICKNESS;
    const deviceLeft = device.offsetX - dims.width / 2 - cageMargin;
    const deviceRight = device.offsetX + dims.width / 2 + cageMargin;
    const splitLeft = splitLineX - SPLIT_MARGIN;
    const splitRight = splitLineX + SPLIT_MARGIN;

    // Check if device bounds (including cage walls) overlap with split exclusion zone
    return deviceRight > splitLeft && deviceLeft < splitRight;
  };

  // Get effective dimensions including cage walls
  const getEffectiveDimensions = (device: typeof allDevices[0]) => {
    const dims = getPlacedDeviceDimensions(device);
    // Add cage wall thickness on each side (except for "none" mount type)
    const cageMargin = device.mountType === 'none' ? 0 : CAGE_WALL_THICKNESS;
    return {
      ...dims,
      width: dims.width + cageMargin * 2,
      height: dims.height + cageMargin * 2,
    };
  };

  // Check for overlapping devices and devices that cross the split zone
  const getOverlappingDevices = () => {
    const overlapping = new Set<string>();

    for (let i = 0; i < allDevices.length; i++) {
      const d1 = allDevices[i];
      const effDims1 = getEffectiveDimensions(d1);

      // Check if device overlaps with split exclusion zone
      if (deviceOverlapsSplitZone(d1)) {
        overlapping.add(d1.id);
      }

      for (let j = i + 1; j < allDevices.length; j++) {
        const d2 = allDevices[j];
        const effDims2 = getEffectiveDimensions(d2);

        // Check overlap using effective dimensions (including cage walls)
        if (
          devicesOverlap(
            d1.offsetX,
            d1.offsetY,
            effDims1.width,
            effDims1.height,
            d2.offsetX,
            d2.offsetY,
            effDims2.width,
            effDims2.height
          )
        ) {
          overlapping.add(d1.id);
          overlapping.add(d2.id);
        }
      }
    }

    return overlapping;
  };

  const overlappingDevices = getOverlappingDevices();

  // Handle split line drag (only if not locked)
  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    if (config.splitLocked) return;
    e.stopPropagation();
    setIsDraggingSplit(true);
  }, [config.splitLocked]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Handle split line dragging
      if (isDraggingSplit && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const svgX = e.clientX - rect.left;
        const rackCoords = svgToRack(svgX, 0, view);

        // Clamp to rack bounds with some margin
        const maxX = rack.width / 2 - 20;
        const clampedX = Math.max(-maxX, Math.min(maxX, rackCoords.x));

        // Snap to grid if enabled
        const snappedX = snapToGrid
          ? Math.round(clampedX / gridSize) * gridSize
          : Math.round(clampedX);

        setSplitPosition(snappedX);
        return;
      }

      // Handle view panning
      if (isPanning) {
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;
        const newPan = clampPan(panStart.panX + deltaX, panStart.panY + deltaY);
        setPan(newPan.x, newPan.y);
      }
    },
    [isDraggingSplit, isPanning, panStart, view, rack.width, snapToGrid, gridSize, setSplitPosition, setPan, clampPan]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingSplit(false);
    setIsPanning(false);
  }, []);

  // Add global mouse up listener for split dragging and panning
  useEffect(() => {
    if (isDraggingSplit || isPanning) {
      const handleGlobalMouseUp = () => {
        setIsDraggingSplit(false);
        setIsPanning(false);
      };
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDraggingSplit, isPanning]);

  // Grid lines
  const gridLines = [];
  if (showGrid) {
    const numVertical = Math.ceil(rack.width / gridSize);
    const numHorizontal = Math.ceil(rack.height / gridSize);

    // Vertical lines (dotted)
    for (let i = -Math.floor(numVertical / 2); i <= Math.floor(numVertical / 2); i++) {
      const pos = rackToSvg(i * gridSize, 0, view);
      const isCenter = i === 0;
      gridLines.push(
        <line
          key={`v${i}`}
          x1={Math.round(pos.x)}
          y1={rackBounds.y}
          x2={Math.round(pos.x)}
          y2={rackBounds.y + rackBounds.height}
          stroke={isCenter ? '#6b7280' : '#4b5563'}
          strokeWidth={1}
          strokeOpacity={isCenter ? 0.8 : 0.5}
          strokeDasharray={isCenter ? 'none' : '2,4'}
          shapeRendering="crispEdges"
        />
      );
    }

    // Horizontal lines (dotted)
    for (let i = -Math.floor(numHorizontal / 2); i <= Math.floor(numHorizontal / 2); i++) {
      const pos = rackToSvg(0, i * gridSize, view);
      const isCenter = i === 0;
      gridLines.push(
        <line
          key={`h${i}`}
          x1={rackBounds.x}
          y1={Math.round(pos.y)}
          x2={rackBounds.x + rackBounds.width}
          y2={Math.round(pos.y)}
          stroke={isCenter ? '#6b7280' : '#4b5563'}
          strokeWidth={1}
          strokeOpacity={isCenter ? 0.8 : 0.5}
          strokeDasharray={isCenter ? 'none' : '2,4'}
          shapeRendering="crispEdges"
        />
      );
    }
  }

  // Center crosshair
  const center = rackToSvg(0, 0, view);

  return (
    <div
      ref={(node) => {
        // Combine refs
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        setNodeRef(node);
      }}
      data-droppable-id="rack-drop-zone"
      className={`flex-1 bg-gray-900 overflow-hidden relative ${isOver ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
    >
      <svg
        ref={svgRef}
        width={svgSize.width}
        height={svgSize.height}
        className={`w-full h-full ${isDraggingSplit ? 'cursor-ew-resize' : isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onClick={handleBackgroundClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Background - handles panning */}
        <rect
          width="100%"
          height="100%"
          fill="#111827"
          onMouseDown={handleBackgroundMouseDown}
        />

        {/* Rack ears (behind the panel) */}
        <RackEar
          side="left"
          rackBounds={rackBounds}
          earStyle={config.earStyle}
          earPosition={config.earPosition}
          hookPattern={config.toollessHookPattern || [true]}
          rackU={config.rackU}
          view={view}
        />
        <RackEar
          side="right"
          rackBounds={rackBounds}
          earStyle={config.earStyle}
          earPosition={config.earPosition}
          hookPattern={config.toollessHookPattern || [true]}
          rackU={config.rackU}
          view={view}
        />

        {/* Rack panel outline */}
        <rect
          x={rackBounds.x}
          y={rackBounds.y}
          width={rackBounds.width}
          height={rackBounds.height}
          fill="#1f2937"
          stroke={isOver ? '#3b82f6' : '#4b5563'}
          strokeWidth={isOver ? 3 : 2}
          rx={4}
        />

        {/* Trim notches for sections without hooks */}
        {config.earStyle === 'toolless' && (
          <TrimNotches
            rackBounds={rackBounds}
            hookPattern={config.toollessHookPattern || [true]}
            trimPattern={config.toollessHookTrimPattern || []}
            rackU={config.rackU}
            earThickness={config.earThickness}
            view={view}
          />
        )}

        {/* Grid lines (drawn on top of rack panel) */}
        {gridLines}

        {/* Center crosshair */}
        <line
          x1={center.x - 10}
          y1={center.y}
          x2={center.x + 10}
          y2={center.y}
          stroke="#6b7280"
          strokeWidth={1}
        />
        <line
          x1={center.x}
          y1={center.y - 10}
          x2={center.x}
          y2={center.y + 10}
          stroke="#6b7280"
          strokeWidth={1}
        />

        {/* Split line (when in split mode) */}
        {config.isSplit && (
          <g>
            {/* Exclusion zone - hatched area where devices cannot be placed */}
            <defs>
              <pattern id="splitHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="2" strokeOpacity="0.3" />
              </pattern>
            </defs>
            <rect
              x={rackToSvg(splitLineX - SPLIT_MARGIN, 0, view).x}
              y={rackBounds.y}
              width={rackSizeToSvg(SPLIT_MARGIN * 2, view)}
              height={rackBounds.height}
              fill="url(#splitHatch)"
              pointerEvents="none"
            />
            {/* Exclusion zone borders */}
            <line
              x1={rackToSvg(splitLineX - SPLIT_MARGIN, 0, view).x}
              y1={rackBounds.y}
              x2={rackToSvg(splitLineX - SPLIT_MARGIN, 0, view).x}
              y2={rackBounds.y + rackBounds.height}
              stroke="#ef4444"
              strokeWidth={1}
              strokeOpacity={0.5}
              strokeDasharray="4,4"
              pointerEvents="none"
            />
            <line
              x1={rackToSvg(splitLineX + SPLIT_MARGIN, 0, view).x}
              y1={rackBounds.y}
              x2={rackToSvg(splitLineX + SPLIT_MARGIN, 0, view).x}
              y2={rackBounds.y + rackBounds.height}
              stroke="#ef4444"
              strokeWidth={1}
              strokeOpacity={0.5}
              strokeDasharray="4,4"
              pointerEvents="none"
            />
            {/* Invisible wider hit area for dragging (only if not locked) */}
            {!config.splitLocked && (
              <line
                x1={rackToSvg(splitLineX, 0, view).x}
                y1={rackBounds.y - 20}
                x2={rackToSvg(splitLineX, 0, view).x}
                y2={rackBounds.y + rackBounds.height + 20}
                stroke="transparent"
                strokeWidth={20}
                className="cursor-ew-resize"
                onMouseDown={handleSplitMouseDown}
              />
            )}
            {/* Visible split line */}
            <line
              x1={rackToSvg(splitLineX, 0, view).x}
              y1={rackBounds.y}
              x2={rackToSvg(splitLineX, 0, view).x}
              y2={rackBounds.y + rackBounds.height}
              stroke={config.splitLocked ? '#f59e0b' : (isDraggingSplit ? '#a78bfa' : '#8b5cf6')}
              strokeWidth={isDraggingSplit ? 3 : 2}
              strokeDasharray={config.splitLocked ? 'none' : '8,4'}
              pointerEvents="none"
            />
            {/* Drag handle indicator (or lock icon when locked) */}
            <rect
              x={rackToSvg(splitLineX, 0, view).x - 6}
              y={rackBounds.y + rackBounds.height / 2 - 15}
              width={12}
              height={30}
              rx={3}
              fill={config.splitLocked ? '#f59e0b' : (isDraggingSplit ? '#a78bfa' : '#8b5cf6')}
              className={config.splitLocked ? 'cursor-default' : 'cursor-ew-resize'}
              onMouseDown={handleSplitMouseDown}
            />
            {config.splitLocked ? (
              /* Lock icon when locked */
              <g pointerEvents="none">
                <rect
                  x={rackToSvg(splitLineX, 0, view).x - 4}
                  y={rackBounds.y + rackBounds.height / 2 - 2}
                  width={8}
                  height={6}
                  fill="white"
                  rx={1}
                />
                <path
                  d={`M ${rackToSvg(splitLineX, 0, view).x - 2} ${rackBounds.y + rackBounds.height / 2 - 2}
                      v -3 a 2 2 0 0 1 4 0 v 3`}
                  fill="none"
                  stroke="white"
                  strokeWidth={1.5}
                />
              </g>
            ) : (
              /* Grip lines on handle when unlocked */
              <>
                <line
                  x1={rackToSvg(splitLineX, 0, view).x - 2}
                  y1={rackBounds.y + rackBounds.height / 2 - 8}
                  x2={rackToSvg(splitLineX, 0, view).x - 2}
                  y2={rackBounds.y + rackBounds.height / 2 + 8}
                  stroke="white"
                  strokeWidth={1}
                  pointerEvents="none"
                />
                <line
                  x1={rackToSvg(splitLineX, 0, view).x + 2}
                  y1={rackBounds.y + rackBounds.height / 2 - 8}
                  x2={rackToSvg(splitLineX, 0, view).x + 2}
                  y2={rackBounds.y + rackBounds.height / 2 + 8}
                  stroke="white"
                  strokeWidth={1}
                  pointerEvents="none"
                />
              </>
            )}
            {/* Left/Right labels */}
            <text
              x={rackToSvg(splitLineX - 40, 0, view).x}
              y={rackBounds.y - 8}
              textAnchor="middle"
              fill="#a78bfa"
              fontSize={11}
              fontWeight="bold"
            >
              LEFT
            </text>
            <text
              x={rackToSvg(splitLineX + 40, 0, view).x}
              y={rackBounds.y - 8}
              textAnchor="middle"
              fill="#a78bfa"
              fontSize={11}
              fontWeight="bold"
            >
              RIGHT
            </text>
            {/* Split position indicator */}
            <text
              x={rackToSvg(splitLineX, 0, view).x}
              y={rackBounds.y + rackBounds.height + 15}
              textAnchor="middle"
              fill="#a78bfa"
              fontSize={10}
            >
              Split: {splitLineX}mm (±{SPLIT_MARGIN}mm zone)
            </text>
          </g>
        )}

        {/* Devices */}
        {allDevices.map((device) => (
          <DeviceOnRack
            key={device.id}
            device={device}
            view={view}
            isOverlapping={overlappingDevices.has(device.id)}
          />
        ))}

        {/* Dimensions label */}
        <text
          x={rackBounds.x + rackBounds.width / 2}
          y={rackBounds.y + rackBounds.height + 20}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize={12}
        >
          {rack.width.toFixed(1)}mm x {rack.height.toFixed(1)}mm ({config.rackU}U)
        </text>

        {/* Drop hint */}
        {isOver && (
          <text
            x={rackBounds.x + rackBounds.width / 2}
            y={rackBounds.y - 10}
            textAnchor="middle"
            fill="#3b82f6"
            fontSize={14}
            fontWeight="bold"
          >
            Drop to add device
          </text>
        )}
      </svg>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-gray-800 text-gray-300 px-3 py-1 rounded text-sm">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
