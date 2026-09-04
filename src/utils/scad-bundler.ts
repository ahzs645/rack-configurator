import type { RackConfig } from '../state/types';
import { generateScadCode, generateFilename } from './scad-generator';

let componentCache: Map<string, string> | null = null;
export function clearComponentCache(): void { componentCache = null; }

/** Resolve every SCAD dependency, including nested modules and rack_mounts.
 * Share the main serializer so orientation, compact cages and split settings
 * match both the live model and exported files.
 */
export async function generateBundledScadCode(config: RackConfig): Promise<string> {
  const cache = componentCache ?? new Map<string, string>();
  const visited = new Set<string>();
  const parts: string[] = [];
  const constants = new Set<string>();
  async function visit(path: string): Promise<void> {
    if (visited.has(path)) return;
    visited.add(path);
    let source = cache.get(path);
    if (source === undefined) {
      const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
      if (!response.ok) throw new Error(`Unable to load SCAD component ${path}: ${response.status}`);
      source = await response.text(); cache.set(path, source);
    }
    const imports = /^\s*(?:use|include)\s+<([^>]+)>\s*;?\s*$/gm;
    for (const match of source.matchAll(imports)) {
      const resolved = new URL(match[1], `https://scad.local/${path}`).pathname.slice(1);
      await visit(resolved);
    }
    const inlined = source.replace(imports, '// dependency inlined')
      .replace(/^\$fn\s*=.*;.*$/gm, '// resolution set by the generated configuration')
      .replace(/^([A-Z_][A-Z_0-9]*\s*=\s*[^;\n]+;)(.*)$/gm, (line, declaration: string) => {
        if (constants.has(declaration)) return '// identical shared constant already declared';
        constants.add(declaration);
        return line;
      });
    parts.push(`// Component: ${path}\n${inlined}`);
  }
  await visit('components/rack_generator.scad');
  componentCache = cache;
  return parts.join('\n\n') + '\n\n' + generateScadCode(config, false).replace(/^(?:use|include)\s+<[^>]+>\s*;?\s*$/gm, '// dependency inlined');
}

/**
 * Download the bundled SCAD file
 */
export async function downloadBundledScadFile(config: RackConfig): Promise<void> {
  const code = await generateBundledScadCode(config);
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = generateFilename(config, 'scad').replace('.scad', '_bundled.scad');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export as a folder (ZIP) with main file + components
 */
export async function downloadScadFolder(config: RackConfig): Promise<void> {
  // For folder export, we need a ZIP library
  // For now, just export the bundled version
  // TODO: Add JSZip for proper folder export
  await downloadBundledScadFile(config);
}
