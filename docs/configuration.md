# Configuration & Security Guide

`tailwind-refactor` automatically detects whether your project uses Tailwind CSS v3 (`tailwind.config.js` / `tailwind.config.ts`) or Tailwind CSS v4 (`@theme` CSS block in your global stylesheet).

---

## 🔒 Configuration Security & Validation

Before loading external configuration files, `ConfigValidator` performs static AST security analysis to ensure code execution safety:

1. **Static AST Analysis**: Verifies that config files contain zero unsafe dynamic calls (`exec`, `spawn`, `eval`, dynamic `import()`, or unauthorized system calls).
2. **Circular `extends` Prevention**: Tracks configuration inheritance chains using a path tracker to block infinite loading loops.
3. **Candidate Bounds Safety**: Prevents Denial-of-Service (DoS) by enforcing a default limit of **5,000 candidate tokens per file**.

---

## 🎨 Tailwind v3 Scale Resolution

Place your standard `tailwind.config.js` or `tailwind.config.ts` in your root directory:

```javascript
module.exports = {
  theme: {
    extend: {
      spacing: {
        '10': '40px',
      },
      colors: {
        brand: '#0057ff',
      },
      borderRadius: {
        lg: '8px',
      },
    },
  },
};
```

---

## 🚀 Tailwind v4 CSS-First `@theme` Scale Resolution

In Tailwind v4, define custom variables inside `@theme` blocks in your main CSS file (`app/globals.css` or `src/theme.css`):

```css
@theme {
  --spacing-10: 2.5rem;
  --color-primary: #3b82f6;
  --radius-lg: 0.5rem;
  --font-base: 1rem;
}
```

The PostCSS-powered resolver automatically parses multi-line CSS declarations, `oklch()` color values, rem-to-px conversions, and theme custom properties.

---

## 💾 Persistent Disk Caching (`.tailwind-refactor-cache/`)

`DiskCache` maintains a fast filesystem-level cache keyed by `(filePath + contentHash + configHash)`:

- **Bypass Rule Evaluation**: Unchanged source files skip AST rule evaluation completely on repeated runs, providing **10-50x speedups**.
- **Git Ignore**: Always ensure `.tailwind-refactor-cache/` is added to your root `.gitignore` file (automatically added by `init`).

---

## 🚫 Ignore Comments & Rules

Ignore specific lines or entire files using inline comments:

```typescript
// tailwind-refactor-disable-line
const custom = "h-[47.5px]";

/* tailwind-refactor-disable */
const legacyStyles = "w-[99px] p-[13px]";
```
