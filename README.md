# tailwind-refactor

> Enterprise-grade Tailwind CSS refactoring engine, static analysis tool, ESLint plugin, and VS Code extension for production TypeScript, React, Vue, Svelte, and HTML applications.

`tailwind-refactor` analyzes your codebase to detect non-canonical or redundant Tailwind utility classes (such as arbitrary values `h-[40px]`, `p-[16px]`, `bg-[#3b82f6]`, `rounded-[8px]`, `text-[16px]`, duplicate classes, or out-of-order classes) and safely transforms them into canonical theme tokens (`h-10`, `p-4`, `bg-blue-500`, `rounded-lg`, `text-base`).

---

## ⚡ Key Features

- 🎯 **Multi-Framework AST & SFC Parsers**: Supported template parsing for JSX/TSX attributes (`className="..."`), `clsx(...)`, `cva(...)`, template literals, Vue (`.vue`), Svelte (`.svelte`), and HTML (`.html`) files.
- 🚀 **Tailwind v3 & v4 CSS-First Support**: Native token resolver supporting `tailwind.config.js` scales and Tailwind v4 `@theme` CSS block declarations (`--spacing-*`, `--color-*`, `--radius-*`, `--font-*`).
- ⚡ **Multi-Core Parallel Execution (`-p` / `--parallel`)**: Worker thread pool scaling across hardware cores delivering up to **345+ files/sec** throughput.
- 💾 **Persistent Disk Cache**: SHA-256 content and configuration hashing (`.tailwind-refactor-cache/`) skipping unchanged files for **10-50x speedups** on repeated runs.
- ↩️ **Atomic Writes & Undo System**: Applies atomic temporary file swaps and records run manifests (`.tailwind-refactor/last-run.json`). Instantly undo refactoring runs with `tailwind-refactor undo`.
- 📊 **Visual & Security Reports**: Generates interactive HTML visual reports (`--html-report`) and SARIF-compliant diagnostics (`--format sarif`) for GitHub Security / CodeQL actions.
- 🛡️ **Config Security & DoS Protection**: AST static analysis verifying config safety before execution, circular `extends` detection, and 5,000 candidate limits per file.
- 🛠️ **Full Ecosystem Integration**: Single standalone CLI binary (`npx tailwind-refactor` / `npx tw-refactor`), ESLint plugin (`eslint-plugin-tailwind-refactor`), and VS Code Extension (`tailwind-refactor-vscode`).

---

## 🚀 Quickstart

### Installation

Install as a dev dependency or run on-the-fly via `npx`:

```bash
pnpm add -D tailwind-refactor
# or
npm install --save-dev tailwind-refactor
```

### CLI Commands

```bash
# Scan codebase for non-canonical utility classes
npx tailwind-refactor scan src

# Scan using multi-core parallel workers
npx tailwind-refactor scan src --parallel

# Preview modifications without writing to disk (dry run)
npx tailwind-refactor fix src --dry-run

# Automatically apply refactoring changes atomically
npx tailwind-refactor fix src

# Revert the last fix operation from run manifest
npx tailwind-refactor undo

# Interactively review changes file-by-file with color diff previews
npx tailwind-refactor review src

# Automatically convert Tailwind v3 theme tokens into a Tailwind v4 @theme CSS block
npx tailwind-refactor migrate-v4 theme.css

# Export SARIF report for GitHub Code Scanning CI pipelines
npx tailwind-refactor scan src --format sarif > results.sarif
```

---

## 📦 Package Architecture

```
tailwind-refactor/
├── packages/
│   ├── cli/             # Single standalone bundled NPM binary & Node SDK
│   ├── core/            # Pipeline engine, safety guards, AST range patcher & disk cache
│   ├── parser/          # AST & SFC parsers (JSX/TSX, Vue, Svelte, HTML, clsx, cva)
│   ├── resolver/        # Tailwind v3 & v4 (@theme CSS) token resolvers & postcss parser
│   ├── rules/           # Built-in refactoring rules, worker pool & plugin sandbox
│   ├── config/          # Config loader, security AST validator & circular extends tracker
│   ├── ignore/          # File glob scanner & inline comment ignore system
│   ├── logger/          # Structured logger, picocolors formatter & domain error codes
│   ├── plugin-api/      # Public Plugin, Reporter, and Data Model contracts
│   ├── eslint-plugin/   # eslint-plugin-tailwind-refactor (ESLint v8/v9 flat config)
│   └── vscode/          # VS Code Extension (inline diagnostics & Quick Fixes)
└── docs/                # Architectural guides & documentation
```

---

## 📚 Documentation

- 📖 [Getting Started](docs/getting-started.md)
- ⚙️ [Configuration & Security Guide](docs/configuration.md)
- 🎨 [Supported Refactoring Rules](docs/supported-rules.md)
- 📐 [Tailwind v3 Integration Guide](docs/tailwind-v3-guide.md)
- 🚀 [Tailwind v4 CSS-First Migration Guide](docs/tailwind-v4-guide.md)
- 🏛️ [Architecture Audit](docs/architecture.md)
- 🤝 [Contributing Guidelines](CONTRIBUTING.md)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on setting up the monorepo, running benchmarks, and submitting pull requests.

---

## 📄 License

MIT © Christian Enyia <christianowebdev@gmail.com>
