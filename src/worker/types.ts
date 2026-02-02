// Types for JSCAD Worker communication

import type { RackConfig } from '../state/types';

export interface JscadInvocation {
  // The rack configuration to render
  config: RackConfig;
  // Output format
  outputFormat: 'stl';
}

export interface JscadResult {
  success: boolean;
  // The output file (STL binary)
  output?: ArrayBuffer;
  // Error message if failed
  error?: string;
  // Render time in ms
  renderTime?: number;
}

export interface WorkerMessage {
  type: 'invoke' | 'init' | 'cancel';
  id: string;
  payload?: JscadInvocation;
}

export interface WorkerResponse {
  type: 'ready' | 'progress' | 'result' | 'error';
  id?: string;
  payload?: JscadResult | string;
}

// Legacy aliases for compatibility
export type OpenSCADInvocation = JscadInvocation;
export type OpenSCADResult = JscadResult;
