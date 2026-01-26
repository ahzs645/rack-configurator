import { useState, useRef } from 'react';
import { useRackStore } from '../state/rack-store';
import type { RackConfig } from '../state/types';
import type { EarStyle, EarPosition } from '../state/types';
import { EAR_STYLE_LABELS } from '../state/types';
import { downloadScadFile, downloadConfigJson, generateScadCode, generateScadCodeForSide, downloadStl, downloadSplitStlZip } from '../utils/scad-generator';
import { downloadBundledScadFile } from '../utils/scad-bundler';
import { AdvancedSettingsModal } from './AdvancedSettingsModal';
import { RecentRacks } from './RecentRacks';
import { saveRecentRack } from '../utils/recent-racks-db';
import { initializeWorker, renderScad, setStatusCallback, isWorkerReady } from '../worker/openscad-runner';

export function RackToolbar() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [, setWorkerInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    config,
    showGrid,
    snapToGrid,
    gridSize,
    setRackU,
    setEarStyle,
    setEarPosition,
    setIsSplit,
    setSplitPosition,
    setSplitLocked,
    toggleShowGrid,
    toggleSnapToGrid,
    setGridSize,
    resetView,
    clearDevices,
    loadConfig,
  } = useRackStore();

  const handleExportScad = async () => {
    downloadScadFile(config);
    setShowExportMenu(false);
    // Save to recent racks
    try {
      await saveRecentRack(config);
    } catch (e) {
      console.error('Failed to save to recent racks:', e);
    }
  };

  const handleExportBundledScad = async () => {
    setIsExporting(true);
    setRenderStatus('Bundling components...');
    try {
      await downloadBundledScadFile(config);
      setRenderStatus('Done!');
      // Save to recent racks
      await saveRecentRack(config);
    } catch (e) {
      setRenderStatus(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
      setTimeout(() => setRenderStatus(null), 3000);
    }
  };

  const handleExportJson = async () => {
    downloadConfigJson(config);
    setShowExportMenu(false);
    // Save to recent racks
    try {
      await saveRecentRack(config);
    } catch (e) {
      console.error('Failed to save to recent racks:', e);
    }
  };

  const handleLoadConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        loadConfig(json as RackConfig);
        setRenderStatus('Config loaded!');
        setTimeout(() => setRenderStatus(null), 2000);
      } catch {
        setRenderStatus('Error: Invalid config file');
        setTimeout(() => setRenderStatus(null), 3000);
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be loaded again
    event.target.value = '';
  };

  const handleExportStl = async () => {
    if (isRendering) return;

    setShowExportMenu(false);
    setIsRendering(true);
    setRenderStatus('Initializing...');

    try {
      // Set up status callback
      setStatusCallback((status) => setRenderStatus(status));

      // Initialize worker if needed
      if (!isWorkerReady()) {
        await initializeWorker();
        setWorkerInitialized(true);
      }

      setRenderStatus('Rendering STL...');

      // Generate SCAD code
      const scadCode = generateScadCode(config, false);

      // Render to STL
      const result = await renderScad({
        scadCode,
        outputFormat: 'stl',
        variables: { '$preview': false },
      });

      if (result.success && result.output) {
        downloadStl(result.output, config);
        setRenderStatus('Done!');
        // Save to recent racks
        await saveRecentRack(config);
      } else {
        setRenderStatus(`Error: ${result.error || 'Unknown error'}`);
        console.error('Render failed:', result);
      }
    } catch (e) {
      setRenderStatus(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
      console.error('Export failed:', e);
    } finally {
      setIsRendering(false);
      // Clear status after a delay
      setTimeout(() => setRenderStatus(null), 3000);
    }
  };

  const handleExportStlSide = async (side: 'left' | 'right') => {
    if (isRendering) return;

    setShowExportMenu(false);
    setIsRendering(true);
    setRenderStatus('Initializing...');

    try {
      // Set up status callback
      setStatusCallback((status) => setRenderStatus(status));

      // Initialize worker if needed
      if (!isWorkerReady()) {
        await initializeWorker();
        setWorkerInitialized(true);
      }

      setRenderStatus(`Rendering ${side} side STL...`);

      // Generate SCAD code for specific side
      const scadCode = generateScadCodeForSide(config, side);

      // Render to STL
      const result = await renderScad({
        scadCode,
        outputFormat: 'stl',
        variables: { '$preview': false },
      });

      if (result.success && result.output) {
        downloadStl(result.output, config, side);
        setRenderStatus('Done!');
        // Save to recent racks
        await saveRecentRack(config);
      } else {
        setRenderStatus(`Error: ${result.error || 'Unknown error'}`);
        console.error('Render failed:', result);
      }
    } catch (e) {
      setRenderStatus(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
      console.error('Export failed:', e);
    } finally {
      setIsRendering(false);
      // Clear status after a delay
      setTimeout(() => setRenderStatus(null), 3000);
    }
  };

  const handleExportStlZip = async () => {
    if (isRendering) return;

    setShowExportMenu(false);
    setIsRendering(true);
    setRenderStatus('Initializing...');

    try {
      // Set up status callback
      setStatusCallback((status) => setRenderStatus(status));

      // Initialize worker if needed
      if (!isWorkerReady()) {
        await initializeWorker();
        setWorkerInitialized(true);
      }

      // Render left side
      setRenderStatus('Rendering left side STL...');
      const leftScadCode = generateScadCodeForSide(config, 'left');
      const leftResult = await renderScad({
        scadCode: leftScadCode,
        outputFormat: 'stl',
        variables: { '$preview': false },
      });

      if (!leftResult.success || !leftResult.output) {
        throw new Error(leftResult.error || 'Failed to render left side');
      }

      // Render right side
      setRenderStatus('Rendering right side STL...');
      const rightScadCode = generateScadCodeForSide(config, 'right');
      const rightResult = await renderScad({
        scadCode: rightScadCode,
        outputFormat: 'stl',
        variables: { '$preview': false },
      });

      if (!rightResult.success || !rightResult.output) {
        throw new Error(rightResult.error || 'Failed to render right side');
      }

      // Create and download ZIP
      setRenderStatus('Creating ZIP...');
      await downloadSplitStlZip(leftResult.output, rightResult.output, config);
      setRenderStatus('Done!');
      // Save to recent racks
      await saveRecentRack(config);
    } catch (e) {
      setRenderStatus(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
      console.error('Export failed:', e);
    } finally {
      setIsRendering(false);
      // Clear status after a delay
      setTimeout(() => setRenderStatus(null), 3000);
    }
  };

  const handleRecentRackLoaded = () => {
    setRenderStatus('Config loaded!');
    setTimeout(() => setRenderStatus(null), 2000);
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-4 flex-wrap relative">
      {/* Rack Size */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-300">Size:</label>
        <select
          value={config.rackU}
          onChange={(e) => setRackU(Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-500"
        >
          <option value={1}>1U</option>
          <option value={2}>2U</option>
          <option value={3}>3U</option>
          <option value={4}>4U</option>
          <option value={5}>5U</option>
          <option value={6}>6U</option>
        </select>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Ear Style */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-300">Ears:</label>
        <select
          value={config.earStyle}
          onChange={(e) => setEarStyle(e.target.value as EarStyle)}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-500"
        >
          {Object.entries(EAR_STYLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Ear Position */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-300">Position:</label>
        <select
          value={config.earPosition}
          onChange={(e) => setEarPosition(e.target.value as EarPosition)}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-500"
        >
          <option value="bottom">Bottom</option>
          <option value="top">Top</option>
          <option value="center">Center</option>
        </select>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Split Panel Toggle */}
      <button
        onClick={() => setIsSplit(!config.isSplit)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors ${
          config.isSplit
            ? 'bg-purple-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        title="Toggle split panel mode"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" />
        </svg>
        Split
      </button>

      {config.isSplit && (
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-400">at:</label>
          <input
            type="number"
            value={config.splitPosition}
            onChange={(e) => setSplitPosition(Number(e.target.value))}
            placeholder="auto"
            disabled={config.splitLocked}
            className={`w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 ${
              config.splitLocked ? 'opacity-50' : ''
            }`}
          />
          <span className="text-xs text-gray-500">mm</span>
          {/* Lock button */}
          <button
            onClick={() => setSplitLocked(!config.splitLocked)}
            className={`p-1 rounded transition-colors ${
              config.splitLocked
                ? 'bg-amber-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            title={config.splitLocked ? 'Unlock split position' : 'Lock split position'}
          >
            {config.splitLocked ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Advanced Settings */}
      <button
        onClick={() => setShowAdvanced(true)}
        className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
        title="Advanced settings"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Advanced
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Show Grid */}
      <button
        onClick={toggleShowGrid}
        className={`p-1.5 rounded transition-colors ${
          showGrid
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        title="Show grid"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 10h16M4 15h16M10 4v16M15 4v16" />
        </svg>
      </button>

      {/* Grid Size - only show when grid is visible */}
      {showGrid && (
        <select
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-500"
          title="Grid size"
        >
          <option value={1}>1mm</option>
          <option value={5}>5mm</option>
          <option value={10}>10mm</option>
          <option value={20}>20mm</option>
        </select>
      )}

      {/* Snap to Grid */}
      <button
        onClick={toggleSnapToGrid}
        className={`p-1.5 rounded transition-colors ${
          snapToGrid
            ? 'bg-green-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
        title="Snap to grid"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View controls */}
      <button
        onClick={resetView}
        className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
        title="Reset view"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>

      {/* Clear devices */}
      <button
        onClick={clearDevices}
        className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
        title="Clear all devices"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Recent Racks */}
      <RecentRacks onLoad={handleRecentRackLoaded} />

      {/* Load Config */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleLoadConfig}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors flex items-center gap-1"
        title="Load configuration file"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
        </svg>
        Open
      </button>

      {/* Export */}
      <div className="relative">
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          disabled={isExporting || isRendering}
          className={`px-3 py-1 text-white text-sm rounded transition-colors flex items-center gap-1 ${
            isExporting || isRendering
              ? 'bg-gray-600 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          {isExporting || isRendering ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {isRendering ? 'Rendering...' : 'Exporting...'}
            </>
          ) : (
            <>
              Export
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        {showExportMenu && (
          <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg py-1 min-w-[220px] z-50">
            {config.isSplit ? (
              <>
                <button
                  onClick={handleExportStlZip}
                  disabled={isRendering}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex flex-col"
                >
                  <span className="font-medium text-white">STL - Both Sides (ZIP)</span>
                  <span className="text-xs text-gray-500">Separate STL files in a ZIP archive</span>
                </button>
                <button
                  onClick={handleExportStl}
                  disabled={isRendering}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex flex-col"
                >
                  <span className="font-medium text-white">STL - Both Sides (Single File)</span>
                  <span className="text-xs text-gray-500">Both halves in one STL</span>
                </button>
                <button
                  onClick={() => handleExportStlSide('left')}
                  disabled={isRendering}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex flex-col"
                >
                  <span className="font-medium text-white">STL - Left Side Only</span>
                  <span className="text-xs text-gray-500">Print-ready left half ({config.leftDevices.length} devices)</span>
                </button>
                <button
                  onClick={() => handleExportStlSide('right')}
                  disabled={isRendering}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex flex-col"
                >
                  <span className="font-medium text-white">STL - Right Side Only</span>
                  <span className="text-xs text-gray-500">Print-ready right half ({config.rightDevices.length} devices)</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleExportStl}
                disabled={isRendering}
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex flex-col"
              >
                <span className="font-medium text-white">STL (3D Print Ready)</span>
                <span className="text-xs text-gray-500">Renders via WebAssembly</span>
              </button>
            )}
            <div className="border-t border-gray-700 my-1" />
            <button
              onClick={handleExportScad}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex flex-col"
            >
              <span className="font-medium text-white">SCAD (requires components)</span>
              <span className="text-xs text-gray-500">Needs components/ folder</span>
            </button>
            <button
              onClick={handleExportBundledScad}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex flex-col"
            >
              <span className="font-medium text-white">SCAD (self-contained)</span>
              <span className="text-xs text-gray-500">All code inlined - works anywhere</span>
            </button>
            <div className="border-t border-gray-700 my-1" />
            <button
              onClick={handleExportJson}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex flex-col"
            >
              <span className="font-medium text-white">Save Config (JSON)</span>
              <span className="text-xs text-gray-500">Re-import later to edit</span>
            </button>
          </div>
        )}
      </div>

      {/* Close export menu when clicking outside */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowExportMenu(false)}
        />
      )}

      {/* Render status */}
      {renderStatus && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-3 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-gray-300 whitespace-nowrap">
          {renderStatus}
        </div>
      )}

      {/* Advanced Settings Modal */}
      {showAdvanced && (
        <AdvancedSettingsModal onClose={() => setShowAdvanced(false)} />
      )}
    </div>
  );
}
