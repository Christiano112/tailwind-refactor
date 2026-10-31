# eslint-plugin-tailwind-refactor

> ESLint plugin providing real-time linting and auto-fixing for non-canonical Tailwind CSS utility classes in TypeScript, React, Vue, and Svelte projects.

---

## 💻 Installation

```bash
pnpm add -D eslint-plugin-tailwind-refactor
# or
npm install --save-dev eslint-plugin-tailwind-refactor
```

---

## ⚙️ Usage Configuration

### ESLint Flat Config (`eslint.config.js` - Recommended)

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

### Legacy `.eslintrc.js`

```javascript
module.exports = {
  plugins: ['tailwind-refactor'],
  rules: {
    'tailwind-refactor/prefer-canonical-tokens': 'warn',
  },
};
```

---

## 📄 License

MIT © Christian Enyia
