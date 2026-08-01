import { unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { ConfigValidator } from './config-validator.js';

function writeTempConfig(content: string): string {
  const path = resolve(tmpdir(), `test-config-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`);
  writeFileSync(path, content, 'utf-8');
  return path;
}

describe('ConfigValidator Security', () => {
  it('passes for safe configuration', () => {
    const path = writeTempConfig('export default { rules: {} };');
    expect(() => ConfigValidator.validate(path)).not.toThrow();
    unlinkSync(path);
  });

  it('blocks exec() calls', () => {
    const path = writeTempConfig('const x = exec("rm -rf /");');
    expect(() => ConfigValidator.validate(path)).toThrow();
    unlinkSync(path);
  });

  it('blocks child_process usage', () => {
    const path = writeTempConfig('import child_process from "child_process";');
    expect(() => ConfigValidator.validate(path)).toThrow();
    unlinkSync(path);
  });

  it('blocks eval() calls', () => {
    const path = writeTempConfig('eval("malicious code");');
    expect(() => ConfigValidator.validate(path)).toThrow();
    unlinkSync(path);
  });

  it('blocks process.exit calls', () => {
    const path = writeTempConfig('process.exit(1);');
    expect(() => ConfigValidator.validate(path)).toThrow();
    unlinkSync(path);
  });
});
