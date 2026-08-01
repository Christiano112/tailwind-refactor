import { describe, expect, it } from 'vitest';
import { SourceParser } from './ast-parser.js';

describe('SourceParser AST extraction', () => {
  const parser = new SourceParser();

  it('extracts class candidates from JSX className attribute', () => {
    const code = `<div className="h-[40px] p-4" />`;
    const candidates = parser.parseCode(code, 'Component.tsx');
    const values = candidates.map((c) => c.value);
    expect(values).toContain('h-[40px] p-4');
    expect(values).toContain('h-[40px]');
    expect(values).toContain('p-4');

    // Check exact source positions for word candidate
    const wordCandidate = candidates.find((c) => c.value === 'h-[40px]')!;
    expect(code.substring(wordCandidate.location.start, wordCandidate.location.end)).toBe('h-[40px]');
  });

  it('extracts class candidates from conditional className expressions', () => {
    const code = `<div className={active ? "h-[40px]" : "h-10"} />`;
    const candidates = parser.parseCode(code, 'Component.tsx');
    expect(candidates.map((c) => c.value)).toEqual(['h-[40px]', 'h-10']);
  });

  it('extracts candidates from clsx(...) call arguments', () => {
    const code = `clsx("p-4", condition && "h-[40px]")`;
    const candidates = parser.parseCode(code, 'Component.tsx');
    expect(candidates.map((c) => c.value)).toEqual(['p-4', 'h-[40px]']);
  });

  it('extracts candidates from cva(...) call arguments', () => {
    const code = `cva("rounded-[8px]")`;
    const candidates = parser.parseCode(code, 'Component.tsx');
    expect(candidates.map((c) => c.value)).toEqual(['rounded-[8px]']);
  });

  it('extracts candidates from template literals', () => {
    const jsxCode = `<div className={\`p-4 \${active && "bg-[#ffffff]"}\`} />`;
    const candidates = parser.parseCode(jsxCode, 'Component.tsx');
    const values = candidates.map((c) => c.value);
    expect(values).toContain('p-4');
    expect(values).toContain('bg-[#ffffff]');
  });

  it('extracts candidates from Vue (.vue) and Svelte (.svelte) SFC template attributes', () => {
    const vueCode = `<template><div class="h-[40px] p-4" :class="'bg-[#ffffff]'" /></template>`;
    const vueCandidates = parser.parseCode(vueCode, 'App.vue');
    expect(vueCandidates.map((c) => c.value)).toContain('h-[40px]');
    expect(vueCandidates.map((c) => c.value)).toContain('bg-[#ffffff]');

    const svelteCode = `<div class="p-[16px] bg-[#000000]">Card</div>`;
    const svelteCandidates = parser.parseCode(svelteCode, 'Card.svelte');
    expect(svelteCandidates.map((c) => c.value)).toContain('p-[16px]');
    expect(svelteCandidates.map((c) => c.value)).toContain('bg-[#000000]');
  });
});
