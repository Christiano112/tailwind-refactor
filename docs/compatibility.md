# Compatibility Matrix

`tailwind-refactor` is tested and verified across modern web frameworks, template formats, and JavaScript runtimes.

---

## 🛠️ Frameworks & File Extensions

| Format | Extensions | Parser Engine | AST / Template Support |
| :--- | :--- | :--- | :--- |
| **React & JSX/TSX** | `.tsx`, `.jsx`, `.ts`, `.js` | `ts-morph` AST Scanner | `className="..."`, `clsx(...)`, `cva(...)`, `cn(...)`, ternaries, template literals |
| **Vue SFC** | `.vue` | Vue SAX Template Scanner | Static `class="..."`, dynamic `:class="{...}"` object & array bindings |
| **Svelte SFC** | `.svelte` | Svelte Directive Scanner | Static `class="..."`, dynamic `class:directive` bindings |
| **HTML** | `.html`, `.htm` | HTML SAX Scanner | Multi-line static `class="..."` attributes |

---

## 🎨 Tailwind CSS Version Support

| Version | Configuration Source | Resolver Capabilities |
| :--- | :--- | :--- |
| **Tailwind CSS v3** | `tailwind.config.js` / `tailwind.config.ts` | Complete scale resolution (`theme.extend`), custom spacing, colors, radii, and typography scales. |
| **Tailwind CSS v4** | Main CSS (`@theme` block) | PostCSS-powered parsing of `--spacing-*`, `--color-*`, `--radius-*`, `--font-*`, `oklch()`, rem-to-px conversions. |

---

## 🖥️ Runtime & System Environment

- **Node.js**: `>= 20.19.0` (LTS Node 20 / 22 / 24)
- **Package Managers**: `pnpm` (recommended), `npm`, `yarn`, `bun`
- **Operating Systems**: Windows (powershell / cmd), macOS, Linux
- **ESLint**: ESLint v8 and ESLint v9 Flat Configs (`eslint.config.js`)
- **VS Code**: VS Code `>= 1.90.0`
