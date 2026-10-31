# @tailwind-refactor/parser

## 0.1.2

### Patch Changes

- Exhaustive compiler audit and bug fixes:
  - Fix SFC parser character offsets for class attributes with leading/trailing spaces, preventing skipped patches.
  - Support both operands in binary string concatenations in AST parser.
  - Fix same-file const symbol resolution to target declaration initializers rather than JSX usage sites.
  - Improve workspace auto-detection to verify @theme CSS before classifying as v4, correctly discovering v3 tailwind.config.\* files.
  - Support nested color palettes (with DEFAULT keys) and tuple fontSize definitions in Tailwind v3 config loader.
  - Add category-specific resolution for directional borders, rings, outlines, font weights, font families, opacity, and container scale steps.
  - Isolate Tailwind v4 --text-_ and fix regex precedence for --font-weight-_.
  - Ensure character-offset precision and preservation of Windows CRLF line endings.
- Updated dependencies
  - @tailwind-refactor/core@0.1.2

## 0.1.1

### Patch Changes

- fix: optimize bundle size to 468kB and upgrade to pnpm v11
- Updated dependencies
  - @tailwind-refactor/core@0.1.1
  - @tailwind-refactor/logger@0.1.1
