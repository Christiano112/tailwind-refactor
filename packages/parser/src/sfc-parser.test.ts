import { describe, expect, it } from 'vitest';
import { SFCParser } from './sfc-parser.js';

describe('SFCParser', () => {
  describe('Vue templates', () => {
    it('extracts class from static template attribute', () => {
      const code = '<template><div class="h-[40px] w-[160px]"></div></template>';
      const result = SFCParser.parse(code, 'Component.vue');
      expect(result.stringCandidates).toHaveLength(1);
      expect(result.stringCandidates[0].value).toBe('h-[40px] w-[160px]');
      expect(result.tokenCandidates).toHaveLength(2);
      expect(result.tokenCandidates.map((t) => t.value)).toEqual(['h-[40px]', 'w-[160px]']);
    });

    it('extracts class from single quotes attribute', () => {
      const code = "<template><div class='p-[16px] m-[8px]'></div></template>";
      const result = SFCParser.parse(code, 'Component.vue');
      expect(result.tokenCandidates.map((t) => t.value)).toEqual(['p-[16px]', 'm-[8px]']);
    });
  });

  describe('Svelte components', () => {
    it('extracts class from class= attribute', () => {
      const code = '<div class="text-[14px] bg-[#000000]">Hello</div>';
      const result = SFCParser.parse(code, 'App.svelte');
      expect(result.tokenCandidates.map((t) => t.value)).toEqual(['text-[14px]', 'bg-[#000000]']);
    });
  });

  describe('HTML files', () => {
    it('extracts class from multi-line class attribute', () => {
      const code = `<div class="
        h-[40px]
        w-[160px]
      "></div>`;
      const result = SFCParser.parse(code, 'index.html');
      expect(result.tokenCandidates.map((t) => t.value)).toEqual(['h-[40px]', 'w-[160px]']);
    });
  });
});
