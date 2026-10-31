# tailwind-refactor

> Standalone CLI binary and Node SDK for tailwind-refactor — an enterprise-grade Tailwind CSS static analysis and refactoring engine.

`tailwind-refactor` scans your TypeScript, React, Vue, Svelte, and HTML codebases for non-canonical or redundant Tailwind utility classes (arbitrary values like `h-[40px]`, `p-[16px]`, `bg-[#3b82f6]`, duplicate classes, or out-of-order classes) and safely refactors them into canonical Tailwind theme tokens (`h-10`, `p-4`, `bg-blue-500`, `rounded-lg`, `text-base`).

---

## 💻 CLI Usage

```bash
# Install globally or as a dev dependency
npm install --save-dev tailwind-refactor

# Scan codebase for non-canonical utility classes
npx tailwind-refactor scan src

# Multi-core parallel scanning across worker threads (-p / --parallel)
npx tailwind-refactor scan src --parallel

# Preview refactoring modifications without writing to disk
npx tailwind-refactor fix src --dry-run

# Automatically apply refactorings atomically
npx tailwind-refactor fix src

# Revert last fix operation from run manifest
npx tailwind-refactor undo

# Interactively review changes file-by-file with colored diff previews
npx tailwind-refactor review src

# Convert Tailwind v3 config tokens to Tailwind v4 @theme CSS
npx tailwind-refactor migrate-v4 theme.css
```

---

## 🛠️ Programmatic Node SDK Usage

```typescript
import { RefactorEngine } from 'tailwind-refactor';
import { TailwindV3Resolver } from '@tailwind-refactor/resolver';

const resolver = new TailwindV3Resolver();
const engine = new RefactorEngine({ resolver });

const code = `const styles = "h-[40px] p-[16px] bg-[#3b82f6]";`;
const transformations = engine.analyzeCode(code, 'Component.tsx');
const refactoredCode = engine.patchCode(code, transformations);

console.log(refactoredCode);
// Output: const styles = "h-10 p-4 bg-blue-500";
```

---

## 📄 License

MIT © Christian Enyia
