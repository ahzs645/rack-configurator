import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRackStore } from '../state/rack-store';
import type { RackConfig } from '../state/types';
import { activeDevices, fitTo2U, getMountEnvelope, getSplitMargin, validateLayout } from '../utils/layout-fit';
import type { FitResult } from '../utils/layout-fit';
import { getPlacedDeviceDimensions } from '../utils/device-geometry';

function ProposalDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return createPortal(<dialog ref={ref} autoFocus tabIndex={-1} aria-labelledby="fit-title" onCancel={onClose}
    className="m-auto bg-gray-800 border border-gray-600 rounded-xl p-5 w-[calc(100%_-_2rem)] max-w-3xl max-h-[90vh] overflow-auto text-white backdrop:bg-black/70">
    {children}
  </dialog>, document.body);
}

function LayoutPreview({ config }: { config: RackConfig }) {
  const height = config.rackU * 44.45;
  return <svg role="img" aria-label="Proposed 2U layout" viewBox={`-6 -6 ${config.panelWidth + 12} ${height + 12}`} className="w-full my-4 bg-gray-950 rounded-lg">
    <rect width={config.panelWidth} height={height} fill="#1f2937" stroke="#9ca3af" />
    {config.isSplit && <rect x={config.panelWidth / 2 + config.splitPosition - getSplitMargin(config)} width={getSplitMargin(config) * 2} height={height} fill="#f59e0b" opacity="0.3" />}
    {activeDevices(config).map(d => {
      const e = getMountEnvelope(d, config), dims = getPlacedDeviceDimensions(d);
      const x = config.panelWidth / 2 + d.offsetX, y = height / 2 - d.offsetY;
      return <g key={d.id}>
        <title>{dims.name}: {dims.width} × {dims.height} mm{d.orientation === 'side' ? ', on its side' : ''}</title>
        <rect x={x - e.width / 2} y={y - e.height / 2} width={e.width} height={e.height} fill="#0f766e" stroke="#5eead4" strokeWidth="0.4" />
        <rect x={x - dims.width / 2} y={y - dims.height / 2} width={dims.width} height={dims.height} fill="#111827" />
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(5, dims.width / 7)} fill="white">{dims.name.length > 22 ? dims.name.slice(0, 21) + '…' : dims.name}</text>
      </g>;
    })}
  </svg>;
}

export function FitPanel() {
  const { config, selectDevice, fitUndo, applyFittedLayout, undoFittedLayout } = useRackStore();
  const [options, setOptions] = useState({ allowRotation: true, allowCompact: true, allowShared: true });
  const [proposal, setProposal] = useState<{ source: RackConfig; result: FitResult } | null>(null);
  const issues = validateLayout(config);
  const errors = issues.filter(i => i.severity === 'error');
  const visible = proposal?.source === config ? proposal.result : null;
  const candidate = visible?.config;
  const count = activeDevices(config).length;
  return <section className="p-3 border-b border-gray-700 space-y-2" aria-label="Layout fit">
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-medium text-teal-300">Layout fit · {config.rackU}U</h3>
      <span className={`text-xs ${errors.length ? 'text-red-300' : issues.length ? 'text-amber-300' : 'text-teal-300'}`} role="status">
        {!count ? 'No devices' : errors.length ? `${errors.length} conflicts` : issues.length ? 'Manual checks needed' : 'Geometry fits'}
      </span>
    </div>
    {issues.length > 0 && <details className="text-xs" open={errors.length > 0}>
      <summary className="cursor-pointer text-gray-300">Fit details ({issues.length})</summary>
      <ul className="max-h-32 overflow-y-auto mt-2 space-y-1">{issues.map((issue, i) => <li key={i}>
        <button className={`text-left ${issue.severity === 'error' ? 'text-red-300' : 'text-amber-300'}`} onClick={() => selectDevice(issue.deviceIds[0] ?? null)}>{issue.message}</button>
      </li>)}</ul>
    </details>}
    <details className="text-xs text-gray-300">
      <summary className="cursor-pointer">Fitting options</summary>
      <div className="space-y-2 mt-2">{([
        ['allowRotation', 'Allow devices on their side'], ['allowCompact', 'Allow compact cages'], ['allowShared', 'Allow shared dividers'],
      ] as const).map(([key, label]) => <label key={key} className="flex gap-2"><input type="checkbox" checked={options[key]} onChange={e => { setOptions({ ...options, [key]: e.target.checked }); setProposal(null); }} />{label}</label>)}</div>
      <p className="mt-2 text-gray-400">Keeps every device on its current side. Honors the split lock. Uses at least 1 mm panel-edge clearance.</p>
    </details>
    <button disabled={!count} onClick={() => setProposal({ source: config, result: fitTo2U(config, options) })} className="w-full py-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 rounded text-sm text-white font-medium">Fit to 2U</button>
    {visible && !candidate && <p role="status" className="text-xs text-amber-300">{visible.message}</p>}
    {fitUndo?.after === config && <button className="text-xs text-gray-300 underline" onClick={undoFittedLayout}>Undo fitted layout</button>}
    <p className="text-xs text-gray-400">Fit checks cover mount geometry. Allow room for cables and airflow, and confirm your measured device dimensions.</p>
    {candidate && <ProposalDialog onClose={() => setProposal(null)}>
        <h2 id="fit-title" className="text-xl font-semibold">Your proposed 2U layout</h2>
        <p className="text-sm text-teal-300 mt-1">{visible.message}</p>
        <LayoutPreview config={candidate} />
        <ul className="text-sm space-y-1 list-disc pl-5">{visible.changes.map((change, i) => <li key={i}>{change}</li>)}</ul>
        <div className="overflow-x-auto mt-4"><table className="w-full text-xs text-left"><thead className="text-gray-400"><tr><th className="py-2">Device</th><th>Front W × H</th><th>Mount W × H</th><th>Depth</th></tr></thead>
          <tbody>{activeDevices(candidate).map(d => { const dims = getPlacedDeviceDimensions(d), e = getMountEnvelope(d, candidate); return <tr key={d.id} className="border-t border-gray-700"><td className="py-2">{dims.name}</td><td>{dims.width} × {dims.height}</td><td>{e.width.toFixed(1)} × {e.height.toFixed(1)}</td><td>{dims.depth} mm</td></tr>; })}</tbody></table></div>
        <p className="mt-3 text-sm text-amber-200">Shared dividers print as one support with the faceplate. Check the 3D model and cable access before printing; this verifies dimensions, not load capacity or cooling.</p>
        <div className="flex justify-end gap-3 mt-5">
          <button className="px-4 py-2 bg-gray-700 rounded" onClick={() => setProposal(null)}>Cancel</button>
          <button className="px-4 py-2 bg-teal-700 hover:bg-teal-600 rounded" onClick={() => { applyFittedLayout(candidate); setProposal(null); }}>Apply 2U layout</button>
        </div>
    </ProposalDialog>}
  </section>;
}
