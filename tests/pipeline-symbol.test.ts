import { MemoryWorkspace, RefactorPipeline } from '@tailwind-refactor/core';
import { SourceParser } from '@tailwind-refactor/parser';
import { describe, expect, it } from 'vitest';

describe('Central RefactorPipeline & Symbol Resolution Architecture', () => {
  it('executes in-memory scanning using MemoryWorkspace and RefactorPipeline', async () => {
    const memoryWorkspace = new MemoryWorkspace({
      'src/Button.tsx': '<button className="h-[40px] p-[16px] bg-[#ffffff]" />',
    });

    const pipeline = new RefactorPipeline(memoryWorkspace);
    const result = await pipeline.scan({ dir: 'src' });

    expect(result.filesScanned).toBe(1);
    expect(await memoryWorkspace.exists('src/Button.tsx')).toBe(true);
  });

  it('resolves same-file const symbol variable declarations (const cardPadding = "p-[16px]")', () => {
    const parser = new SourceParser();
    const code = `
const cardPadding = "p-[16px]";
export function Component() {
  return <div className={cardPadding} />;
}
`;

    const candidates = parser.parseCode(code, 'Component.tsx');
    expect(candidates.map((c) => c.value)).toContain('p-[16px]');
  });
});
