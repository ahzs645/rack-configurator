import { Component, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';

const Viewer = lazy(() => import('./MainViewer3D').then(module => ({ default: module.MainViewer3D })));

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="flex-1 flex items-center justify-center p-6 text-gray-300">
      <div className="max-w-sm space-y-3">
        <p>The 3D preview couldn’t start. You can continue editing in 2D.</p>
        <button className="bg-blue-600 text-white rounded-lg px-4 py-3" onClick={() => window.location.reload()}>Reload app</button>
      </div>
    </div>;
    return this.props.children;
  }
}

export function RackPreview3D() {
  return <PreviewBoundary>
    <Suspense fallback={<div role="status" className="flex-1 flex items-center justify-center text-gray-300">Loading 3D viewer…</div>}>
      <Viewer />
    </Suspense>
  </PreviewBoundary>;
}
