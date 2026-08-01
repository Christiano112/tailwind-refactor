# Getting Started with `tailwind-refactor`

Welcome to `tailwind-refactor`! Follow this guide to set up the refactoring engine, CLI, ESLint plugin, or VS Code extension in your codebase.

---

## 💻 Installation

Install as a dev dependency or run on-the-fly via `npx`:

```bash
pnpm add -D tailwind-refactor eslint-plugin-tailwind-refactor
# or
npm install --save-dev tailwind-refactor eslint-plugin-tailwind-refactor
```

---

## ⚡ CLI Workflow & Commands

### 1. Scan your project
Detect non-canonical arbitrary values (`h-[40px]`, `p-[16px]`, `bg-[#3b82f6]`), duplicates, and out-of-order classes across JSX/TSX, Vue, Svelte, and HTML files:

```bash
npx tailwind-refactor scan src
```

### 2. Multi-core Parallel Scanning (`-p` / `--parallel`)
Scale analysis across all hardware cores for high-speed scanning of 4,000+ file projects:

```bash
npx tailwind-refactor scan src --parallel
```

### 3. Dry-Run Preview
Simulate transformations without mutating files on disk:

```bash
npx tailwind-refactor fix src --dry-run
```

### 4. Apply Atomic Fixes
Safely apply character-exact refactorings with atomic temporary file swaps:

```bash
npx tailwind-refactor fix src
```

### 5. Undo Refactoring Run
Revert the last refactoring operation from recorded run manifests:

```bash
npx tailwind-refactor undo
```

### 6. Interactive Review Mode
Review proposed changes file-by-file with colored diff previews before approving:

```bash
npx tailwind-refactor review src
```

### 7. Tailwind v4 `@theme` Converter
Automatically convert Tailwind v3 `tailwind.config.js` theme tokens into a Tailwind v4 `@theme` CSS block:

```bash
npx tailwind-refactor migrate-v4 theme.css
```

---

## 🔌 ESLint Integration

Add `eslint-plugin-tailwind-refactor` to your ESLint Flat Config (`eslint.config.js`):

```javascript
import tailwindRefactor from 'eslint-plugin-tailwind-refactor';

export default [
  {
    plugins: {
      'tailwind-refactor': tailwindRefactor,
    },
    rules: {
      'tailwind-refactor/prefer-canonical-tokens': 'warn',
    },
  },
];
```

Now `npx eslint --fix` will automatically lint and refactor non-canonical Tailwind classes in your IDE or CI pipeline!
