import { parseTailwindClass } from '@tailwind-refactor/core';
import { SourceParser } from '@tailwind-refactor/parser';
import { createResolverForWorkspace } from '@tailwind-refactor/resolver';
import { RefactorEngine } from '@tailwind-refactor/rules';
import { bench, describe } from 'vitest';

describe('Performance Microbenchmarks', () => {
  const parser = new SourceParser();
  const resolver = createResolverForWorkspace(process.cwd());
  const engine = new RefactorEngine({ resolver });

  const sampleComponentCode = `
import React from 'react';
import clsx from 'clsx';

export function ComplexCard() {
  return (
    <div className={clsx("h-[40px] p-[16px] text-[16px] bg-[#ffffff]", "rounded-[8px] flex items-center")}>
      <span className="p-4 p-4 text-[14px] bg-[#3b82f6]">Card Title</span>
    </div>
  );
}
`;

  bench('parseTailwindClass() 1,000 class string invocations', () => {
    for (let i = 0; i < 1000; i++) {
      parseTailwindClass('h-[40px]');
      parseTailwindClass('bg-[#ffffff]');
      parseTailwindClass('rounded-[8px]');
    }
  });

  bench('SourceParser AST extraction per component', () => {
    for (let i = 0; i < 100; i++) {
      parser.parseCode(sampleComponentCode, 'ComplexCard.tsx');
    }
  });

  bench('RefactorEngine end-to-end analysis and patch generation', () => {
    for (let i = 0; i < 50; i++) {
      const transformations = engine.analyzeCode(sampleComponentCode, 'ComplexCard.tsx');
      engine.patchCode(sampleComponentCode, transformations);
    }
  });
});
