import { useState, useRef } from 'react';
import { useRackStore } from '../state/rack-store';
import type { EarStyle, EarPosition, RackConfig } from '../state/types';
import { EAR_STYLE_LABELS, getToollessHookCount } from '../state/types';
import { ToollessHooksModal } from './ToollessHooksModal';
import { AdvancedSettingsModal } from './AdvancedSettingsModal';
import { downloadScadFile, downloadConfigJson, generateScadCode, generateScadCodeForSide, downloadStl, downloadSplitStlZip } from '../utils/scad-generator';
import { downloadBundledScadFile } from '../utils/scad-bundler';
import { saveRecentRack } from '../utils/recent-racks-db';
import { initializeWorker, renderScad, setStatusCallback, isWorkerReady } from '../worker/openscad-runner';
import { generateShareUrl } from '../utils/url-sharing';
import { parseConfigJson } from '../utils/scad-generator';

export function MobileSettingsPanel() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHooksModal, setShowHooksModal] = useState(false);
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

  const handleShare = async () => {
    try {
      const url = await generateShareUrl(config);
      await navigator.clipboard.writeText(url);
      setRenderStatus('Share link copied!');
    } catch (e) {
      console.error('Failed to generate share URL:', e);
      setRenderStatus('Error: Failed to generate share link');
    }
    setTimeout(() => setRenderStatus(null), 3000);
  };

  const handleExportScad = async () => {
    downloadScadFile(config);
    try { await saveRecentRack(config); } catch (e) { console.error(e); }
  };

  const handleExportBundledScad = async () => {
    setIsExporting(true);
    setRenderStatus('Bundling...');
    try {
      await downloadBundledScadFile(config);
      setRenderStatus('Done!');
      await saveRecentRack(config);
    } catch (e) {
      setRenderStatus(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setRenderStatus(null), 3000);
    }
  };

  const handleExportJson = async () => {
    downloadConfigJson(config);
    try { await saveRecentRack(config); } catch (e) { console.error(e); }
  };

  const handleExportStl = async () => {
    if (isRendering) return;
    setIsRendering(true);
    setRenderStatus('Initializing...');
    try {
      setStatusCallback((status) => setRenderStatus(status));
      if (!isWorkerReady()) {
        await initializeWorker();
        setWorkerInitialized(true);
      }
      setRenderStatus('Rendering STL...');
      const scadCode = generateScadCode(config, false);
      const result = await renderScad({ scadCode, outputFormat: 'stl', variables: { '$preview': false } });
      if (result.success && result.output) {
        downloadStl(result.output, config);
        setRenderStatus('Done!');
        await saveRecentRack(config);
      } else {
        setRenderStatus(`Error: ${result.error || 'Unknown'}`);
      }
    } catch (e) {
      setRenderStatus(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setIsRendering(false);
      setTimeout(() => setRenderStatus(null), 3000);
    }
  };

  const handleExportStlSide = async (side: 'left' | 'right') => {
    if (isRendering) return;
    setIsRendering(true);
    setRenderStatus('Initializing...');
    try {
      setStatusCallback((status) => setRenderStatus(status));
      if (!isWorkerReady()) {
        await initializeWorker();
        setWorkerInitialized(true);
      }
      setRenderStatus(`Rendering ${side} side...`);
      const scadCode = generateScadCodeForSide(config, side);
      const result = await renderScad({ scadCode, outputFormat: 'stl', variables: { '$preview': false } });
      if (result.success && result.output) {
        downloadStl(result.output, config, side);
        setRenderStatus('Done!');
        await saveRecentRack(config);
      } else {
        setRenderStatus(`Error: ${result.error || 'Unknown'}`);
      }
    } catch (e) {
      setRenderStatus(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setIsRendering(false);
      setTimeout(() => setRenderStatus(null), 3000);
    }
  };

  const handleExportStlZip = async () => {
    if (isRendering) return;
    setIsRendering(true);
    setRenderStatus('Initializing...');
    try {
      setStatusCallback((status) => setRenderStatus(status));
      if (!isWorkerReady()) {
        await initializeWorker();
        setWorkerInitialized(true);
      }
      setRenderStatus('Rendering left side...');
      const leftResult = await renderScad({ scadCode: generateScadCodeForSide(config, 'left'), outputFormat: 'stl', variables: { '$preview': false } });
      if (!leftResult.success || !leftResult.output) throw new Error(leftResult.error || 'Failed left');
      setRenderStatus('Rendering right side...');
      const rightResult = await renderScad({ scadCode: generateScadCodeForSide(config, 'right'), outputFormat: 'stl', variables: { '$preview': false } });
      if (!rightResult.success || !rightResult.output) throw new Error(rightResult.error || 'Failed right');
      setRenderStatus('Creating ZIP...');
      await downloadSplitStlZip(leftResult.output, rightResult.output, config);
      setRenderStatus('Done!');
      await saveRecentRack(config);
    } catch (e) {
      setRenderStatus(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setIsRendering(false);
      setTimeout(() => setRenderStatus(null), 3000);
    }
  };

  const handleLoadConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parseConfigJson(content);
        if (parsed) {
          loadConfig(parsed as RackConfig);
          setRenderStatus('Config loaded!');
        } else {
          setRenderStatus('Error: Invalid config');
        }
      } catch {
        setRenderStatus('Error: Invalid config file');
      }
      setTimeout(() => setRenderStatus(null), 3000);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="p-4 space-y-6">
      {/* Status toast */}
      {renderStatus && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 text-center">
          {renderStatus}
        </div>
      )}

      {/* Rack Configuration */}
      <section>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Rack Configuration</h3>
        <div className="space-y-3">
          {/* Rack Size */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">Rack Size</label>
            <select
              value={config.rackU}
              onChange={(e) => setRackU(Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value={1}>1U</option>
              <option value={2}>2U</option>
              <option value={3}>3U</option>
              <option value={4}>4U</option>
              <option value={5}>5U</option>
              <option value={6}>6U</option>
            </select>
          </div>

          {/* Ear Style */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">Ear Style</label>
            <select
              value={config.earStyle}
              onChange={(e) => setEarStyle(e.target.value as EarStyle)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              {Object.entries(EAR_STYLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Ear Position or Hook config */}
          {config.earStyle === 'toolless' ? (
            <button
              onClick={() => setShowHooksModal(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
            >
              <span>Hook Pattern</span>
              <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">
                {(config.toollessHookPattern || []).filter(h => h).length}/{getToollessHookCount(config.rackU)}
              </span>
            </button>
          ) : config.earStyle !== 'none' ? (
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Ear Position</label>
              <select
                value={config.earPosition}
                onChange={(e) => setEarPosition(e.target.value as EarPosition)}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="bottom">Bottom</option>
                <option value="top">Top</option>
                <option value="center">Center</option>
              </select>
            </div>
          ) : null}

          {/* Split Panel */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">Split Panel</label>
            <button
              onClick={() => setIsSplit(!config.isSplit)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.isSplit ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.isSplit ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {config.isSplit && (
            <div className="flex items-center gap-2 pl-2 border-l-2 border-purple-600">
              <label className="text-xs text-gray-400">Position:</label>
              <input
                type="number"
                value={config.splitPosition}
                onChange={(e) => setSplitPosition(Number(e.target.value))}
                disabled={config.splitLocked}
                className={`flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 ${
                  config.splitLocked ? 'opacity-50' : ''
                }`}
              />
              <span className="text-xs text-gray-500">mm</span>
              <button
                onClick={() => setSplitLocked(!config.splitLocked)}
                className={`p-1.5 rounded-lg transition-colors ${
                  config.splitLocked ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {config.splitLocked ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Editor Options */}
      <section>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Editor Options</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">Show Grid</label>
            <button
              onClick={toggleShowGrid}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showGrid ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showGrid ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {showGrid && (
            <div className="flex items-center justify-between pl-2 border-l-2 border-blue-600">
              <label className="text-sm text-gray-400">Grid Size</label>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value={1}>1mm</option>
                <option value={5}>5mm</option>
                <option value={10}>10mm</option>
                <option value={20}>20mm</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">Snap to Grid</label>
            <button
              onClick={toggleSnapToGrid}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                snapToGrid ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${snapToGrid ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetView}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Reset View
            </button>
            <button
              onClick={clearDevices}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-red-400 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          </div>

          {/* Advanced Settings */}
          <button
            onClick={() => setShowAdvanced(true)}
            className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Advanced Settings
          </button>
        </div>
      </section>

      {/* File Operations */}
      <section>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">File Operations</h3>
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleLoadConfig}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            Open Config File
          </button>

          <button
            onClick={handleShare}
            className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Link
          </button>
        </div>
      </section>

      {/* Export Options */}
      <section>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Export</h3>
        <div className="space-y-2">
          {config.isSplit ? (
            <>
              <button
                onClick={handleExportStlZip}
                disabled={isRendering}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-wait text-white text-sm rounded-lg transition-colors"
              >
                {isRendering ? 'Rendering...' : 'STL - Both Sides (ZIP)'}
              </button>
              <button
                onClick={handleExportStl}
                disabled={isRendering}
                className="w-full py-2.5 bg-blue-600/80 hover:bg-blue-500 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                STL - Both Sides (Single)
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportStlSide('left')}
                  disabled={isRendering}
                  className="flex-1 py-2.5 bg-blue-600/60 hover:bg-blue-500 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  STL Left
                </button>
                <button
                  onClick={() => handleExportStlSide('right')}
                  disabled={isRendering}
                  className="flex-1 py-2.5 bg-blue-600/60 hover:bg-blue-500 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  STL Right
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleExportStl}
              disabled={isRendering}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-wait text-white text-sm rounded-lg transition-colors"
            >
              {isRendering ? 'Rendering...' : 'STL (3D Print Ready)'}
            </button>
          )}

          <button
            onClick={handleExportScad}
            className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
          >
            SCAD (requires components)
          </button>
          <button
            onClick={handleExportBundledScad}
            disabled={isExporting}
            className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
          >
            {isExporting ? 'Bundling...' : 'SCAD (self-contained)'}
          </button>
          <button
            onClick={handleExportJson}
            className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
          >
            Save Config (JSON)
          </button>
        </div>
      </section>

      {/* Modals */}
      {showAdvanced && <AdvancedSettingsModal onClose={() => setShowAdvanced(false)} />}
      {showHooksModal && <ToollessHooksModal onClose={() => setShowHooksModal(false)} />}
    </div>
  );
}
