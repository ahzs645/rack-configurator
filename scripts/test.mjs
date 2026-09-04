import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('.test-build', { recursive: true });
const dir = await mkdtemp('.test-build/rack-tests-');
try {
  await build({ entryPoints: ['tests/layout.test.ts'], bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: `${dir}/layout.test.cjs`, define: { 'import.meta.env.BASE_URL': '"/"' } });
  const result = spawnSync(process.execPath, ['--test', `${dir}/layout.test.cjs`], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally { await rm(dir, { recursive: true, force: true }); }
