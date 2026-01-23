import { useRef, useState, useCallback, useEffect } from 'react';
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

const PADDING = 40;

// Split line exclusion zone - devices must not overlap with this margin
// The joiner wall is 4mm thick, so we use 6mm margin on each side for safety
const SPLIT_MARGIN = 6; // mm on each side of split line

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
    zoom,
    panX,
    panY,
    padding: PADDING,
  };

  // Get rack bounds in SVG coords
  const rackBounds = getRackBoundsSvg(view);
  const rack = getRackDimensions(config.rackU);

  // Calculate pan limits based on rack size and viewport
  const getPanLimits = useCallback(() => {
    // Allow panning up to half the viewport size beyond the rack
    const maxPanX = svgSize.width * 0.4;
    const maxPanY = svgSize.height * 0.4;
    return { maxPanX, maxPanY };
  }, [svgSize.width, svgSize.height]);

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
    const deviceLeft = device.offsetX - dims.width / 2;
    const deviceRight = device.offsetX + dims.width / 2;
    const splitLeft = splitLineX - SPLIT_MARGIN;
    const splitRight = splitLineX + SPLIT_MARGIN;

    // Check if device bounds overlap with split exclusion zone
    return deviceRight > splitLeft && deviceLeft < splitRight;
  };

  // Check for overlapping devices and devices that cross the split zone
  const getOverlappingDevices = () => {
    const overlapping = new Set<string>();

    for (let i = 0; i < allDevices.length; i++) {
      const d1 = allDevices[i];
      const dims1 = getPlacedDeviceDimensions(d1);

      // Check if device overlaps with split exclusion zone
      if (deviceOverlapsSplitZone(d1)) {
        overlapping.add(d1.id);
      }

      for (let j = i + 1; j < allDevices.length; j++) {
        const d2 = allDevices[j];
        const dims2 = getPlacedDeviceDimensions(d2);

        if (
          devicesOverlap(
            d1.offsetX,
            d1.offsetY,
            dims1.width,
            dims1.height,
            d2.offsetX,
            d2.offsetY,
            dims2.width,
            dims2.height
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
