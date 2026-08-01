# Rules Documentation

`tailwind-refactor` comes equipped with 7 transformation & diagnostic rules:

## 1. `arbitrary-value-normalization`
Converts arbitrary spacing values to canonical tokens.
- **Example**: `h-[40px]` -> `h-10`, `p-[16px]` -> `p-4`

## 2. `color-normalization`
Replaces arbitrary hex/rgb color strings with named theme colors.
- **Example**: `bg-[#ffffff]` -> `bg-white`, `text-[#000000]` -> `text-black`

## 3. `typography-normalization`
Converts arbitrary font dimensions into canonical font size tokens.
- **Example**: `text-[16px]` -> `text-base`

## 4. `radius-normalization`
Converts arbitrary pixel border radius to canonical radius tokens.
- **Example**: `rounded-[8px]` -> `rounded-lg`

## 5. `duplicate-class-cleanup`
Removes duplicated class tokens from class list expressions.
- **Example**: `"p-4 p-4 flex"` -> `"p-4 flex"`

## 6. `class-ordering`
Sorts utilities according to canonical Tailwind category order (layout -> flexbox -> spacing -> typography -> background/colors -> borders -> effects).
- **Example**: `p-4 flex` -> `flex p-4`

## 7. `unsafe-arbitrary-values`
Warns on dangerous `calc()`, `var()`, `env()`, or unresolvable dimension expressions.
- **Example**: `h-[calc(100vh-40px)]` (preserves value and emits diagnostic warning).
