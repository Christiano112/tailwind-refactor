import type { CandidateLocation, InlineDirective } from './types.js';

export class InlineIgnoreMatcher {
  private disabledNextLines: { line: number; rules: string[] }[] = [];
  private disabledBlocks: { startLine: number; endLine: number; rules: string[] }[] = [];

  constructor(directives: InlineDirective[] = []) {
    this.processDirectives(directives);
  }

  static parseDirectivesFromText(sourceCode: string): InlineDirective[] {
    const directives: InlineDirective[] = [];
    const lines = sourceCode.split(/\r?\n/);

    const regex = /(?:(?:\/\/|\/\*)\s*tailwind-refactor-(disable-next-line|disable|enable)\s*([^/*]*)(?:\*\/)?)/g;

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1; // 1-indexed
      const lineText = lines[i];

      let match: RegExpExecArray | null;
      regex.lastIndex = 0;

      while ((match = regex.exec(lineText)) !== null) {
        const rawType = match[1];
        const rawRules = match[2].trim();
        const rules = rawRules ? rawRules.split(/\s+/).filter(Boolean) : [];

        let type: InlineDirective['type'] = 'disable-next-line';
        if (rawType === 'disable-next-line') type = 'disable-next-line';
        else if (rawType === 'disable') type = 'disable-block';
        else if (rawType === 'enable') type = 'enable-block';

        directives.push({
          type,
          rules,
          line: lineNum,
          range: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
      }
    }

    return directives;
  }

  private processDirectives(directives: InlineDirective[]): void {
    const activeBlocks: Map<string, number> = new Map(); // ruleName -> startLine, '' for all

    for (const d of directives) {
      if (d.type === 'disable-next-line') {
        this.disabledNextLines.push({
          line: d.line + 1,
          rules: d.rules,
        });
      } else if (d.type === 'disable-block') {
        const ruleKey = d.rules.length > 0 ? d.rules.join(',') : '*';
        activeBlocks.set(ruleKey, d.line);
      } else if (d.type === 'enable-block') {
        const ruleKey = d.rules.length > 0 ? d.rules.join(',') : '*';
        const startLine = activeBlocks.get(ruleKey);
        if (startLine !== undefined) {
          this.disabledBlocks.push({
            startLine,
            endLine: d.line,
            rules: d.rules,
          });
          activeBlocks.delete(ruleKey);
        }
      }
    }

    // Close any unclosed block disables at end of file (infinity)
    for (const [ruleKey, startLine] of activeBlocks.entries()) {
      const rules = ruleKey === '*' ? [] : ruleKey.split(',');
      this.disabledBlocks.push({
        startLine,
        endLine: Number.MAX_SAFE_INTEGER,
        rules,
      });
    }
  }

  isTransformationIgnored(location: CandidateLocation, ruleName: string, sourceCode?: string): boolean {
    let line = location.line;

    if (line === undefined && sourceCode) {
      // Calculate line number from character start offset
      line = sourceCode.slice(0, location.start).split(/\r?\n/).length;
    }

    if (line === undefined) return false;

    // 1. Check next-line disables
    for (const item of this.disabledNextLines) {
      if (item.line === line) {
        if (item.rules.length === 0 || item.rules.includes(ruleName)) {
          return true;
        }
      }
    }

    // 2. Check block disables
    for (const block of this.disabledBlocks) {
      if (line >= block.startLine && line <= block.endLine) {
        if (block.rules.length === 0 || block.rules.includes(ruleName)) {
          return true;
        }
      }
    }

    return false;
  }
}
