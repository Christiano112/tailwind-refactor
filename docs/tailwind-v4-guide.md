# Tailwind CSS v4 CSS-First Integration Guide

Tailwind CSS v4 introduces CSS-first configuration using `@theme` blocks directly in your main stylesheet. `tailwind-refactor` provides native, PostCSS-powered parsing for v4 `@theme` directives.

---

## 🎨 `@theme` CSS Declaration

Define your theme tokens in your primary CSS file (`app/globals.css` or `src/theme.css`):

```css
@theme {
  --spacing-10: 2.5rem;
  --spacing-4: 1rem;
  --color-primary: #3b82f6;
  --color-brand-blue: oklch(0.6 0.2 250);
  --radius-lg: 0.5rem;
  --font-base: 1rem;
}
```

---

## 🛠️ PostCSS Resolver Features

- **Multi-line & Comment Stripping**: PostCSS parses nested `@theme` blocks, stripping CSS comments and multi-line declarations cleanly.
- **Unit Conversions**: Automatically converts `rem` declarations to `px` standard dimensions (e.g. `2.5rem` $\rightarrow$ `40px`) to match arbitrary utility classes (`h-[40px]`).
- **Color Spaces**: Supports hex, `rgb()`, `hsl()`, and `oklch()` color definitions.
- **Refactoring Conversion**: `TailwindV4Resolver` automatically converts arbitrary classes (`bg-[#3b82f6]`, `h-[40px]`, `rounded-[8px]`) to your custom v4 theme tokens (`bg-primary`, `h-10`, `rounded-lg`).
