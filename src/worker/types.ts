// Types for OpenSCAD Worker communication

export interface OpenSCADInvocation {
  // The SCAD code to render
  scadCode: string;
  // Output format: 'stl' | 'off' | 'glb'
  outputFormat: 'stl' | 'off';
  // Variables to pass to OpenSCAD (e.g., { '$preview': true })
  variables?: Record<string, unknown>;
  // Features to enable
  features?: string[];
}

export interface OpenSCADResult {
  success: boolean;
  // The output file (STL binary or error text)
  output?: ArrayBuffer;
  // Error message if failed
  error?: string;
  // Stdout from OpenSCAD
  stdout?: string;
  // Stderr from OpenSCAD
  stderr?: string;
  // Render time in ms
  renderTime?: number;
}

export interface WorkerMessage {
  type: 'invoke' | 'init' | 'cancel';
  id: string;
  payload?: OpenSCADInvocation;
}

export interface WorkerResponse {
  type: 'ready' | 'progress' | 'result' | 'error';
  id?: string;
  payload?: OpenSCADResult | string;
}
