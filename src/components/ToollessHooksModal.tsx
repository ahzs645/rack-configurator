import { useRackStore } from '../state/rack-store';
import { TOOLLESS_HOOK_SPACING, getToollessHookCount } from '../state/types';

interface ToollessHooksModalProps {
  onClose: () => void;
}

export function ToollessHooksModal({ onClose }: ToollessHooksModalProps) {
  const { config, toggleToollessHook, setToollessHookPattern, toggleToollessHookTrim, setToollessHookTrimPattern } = useRackStore();

  const hookCount = getToollessHookCount(config.rackU);
  const hookPattern = config.toollessHookPattern || Array(hookCount).fill(true);
  const trimPattern = config.toollessHookTrimPattern || Array(hookCount).fill(false);
  const enabledCount = hookPattern.filter(h => h).length;
  const trimmedCount = trimPattern.filter((t, i) => t && !hookPattern[i]).length;

  const handleEnableAll = () => {
    setToollessHookPattern(Array(hookCount).fill(true));
    // Clear all trim settings when enabling all hooks
    setToollessHookTrimPattern(Array(hookCount).fill(false));
  };

  const handleDisableAll = () => {
    // Keep at least the first hook enabled
    const pattern = Array(hookCount).fill(false);
    pattern[0] = true;
    setToollessHookPattern(pattern);
  };

  const handleClearTrims = () => {
    setToollessHookTrimPattern(Array(hookCount).fill(false));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[400px] max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Toolless Hook Pattern</h2>
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
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-400">
            Select which hook positions to include. Hooks repeat every {TOOLLESS_HOOK_SPACING}mm from the bottom of the panel.
          </p>

          {/* Quick actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleEnableAll}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              Enable All
            </button>
            <button
              onClick={handleDisableAll}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              Disable All
            </button>
            {trimmedCount > 0 && (
              <button
                onClick={handleClearTrims}
                className="px-3 py-1 text-xs bg-amber-700 hover:bg-amber-600 text-white rounded transition-colors"
              >
                Clear Trims
              </button>
            )}
          </div>

          {/* Hook list */}
          <div className="space-y-2">
            {Array.from({ length: hookCount }).map((_, i) => {
              const isEnabled = hookPattern[i] ?? true;
              const isTrimmed = !isEnabled && (trimPattern[i] ?? false);
              const positionMm = Math.round(i * TOOLLESS_HOOK_SPACING * 10) / 10;
              const isOnlyEnabled = enabledCount === 1 && isEnabled;

              return (
                <div
                  key={i}
                  className={`p-3 rounded transition-colors ${
                    isEnabled ? 'bg-gray-700' : 'bg-gray-800'
                  } ${isOnlyEnabled ? 'opacity-75' : ''}`}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleToollessHook(i)}
                      disabled={isOnlyEnabled}
                      className="w-4 h-4 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-white font-medium">Hook {i + 1}</span>
                      <span className="text-xs text-gray-400 ml-2">at {positionMm}mm from bottom</span>
                    </div>
                    {isOnlyEnabled && (
                      <span className="text-xs text-amber-400">Required</span>
                    )}
                  </label>

                  {/* Trim section option - only visible when hook is disabled */}
                  {!isEnabled && (
                    <label className="flex items-center gap-3 mt-2 ml-7 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isTrimmed}
                        onChange={() => toggleToollessHookTrim(i)}
                        className="w-3.5 h-3.5 rounded bg-gray-600 border-gray-500 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-800"
                      />
                      <span className="text-xs text-gray-400">
                        Trim section <span className="text-amber-400">(-2.9mm each side)</span>
                      </span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              {enabledCount} of {hookCount} hooks enabled
              {trimmedCount > 0 && (
                <span className="text-amber-400 ml-2">
                  ({trimmedCount} section{trimmedCount > 1 ? 's' : ''} trimmed)
                </span>
              )}
            </p>
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
