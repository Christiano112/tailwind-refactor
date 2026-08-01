# Contributing to `tailwind-refactor`

Thank you for your interest in contributing to **`tailwind-refactor`**! We welcome bug reports, feature requests, custom rules, parser enhancements, and performance optimizations.

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: `>= 20.19.0`
- **pnpm**: `>= 9.0.0` (required package manager)

### Monorepo Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/christiano112/tailwind-refactor.git
cd tailwind-refactor

# Install dependencies using pnpm
pnpm install
```

---

## 🏗️ Development Workflow

### Building Packages

The project uses [Turborepo](https://turbo.build/) to orchestrate builds across all 11 monorepo packages:

```bash
# Build all 11 packages
pnpm build
```

### Running Tests

We maintain 100% test pass rate across unit, integration, fixture, SFC, and idempotency test suites powered by [Vitest](https://vitest.dev/):

```bash
# Run full test suite once
pnpm test

# Run tests in watch mode during development
pnpm test:watch
```

### Code Quality & Formatting

We use [Biome](https://biomejs.dev/) for fast linting and formatting:

```bash
# Check formatting and lint rules
pnpm check

# Auto-format all files
pnpm format
```

---

## 📦 Monorepo Package Structure

| Package Path | Package Name | Description |
| :--- | :--- | :--- |
| `packages/cli` | `tailwind-refactor` | Standalone CLI binary (`cli.cjs` / `cli.js`) and Node SDK |
| `packages/core` | `@tailwind-refactor/core` | Refactoring pipeline, AST range patcher, safety guards & disk cache |
| `packages/parser` | `@tailwind-refactor/parser` | AST & SFC parsers (JSX/TSX, Vue, Svelte, HTML) |
| `packages/resolver` | `@tailwind-refactor/resolver` | Tailwind v3 & v4 (`@theme` CSS) token resolvers |
| `packages/rules` | `@tailwind-refactor/rules` | Built-in transformation rules, worker pool & plugin sandbox |
| `packages/config` | `@tailwind-refactor/config` | Config loader, AST security validator & circular extends tracker |
| `packages/ignore` | `@tailwind-refactor/ignore` | Glob scanner & inline disable comment parser |
| `packages/logger` | `@tailwind-refactor/logger` | Structured logger and domain error handler |
| `packages/plugin-api` | `@tailwind-refactor/plugin-api` | Public Plugin API contracts and type definitions |
| `packages/eslint-plugin` | `eslint-plugin-tailwind-refactor` | ESLint plugin for ESLint v8 / v9 flat configs |
| `packages/vscode` | `tailwind-refactor-vscode` | VS Code extension with inline diagnostics and quick fixes |

---

## 🧪 Scaffolding New Rules

You can quickly scaffold a new refactoring rule module using the CLI:

```bash
npx tailwind-refactor init-rule prefer-custom-shadows
```

This creates a new rule file in `src/rules/prefer-custom-shadows.ts` with boilerplate implementations of the `Rule` interface.

### Rule Guidelines

1. **Idempotency**: Applying your rule twice MUST produce the exact same code as applying it once. Add an idempotency test in `packages/rules/src/idempotency.test.ts`.
2. **Granularity**: Declare `granularity: 'token'` for individual class utility matching or `granularity: 'string'` for full class string transformations (e.g. duplicate removal, sorting).
3. **No Project-Specific Hardcoding**: All color, spacing, radius, and typography lookups MUST be generic and rely on the active `TailwindResolver`.

---

## ⚡ Running Performance Benchmarks

We benchmark `tailwind-refactor` against massive monorepos (`shadcn/ui` with 4,000+ files and `cal.com` with 5,000+ files):

```bash
# Run benchmark suite
pnpm bench
```

When implementing performance optimizations, ensure that throughput gains do not compromise rule precision or idempotency.

---

## 📄 Pull Request Guidelines

1. **Keep Commits Clean**: Ensure commits describe the architectural change clearly.
2. **Verify Monorepo Pipeline**: Before submitting a PR, verify that the entire pipeline passes:
   ```bash
   pnpm build && pnpm test && pnpm check
   ```
3. **Add Tests**: Include unit tests for any bug fix or new refactoring rule.

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the project's **MIT License**.
