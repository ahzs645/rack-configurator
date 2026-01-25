import { useRackStore } from '../state/rack-store';
import type { VentType, RenderMode, BackStyle } from '../state/types';
import { RENDER_MODE_LABELS, BACK_STYLE_LABELS } from '../state/types';

interface AdvancedSettingsModalProps {
  onClose: () => void;
}

export function AdvancedSettingsModal({ onClose }: AdvancedSettingsModalProps) {
  const {
    config,
    setPlateThickness,
    setCornerRadius,
    setClearance,
    setEarThickness,
    setVentType,
    setHexDiameter,
    setHexWall,
    setCutoutEdge,
    setCutoutRadius,
    setHeavyDevice,
    setBackStyle,
    setShowPreview,
    setShowLabels,
    setRenderMode,
  } = useRackStore();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Advanced Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Plate Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Plate Settings</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Thickness (mm)</label>
                <input
                  type="number"
                  value={config.plateThickness}
                  onChange={(e) => setPlateThickness(Number(e.target.value))}
                  min={2}
                  max={10}
                  step={0.5}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Corner Radius (mm)</label>
                <input
                  type="number"
                  value={config.cornerRadius}
                  onChange={(e) => setCornerRadius(Number(e.target.value))}
                  min={0}
                  max={10}
                  step={1}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ear Thickness (mm)</label>
                <input
                  type="number"
                  value={config.earThickness}
                  onChange={(e) => setEarThickness(Number(e.target.value))}
                  min={1}
                  max={5}
                  step={0.1}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Device Clearance (mm)</label>
                <input
                  type="number"
                  value={config.clearance}
                  onChange={(e) => setClearance(Number(e.target.value))}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Ventilation Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Ventilation</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Vent Type</label>
                <select
                  value={config.ventType}
                  onChange={(e) => setVentType(e.target.value as VentType)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="honeycomb">Honeycomb</option>
                  <option value="rectangular">Rectangular Slots</option>
                </select>
              </div>

              {config.ventType === 'honeycomb' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Hex Diameter (mm)</label>
                    <input
                      type="number"
                      value={config.hexDiameter}
                      onChange={(e) => setHexDiameter(Number(e.target.value))}
                      min={4}
                      max={15}
                      step={1}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Hex Wall (mm)</label>
                    <input
                      type="number"
                      value={config.hexWall}
                      onChange={(e) => setHexWall(Number(e.target.value))}
                      min={1}
                      max={5}
                      step={0.5}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Cutout Edge (mm)</label>
                    <input
                      type="number"
                      value={config.cutoutEdge}
                      onChange={(e) => setCutoutEdge(Number(e.target.value))}
                      min={2}
                      max={15}
                      step={1}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Edge margin (smaller = larger holes)</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Cutout Radius (mm)</label>
                    <input
                      type="number"
                      value={config.cutoutRadius}
                      onChange={(e) => setCutoutRadius(Number(e.target.value))}
                      min={2}
                      max={15}
                      step={1}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Corner radius of slots</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Back Panel Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Back Panel</h3>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Default Back Style</label>
              <select
                value={config.backStyle}
                onChange={(e) => setBackStyle(e.target.value as BackStyle)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {Object.entries(BACK_STYLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Default back style for device cages. Can be overridden per-device.</p>
            </div>
          </div>

          {/* Support Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Support</h3>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Heavy Device Support</label>
              <select
                value={config.heavyDevice}
                onChange={(e) => setHeavyDevice(Number(e.target.value) as 0 | 1 | 2)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={0}>None (Standard)</option>
                <option value={1}>Level 1 (Extra bracing)</option>
                <option value={2}>Level 2 (Maximum support)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Adds extra support structures for heavier devices</p>
            </div>
          </div>

          {/* Render Mode (for split panels) */}
          {config.isSplit && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">Export Mode</h3>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Render Mode</label>
                <select
                  value={config.renderMode}
                  onChange={(e) => setRenderMode(e.target.value as RenderMode)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(RENDER_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Choose which parts to export when using split mode</p>
              </div>
            </div>
          )}

          {/* Preview Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">OpenSCAD Preview</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showPreview}
                  onChange={(e) => setShowPreview(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                />
                <span className="text-sm text-gray-300">Show device preview boxes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                />
                <span className="text-sm text-gray-300">Show device labels</span>
              </label>
              <p className="text-xs text-gray-500">These options affect OpenSCAD output only</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
