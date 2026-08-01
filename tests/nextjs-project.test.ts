import { TailwindV3Resolver, TailwindV4Resolver } from '@tailwind-refactor/resolver';
import { RefactorEngine } from '@tailwind-refactor/rules';
import { describe, expect, it } from 'vitest';

describe('Production Next.js Project Refactoring Engine', () => {
  it('safely transforms complex Next.js button component with clsx and cva', () => {
    const nextJsComponentCode = `
import React from 'react';
import clsx from 'clsx';
import { cva } from 'class-variance-authority';

const buttonStyles = cva("rounded-[8px] p-4 flex");

export function ActionButton({ isPrimary, active }: { isPrimary: boolean; active: boolean }) {
  return (
    <button
      className={clsx(
        "h-[40px] p-[16px] text-[16px] bg-[#ffffff]",
        isPrimary ? "bg-[#3b82f6]" : "bg-[#000000]",
        active && "md:hover:!h-[40px]"
      )}
    >
      Submit
    </button>
  );
}
`;

    const engine = new RefactorEngine({ resolver: new TailwindV3Resolver() });
    const transformations = engine.analyzeCode(nextJsComponentCode, 'ActionButton.tsx');

    expect(transformations.length).toBeGreaterThan(0);

    const patchedCode = engine.patchCode(nextJsComponentCode, transformations);

    // Verify all transformations in patched code
    expect(patchedCode).toContain('h-10');
    expect(patchedCode).toContain('p-4');
    expect(patchedCode).toContain('text-base');
    expect(patchedCode).toContain('bg-white');
    expect(patchedCode).toContain('bg-blue-500');
    expect(patchedCode).toContain('bg-black');
    expect(patchedCode).toContain('rounded-lg');
    expect(patchedCode).toContain('md:hover:!h-10');

    // Verify whitespace and structure preserved
    expect(patchedCode).toContain("import React from 'react';");
    expect(patchedCode).toContain('<button');
    expect(patchedCode).toContain('Submit');
  });

  it('safely handles Tailwind v4 CSS @theme rules in production Card layout', () => {
    const v4Css = `
      @theme {
        --spacing-10: 2.5rem;
        --color-primary: #3b82f6;
        --radius-lg: 0.5rem;
      }
    `;
    const cardCode = `
      export function Card() {
        return (
          <div className="h-[40px] p-[16px] bg-[#3b82f6] rounded-[8px]" />
        );
      }
    `;

    const engine = new RefactorEngine({ resolver: new TailwindV4Resolver(v4Css) });
    const transformations = engine.analyzeCode(cardCode, 'Card.tsx');
    const patchedCode = engine.patchCode(cardCode, transformations);

    expect(patchedCode).toContain('h-10');
    expect(patchedCode).toContain('p-4');
    expect(patchedCode).toContain('bg-primary');
    expect(patchedCode).toContain('rounded-lg');
  });
});
