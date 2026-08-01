import type { TailwindCandidate } from '@tailwind-refactor/core';
import { ErrorCode, Logger, ToolError } from '@tailwind-refactor/logger';
import { Node, Project, type SourceFile } from 'ts-morph';
import { SFCParser } from './sfc-parser.js';
import type { DynamicCandidate, ParseResult } from './types.js';

/**
 * TypeScript/JSX AST parser that extracts Tailwind class candidates from source code.
 *
 * @description
 * `SourceParser` is the first phase of the analysis pipeline. It takes a raw
 * source file string and returns two lists:
 *
 * - **`safeCandidates`** — Static class strings with precise byte offset locations,
 *   ready for rule evaluation and patching.
 * - **`dynamicCandidates`** — Class expressions containing runtime-interpolated values
 *   (template literals, variable references) that cannot be safely resolved at build time.
 *
 * @remarks
 * **AST extraction strategy**: The parser walks the TypeScript AST via `ts-morph`
 * and targets specifically:
 * - `className="..."` and `class="..."` JSX attributes (string literals and JSX expressions)
 * - `clsx(...)`, `cva(...)`, `cn(...)`, `twMerge(...)`, `classNames(...)` call expressions
 *
 * **Dual-granularity extraction**: For each string literal containing multiple
 * space-separated class tokens, the parser extracts:
 * 1. The **full multi-class string** (e.g. `'h-10 flex items-center'`) — for rules
 *    that operate on class combinations (e.g. `DuplicateClassCleanupRule`).
 * 2. Each **individual token** (e.g. `'h-10'`, `'flex'`, `'items-center'`) with
 *    its own precise offset — for rules that operate on single classes.
 *
 * **SFC fallback**: For `.vue`, `.svelte`, `.html`, and `.astro` files, a regex-based
 * fallback is used instead of the TypeScript AST (which cannot parse those file formats).
 *
 * **Symbol resolution**: For identifier references (e.g. `className={myClasses}`),
 * the parser attempts to resolve the variable's value by looking it up in the same
 * file's AST. If the identifier resolves to a `const` string literal in the same
 * file, it is treated as a static candidate.
 *
 * @example
 * const parser = new SourceParser();
 * const candidates = parser.parseCode(
 *   '<button className="h-[40px] flex">Click</button>',
 *   'Button.tsx',
 * );
 * // → [
 * //   { value: 'h-[40px] flex', location: { start: 22, end: 35 } },
 * //   { value: 'h-[40px]', location: { start: 22, end: 30 } },
 * //   { value: 'flex', location: { start: 31, end: 35 } },
 * // ]
 *
 * @see {@link RefactorEngine} for where `SourceParser` is used in the pipeline
 * @see {@link DynamicCandidate}
 * @see {@link ParseResult}
 */
export class SourceParser {
  /** Logger for emitting parse failure warnings. */
  private logger: Logger;
  /** Instance-scoped ts-morph Project to isolate language service state per parser. */
  private project: Project;

  /**
   * Creates a new `SourceParser` instance.
   * @param options         - Optional configuration.
   * @param options.logger  - Logger instance for emitting parse warnings.
   */
  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger ?? new Logger('normal');
    this.project = new Project({
      compilerOptions: {
        jsx: 1,
        allowJs: true,
      },
      useInMemoryFileSystem: true,
    });
  }

  /**
   * Disposes of language service state and clears all loaded source files to prevent memory leaks.
   */
  public dispose(): void {
    const files = this.project.getSourceFiles();
    for (const file of files) {
      this.project.removeSourceFile(file);
    }
  }

  /**
   * Parses source code and returns only the static safe class candidates.
   *
   * @remarks
   * Convenience wrapper around {@link parseCodeWithAnalysis} that discards
   * dynamic candidate information. Use when you only need safe candidates
   * for rule evaluation.
   *
   * @param code     - The full UTF-8 source code string to parse.
   * @param filePath - POSIX-normalized path to the source file (determines parse strategy).
   * @returns Array of {@link TailwindCandidate} objects with byte offset locations.
   *
   * @example
   * const candidates = parser.parseCode(code, 'Button.tsx');
   */
  parseCode(code: string, filePath: string): TailwindCandidate[] {
    const result = this.parseCodeWithAnalysis(code, filePath);
    return result.safeCandidates;
  }

  /**
   * Parses source code and returns both safe candidates and dynamic candidates.
   *
   * @description
   * The full parsing pipeline:
   * 1. For SFC files (`.vue`, `.svelte`, `.html`, `.astro`): runs the regex-based
   *    `class=` attribute extractor and returns early.
   * 2. For TypeScript/JSX files: creates an in-memory `ts-morph` `SourceFile`,
   *    runs {@link parseSourceFileWithAnalysis}, then removes the source file to
   *    free memory.
   * 3. On AST parse failure: logs a `ToolError` with `ErrorCode.PARSER_FAILED`
   *    and returns empty arrays (non-fatal — file is silently skipped).
   *
   * @param code     - The full UTF-8 source code string to parse.
   * @param filePath - POSIX-normalized path to the source file.
   * @returns A {@link ParseResult} with `safeCandidates` and `dynamicCandidates`.
   *
   * @example
   * const { safeCandidates, dynamicCandidates } = parser.parseCodeWithAnalysis(code, 'Button.tsx');
   * console.log(`Found ${dynamicCandidates.length} dynamic values that were skipped.`);
   */
  private static readonly CLASS_PREFILTER_REGEX =
    /(?:class(?:Name)?|cva|cn|clsx|twMerge|twJoin|variants|tv|style)\b|\[[a-z0-9#-]+\]/i;

  parseCodeWithAnalysis(code: string, filePath: string): ParseResult {
    code = code.replace(/\r\n/g, '\n');
    const stringCandidates: TailwindCandidate[] = [];
    const tokenCandidates: TailwindCandidate[] = [];
    const dynamicCandidates: DynamicCandidate[] = [];

    // Fast-path pre-filter: skip expensive ts-morph AST parsing for minified, oversized, or non-class files
    if (code.length > 1_000_000 || filePath.endsWith('.min.js') || !SourceParser.CLASS_PREFILTER_REGEX.test(code)) {
      return {
        safeCandidates: [],
        stringCandidates: [],
        tokenCandidates: [],
        dynamicCandidates: [],
      };
    }

    const extractTokensFromText = (text: string, contentStartOffset: number) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;

      if (text.includes(' ')) {
        stringCandidates.push({
          value: text,
          location: {
            start: contentStartOffset,
            end: contentStartOffset + text.length,
          },
          filePath,
        });
      }

      const regex = /\S+/g;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const word = match[0];
        const wordStart = contentStartOffset + match.index;
        const wordEnd = wordStart + word.length;

        tokenCandidates.push({
          value: word,
          location: {
            start: wordStart,
            end: wordEnd,
          },
          filePath,
        });
      }
    };

    // Framework SFC parsing for Vue, Svelte, Astro, HTML files
    if (/\.(vue|svelte|html|astro)$/.test(filePath)) {
      const sfcResult = SFCParser.parse(code, filePath);
      const safeCandidates = [...sfcResult.stringCandidates, ...sfcResult.tokenCandidates];
      return {
        safeCandidates,
        stringCandidates: sfcResult.stringCandidates,
        tokenCandidates: sfcResult.tokenCandidates,
        dynamicCandidates: [],
      };
    }

    try {
      const sourceFile = this.project.createSourceFile(filePath, code, { overwrite: true });
      this.parseSourceFileWithAnalysis(sourceFile, extractTokensFromText, dynamicCandidates, filePath);
      this.project.removeSourceFile(sourceFile);

      const safeCandidates = [...stringCandidates, ...tokenCandidates];
      return { safeCandidates, stringCandidates, tokenCandidates, dynamicCandidates };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const toolErr = new ToolError({
        code: ErrorCode.PARSER_FAILED,
        message: `Failed to parse AST for file: ${errMsg}`,
        severity: 'warning',
        file: filePath,
        suggestion: 'Verify source file contains valid JavaScript/TypeScript/JSX syntax',
        cause: err,
      });
      this.logger.warn(toolErr);
      return { safeCandidates: [], stringCandidates: [], tokenCandidates: [], dynamicCandidates: [] };
    }
  }

  /**
   * Walks the TypeScript AST and collects class candidates from JSX attributes
   * and class utility function call expressions.
   *
   * @description
   * Targets two AST node types:
   * - **`JsxAttribute`** nodes where `attrName === 'className' || 'class'`
   * - **`CallExpression`** nodes where the callee matches `clsx | cva | cn | twMerge | classNames`
   *
   * For each matched node, delegates value extraction to {@link analyzeExpression}.
   *
   * @param sourceFile             - The `ts-morph` source file to traverse.
   * @param extractTokensFromNode  - Callback to collect a class string and its offset.
   * @param dynamicCandidates      - Mutable array to push dynamic (skipped) candidates into.
   * @param filePath               - POSIX-normalized path to the source file.
   */
  private static readonly UTILITY_CALL_REGEX = /^(?:clsx|cva|cn|twMerge|classNames|twJoin|tv)$/;

  private parseSourceFileWithAnalysis(
    sourceFile: SourceFile,
    extractTokensFromNode: (text: string, contentStartOffset: number) => void,
    dynamicCandidates: DynamicCandidate[],
    filePath: string
  ): void {
    const isClassIdentifier = (name: string): boolean =>
      name === 'className' ||
      name === 'class' ||
      name === 'classNames' ||
      name === 'classes' ||
      name === 'styles' ||
      name.endsWith('Class') ||
      name.endsWith('Classes') ||
      name.endsWith('ClassName') ||
      name.endsWith('ClassNames') ||
      name.endsWith('Variant') ||
      name.endsWith('Variants');

    sourceFile.forEachDescendant((node) => {
      if (Node.isJsxAttribute(node)) {
        const attrName = node.getNameNode().getText();
        if (isClassIdentifier(attrName)) {
          const initializer = node.getInitializer();
          if (initializer) {
            this.analyzeExpression(initializer, extractTokensFromNode, dynamicCandidates, filePath, sourceFile);
          }
        }
      } else if (Node.isVariableDeclaration(node)) {
        const varName = node.getName();
        if (isClassIdentifier(varName)) {
          const initializer = node.getInitializer();
          if (initializer) {
            this.analyzeExpression(initializer, extractTokensFromNode, dynamicCandidates, filePath, sourceFile);
          }
        }
      } else if (Node.isCallExpression(node)) {
        const expr = node.getExpression();
        const exprText = expr.getText();
        if (SourceParser.UTILITY_CALL_REGEX.test(exprText)) {
          const args = node.getArguments();
          for (const arg of args) {
            this.analyzeExpression(arg, extractTokensFromNode, dynamicCandidates, filePath, sourceFile);
          }
        } else if (Node.isPropertyAccessExpression(expr) && expr.getName() === 'join') {
          this.analyzeExpression(node, extractTokensFromNode, dynamicCandidates, filePath, sourceFile);
        }
      }
    });
  }

  /**
   * Recursively analyzes an AST expression node to extract class string candidates.
   *
   * @description
   * Handles the following expression types recursively:
   * - **String literals** / **no-substitution template literals** → extracted as safe candidates.
   * - **JSX expressions** `{...}` → recursed into their inner expression.
   * - **Conditional expressions** `a ? b : c` → both branches are analyzed.
   * - **Binary expressions** (e.g. string concatenation) → right-hand side is analyzed.
   * - **Template expressions** `` `${...}` `` → recorded as dynamic candidates;
   *   static head and tail spans are still extracted.
   * - **Array literals** `['a', 'b']` → each element is recursed.
   * - **Object literals** `{ 'class-a': condition }` → string keys are extracted
   *   as candidates; values are recursed.
   * - **Identifiers** / **property accesses** → same-file `const` symbol resolution
   *   is attempted first. If resolved to a string literal, treated as safe.
   *   Otherwise, recorded as a dynamic candidate.
   *
   * @param node               - The AST expression node to analyze.
   * @param extractFn          - Callback to collect a class string and its offset.
   * @param dynamicCandidates  - Mutable array to push unresolvable dynamic values into.
   * @param filePath           - POSIX-normalized source file path for error reporting.
   * @param sourceFile         - Optional `ts-morph` source file for local symbol resolution.
   */
  private analyzeExpression(
    node: Node,
    extractFn: (text: string, contentStartOffset: number) => void,
    dynamicCandidates: DynamicCandidate[],
    filePath: string,
    sourceFile?: SourceFile
  ) {
    if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.getLiteralText();
      const startOffset = node.getStart(false) + 1;
      extractFn(text, startOffset);
    } else if (Node.isJsxExpression(node)) {
      const expr = node.getExpression();
      if (expr) {
        this.analyzeExpression(expr, extractFn, dynamicCandidates, filePath, sourceFile);
      }
    } else if (Node.isConditionalExpression(node)) {
      this.analyzeExpression(node.getWhenTrue(), extractFn, dynamicCandidates, filePath, sourceFile);
      this.analyzeExpression(node.getWhenFalse(), extractFn, dynamicCandidates, filePath, sourceFile);
    } else if (Node.isBinaryExpression(node)) {
      this.analyzeExpression(node.getRight(), extractFn, dynamicCandidates, filePath, sourceFile);
    } else if (Node.isTemplateExpression(node)) {
      const fullText = node.getText();
      const line = node.getStartLineNumber();

      dynamicCandidates.push({
        expression: fullText,
        sourceType: 'template',
        extractedClasses: [],
        confidence: 'dynamic',
        location: { start: node.getStart(false), end: node.getEnd() },
        filePath,
        line,
        reason: 'Runtime interpolated value cannot be determined at build time.',
      });

      // Extract static head
      const headText = node.getHead().getLiteralText();
      if (headText) {
        extractFn(headText, node.getHead().getStart(false) + 1);
      }

      // Inspect template spans for embedded static expressions
      for (const span of node.getTemplateSpans()) {
        const spanExpr = span.getExpression();
        this.analyzeExpression(spanExpr, extractFn, dynamicCandidates, filePath, sourceFile);

        const literalText = span.getLiteral().getLiteralText();
        if (literalText) {
          extractFn(literalText, span.getLiteral().getStart(false) + 1);
        }
      }
    } else if (Node.isArrayLiteralExpression(node)) {
      for (const element of node.getElements()) {
        this.analyzeExpression(element, extractFn, dynamicCandidates, filePath, sourceFile);
      }
    } else if (Node.isObjectLiteralExpression(node)) {
      for (const prop of node.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
          const nameNode = prop.getNameNode();
          if (Node.isStringLiteral(nameNode)) {
            this.analyzeExpression(nameNode, extractFn, dynamicCandidates, filePath, sourceFile);
          }
          const init = prop.getInitializer();
          if (init) {
            this.analyzeExpression(init, extractFn, dynamicCandidates, filePath, sourceFile);
          }
        }
      }
    } else if (Node.isCallExpression(node)) {
      const expr = node.getExpression();
      if (Node.isPropertyAccessExpression(expr)) {
        const methodName = expr.getName();
        if (methodName === 'join' || methodName === 'concat') {
          this.analyzeExpression(expr.getExpression(), extractFn, dynamicCandidates, filePath, sourceFile);
          for (const arg of node.getArguments()) {
            this.analyzeExpression(arg, extractFn, dynamicCandidates, filePath, sourceFile);
          }
        }
      } else if (SourceParser.UTILITY_CALL_REGEX.test(expr.getText())) {
        for (const arg of node.getArguments()) {
          this.analyzeExpression(arg, extractFn, dynamicCandidates, filePath, sourceFile);
        }
      }
    } else if (Node.isIdentifier(node) || Node.isPropertyAccessExpression(node)) {
      const exprText = node.getText();

      // Same-file AST const symbol resolution attempt
      if (sourceFile && Node.isIdentifier(node)) {
        const varDecl = sourceFile.getVariableDeclaration(exprText);
        if (varDecl) {
          const initializer = varDecl.getInitializer();
          if (initializer && (Node.isStringLiteral(initializer) || Node.isNoSubstitutionTemplateLiteral(initializer))) {
            const literalText = initializer.getLiteralText();
            extractFn(literalText, node.getStart());
            return;
          }
        }
      }

      if (!/^(true|false|null|undefined)$/.test(exprText)) {
        const line = node.getStartLineNumber();
        dynamicCandidates.push({
          expression: exprText,
          sourceType: 'unknown',
          extractedClasses: [],
          confidence: 'dynamic',
          location: { start: node.getStart(), end: node.getEnd() },
          filePath,
          line,
          reason: 'Variable identifier reference cannot be resolved at build time.',
        });
      }
    }
  }
}
