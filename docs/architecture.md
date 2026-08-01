# Architecture Overview — `tailwind-refactor` Monorepo

`tailwind-refactor` is designed as a high-performance, modular, multi-package monorepo for AST static analysis, SFC template parsing, and safe token refactoring of Tailwind CSS utilities across production web applications.

---

## 🏛️ System Pipeline Architecture

```
                          +-------------------------+
                          |   Source Files          |
                          | (TSX, Vue, Svelte, HTML)|
                          +------------+------------+
                                       |
                                       v
                          +-------------------------+
                          | Fast AST Pre-Filter     | (/class|cva|cn|tw|style/i)
                          +------------+------------+
                                       |
                                       v
                          +-------------------------+
                          |  @tailwind-refactor     | (SourceParser + SFC Parsers)
                          |       /parser           | (ts-morph AST & SAX template scanners)
                          +------------+------------+
                                       | (String & Token candidates + character ranges)
                                       v
                          +-------------------------+
                          |  @tailwind-refactor     | (TailwindClass Parser & Safety Guards)
                          |        /core            | (DiskCache & Pipeline Controller)
                          +------------+------------+
                                       |
                                       v
                          +-------------------------+ <-----> @tailwind-refactor/resolver
                          |  @tailwind-refactor     |         (PostCSS v4 @theme & v3 scale)
                          |       /rules            |
                          +------------+------------+
                                       | (High-confidence Transformations)
                                       v
                          +-------------------------+
                          | Atomic File Patcher     | (.tmp file swap + last-run.json manifest)
                          +-------------------------+
```

---

## 📦 Package Domain Model

| Package | Role | Key Responsibilities |
| :--- | :--- | :--- |
| **`tailwind-refactor`** | Standalone CLI & SDK | Bundles all monorepo packages inline via `tsup` into `./dist/cli.cjs` and `./dist/index.js` with zero runtime dependencies. |
| **`@tailwind-refactor/core`** | Pipeline & Cache | `RefactorEngine`, `DiskCache`, `RangePatcher`, `TailwindClass` parser, and safety validators. |
| **`@tailwind-refactor/parser`** | AST & SFC Extraction | `SourceParser` (`ts-morph`), `parseVueSFC`, `parseSvelteSFC`, and `parseHTMLSFC`. |
| **`@tailwind-refactor/resolver`** | Theme Resolution | `TailwindV3Resolver`, `TailwindV4Resolver` (PostCSS `@theme` parser), and $O(1)$ token `UtilityRegistry`. |
| **`@tailwind-refactor/rules`** | Refactoring Engine | Rule interface (`granularity: 'token' \| 'string'`), `ParallelFileScanner` worker pool, and plugin sandbox. |
| **`@tailwind-refactor/config`** | Config & Security | `ConfigValidator` AST security analyzer, loader, and circular `extends` tracker. |
| **`@tailwind-refactor/ignore`** | Ignore System | File glob scanner (`globSync` OS-level ignores) and inline comment disable parser. |
| **`@tailwind-refactor/logger`** | Structured Telemetry | Level-aware logging, `picocolors` formatting, and domain error codes. |
| **`@tailwind-refactor/plugin-api`** | Extension Contracts | Public interfaces for custom plugins, rules, and custom reporters. |
| **`eslint-plugin-tailwind-refactor`** | ESLint Integration | Rule bridge for ESLint v8 / v9 flat configs. |
| **`tailwind-refactor-vscode`** | Editor Extension | Language Server Protocol (LSP) diagnostics and Quick Fix code actions. |
