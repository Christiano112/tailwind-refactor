import { createResolverForWorkspace } from '@tailwind-refactor/resolver';
import { RefactorEngine } from '@tailwind-refactor/rules';

const defaultInput = `import React from 'react';
import clsx from 'clsx';

export function Card({ active }: { active: boolean }) {
  return (
    <div
      className={clsx(
        "h-[40px] p-[16px] text-[16px] bg-[#ffffff] rounded-[8px]",
        active && "bg-[#3b82f6] p-4 p-4 flex"
      )}
    >
      Live Refactor Playground
    </div>
  );
}
`;

const inputEl = document.getElementById('inputCode') as HTMLTextAreaElement;
const outputEl = document.getElementById('outputCode') as HTMLTextAreaElement;

if (inputEl && outputEl) {
  inputEl.value = defaultInput;

  const resolver = createResolverForWorkspace(process.cwd());
  const engine = new RefactorEngine({ resolver });

  const runRefactor = () => {
    try {
      const code = inputEl.value;
      const transformations = engine.analyzeCode(code, 'Playground.tsx');
      const patched = engine.patchCode(code, transformations);
      outputEl.value = patched;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      outputEl.value = `// Refactoring Error: ${msg}`;
    }
  };

  inputEl.addEventListener('input', runRefactor);
  runRefactor();
}
