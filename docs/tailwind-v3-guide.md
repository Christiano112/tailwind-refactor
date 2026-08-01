# Tailwind CSS v3 Integration Guide

`tailwind-refactor` provides full backwards compatibility for Tailwind CSS v3 codebases configured with `tailwind.config.js` or `tailwind.config.ts`.

---

## 🎨 Theme Scale Resolution Workflow

1. **Automatic Config Discovery**: `ConfigLoader` searches for `tailwind.config.js`, `tailwind.config.ts`, or `tailwind.config.cjs` starting from your target scan directory up to the workspace root.
2. **Theme Merging**: Merges your custom `theme.extend` declarations with Tailwind v3 default scales:
   - Spacing (`theme.spacing`)
   - Colors (`theme.colors` - hex, RGB, HSL, and OKLCH)
   - Border Radii (`theme.borderRadius`)
   - Font Sizes & Line Heights (`theme.fontSize`)
3. **Complex Utility & Variant Resolution**: Preserves all prefix modifiers, dark mode variants, pseudo-classes, and important flags (e.g. `md:hover:!h-[40px]` $\rightarrow$ `md:hover:!h-10`).

---

## 🚀 Migration to Tailwind v4

If you plan to migrate your v3 codebase to Tailwind v4, use the built-in CLI converter:

```bash
npx tailwind-refactor migrate-v4 theme.css
```

This command automatically exports all resolved v3 tokens into a clean Tailwind v4 `@theme` CSS block.
