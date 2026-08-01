import { execFile } from 'child_process';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

function runCLI(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  const cliBinary = resolve(__dirname, '../packages/cli/dist/cli.cjs');
  return new Promise((res) => {
    execFile(process.execPath, [cliBinary, ...args], { cwd: resolve(__dirname, '..') }, (error, stdout, stderr) => {
      res({
        stdout: stdout || '',
        stderr: stderr || '',
        code: error ? Number(error.code) || 1 : 0,
      });
    });
  });
}

describe('CLI Binary Subprocess Execution', () => {
  it('outputs help text when called with --help flag', async () => {
    const res = await runCLI(['--help']);
    expect(res.code).toBe(0);
    expect(res.stdout).toContain('tailwind-refactor');
    expect(res.stdout).toContain('scan');
    expect(res.stdout).toContain('fix');
    expect(res.stdout).toContain('review');
  }, 20000);

  it('runs scan command against fixtures directory', async () => {
    const fixturesDir = resolve(__dirname, 'fixtures');
    const res = await runCLI(['scan', fixturesDir]);
    expect(res.code).toBe(1);
    expect(res.stdout).toContain('Scanning Tailwind utility usage');
  }, 20000);

  it('runs scan command in parallel mode via -p / --parallel flag', async () => {
    const fixturesDir = resolve(__dirname, 'fixtures');
    const res = await runCLI(['scan', fixturesDir, '--parallel']);
    if (res.code !== 1) {
      console.error('DEBUG CLI PARALLEL STDERR:', res.stderr, 'STDOUT:', res.stdout);
    }
    expect(res.code).toBe(1);
    expect(res.stdout).toContain('PARALLEL WORKERS');
  }, 20000);

  it('runs fix --dry-run command without writing to disk', async () => {
    const fixturesDir = resolve(__dirname, 'fixtures');
    const res = await runCLI(['fix', fixturesDir, '--dry-run']);
    expect(res.code).toBe(0);
    expect(res.stdout).toContain('DRY RUN');
  }, 20000);
});
