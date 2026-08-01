# Supported Refactoring Rules

`tailwind-refactor` includes a suite of AST-based refactoring rules designed for 100% precision, zero false positives, and absolute idempotency.

---

## 🛠️ Built-in Rule Reference

| Rule Name | Granularity | Category | Description | Example Input | Expected Output | Confidence |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **`prefer-token-values`** | `token` | Optimization | Converts arbitrary spacing/dimension values (`[...]`) into equivalent canonical Tailwind theme tokens if present in theme scale. | `h-[40px]` | `h-10` | High |
| **`color-normalization`** | `token` | Optimization | Replaces arbitrary hex/RGB/HSL color values with named theme color tokens. | `bg-[#3b82f6]` | `bg-blue-500` | High |
| **`radius-normalization`** | `token` | Optimization | Normalizes arbitrary border-radius values to theme radius tokens. | `rounded-[8px]` | `rounded-lg` | High |
| **`typography-normalization`** | `token` | Optimization | Converts arbitrary font sizes to canonical typography tokens. | `text-[16px]` | `text-base` | High |
| **`duplicate-class-cleanup`** | `string` | Cleanup | Removes repeated class tokens in class string expressions. | `p-4 p-4 flex` | `p-4 flex` | High |
| **`class-ordering`** | `string` | Formatting | Sorts utility classes according to canonical Tailwind ordering logic. | `flex p-4 items-center` | `flex items-center p-4` | High |
| **`unsafe-arbitrary-values`** | `token` | Safety | Flags unsafe or malformed arbitrary values for developer review. | `w-[calc(100%-invalid)]` | *(Warning)* | High |

---

## 🔒 Safety Rules & Exclusions

The engine enforces strict bidirectional verification before applying any token replacement:

1. **Bidirectional CSS Verification**: A candidate token replacement (`h-10`) is ONLY applied if its generated CSS value (`40px` / `2.5rem`) **exactly matches** the original raw value. If custom theme settings override `spacing.10` to `36px`, `h-[40px]` will **not** be converted to `h-10`.
2. **Preserved Expressions**: The engine will **NEVER** modify:
   - Dynamic JavaScript variable interpolations (`${isMobile ? 'h-10' : height}`)
   - Unresolvable arbitrary dimensions (e.g. `w-[237px]`)
   - Complex `calc()` expressions (e.g. `h-[calc(100vh-40px)]`)
   - CSS custom property variables (e.g. `h-[var(--custom-h)]`)

---

## 🔁 Idempotency Guarantee

All built-in rules guarantee **100% Idempotency**:
`analyze(patch(code, pass1)) === 0 transformations`.

Running `tailwind-refactor fix` twice will produce zero additional changes and preserve code stability.
