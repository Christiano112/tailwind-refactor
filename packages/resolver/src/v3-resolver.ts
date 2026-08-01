import type { TailwindResolver } from '@tailwind-refactor/core';
import { type UtilityDefinition, UtilityRegistry } from './core/utility-registry.js';
import { TailwindV3ConfigLoader } from './tailwind-v3/config-loader.js';
import type { ThemeConfig } from './types.js';

/**
 * Tailwind CSS v3 token resolver.
 *
 * @description
 * `TailwindV3Resolver` bridges the gap between raw arbitrary CSS values
 * (e.g. `h-[40px]`) and their canonical Tailwind v3 scale equivalents
 * (e.g. `h-10`), using the project's resolved `theme` configuration.
 *
 * @remarks
 * The resolution strategy is:
 * 1. Load the Tailwind v3 theme (default or custom) into a `UtilityRegistry`.
 * 2. For any `(utility, rawValue)` pair, look up the registry to find a
 *    scale step whose CSS output matches `rawValue`.
 * 3. If an exact match is found, return the canonical class name (e.g. `'h-10'`).
 * 4. If no match exists, return `null` — the rule engine interprets this as
 *    "no canonical equivalent" and either skips or flags the class.
 *
 * **Default theme**: When no `customConfig` is provided, the resolver uses the
 * Tailwind v3 default theme values for spacing, colors, typography, radius, etc.
 * This covers the vast majority of arbitrary-value usage in real projects.
 *
 * **Custom theme**: Pass a Tailwind v3 `theme` config object to support
 * projects with extended or overridden theme scales.
 *
 * @example
 * // Default Tailwind v3 theme
 * const resolver = new TailwindV3Resolver();
 * resolver.findEquivalent('h', '40px');   // → 'h-10'  (40px = 2.5rem = spacing-10)
 * resolver.findEquivalent('p', '16px');   // → 'p-4'   (16px = 1rem = spacing-4)
 * resolver.findEquivalent('h', '99px');   // → null    (no scale equivalent)
 *
 * @example
 * // Custom Tailwind theme
 * const resolver = new TailwindV3Resolver(myTailwindConfig.theme);
 * resolver.findEquivalent('text', '14px'); // → 'text-sm'
 *
 * @see {@link TailwindV4Resolver} for Tailwind v4 CSS custom property resolution
 * @see {@link UtilityRegistry}
 * @see {@link TailwindResolver}
 */
export class TailwindV3Resolver implements TailwindResolver {
  /** Internal registry that maps utility+value pairs to canonical class names. */
  private registry: UtilityRegistry;

  /**
   * Creates a new `TailwindV3Resolver`, optionally loaded with a custom theme config.
   * @param customConfig - A Tailwind v3 `theme` or full config object.
   *                       If omitted, the Tailwind v3 default theme is used.
   */
  constructor(customConfig?: ThemeConfig) {
    this.registry = new UtilityRegistry();
    if (customConfig) {
      TailwindV3ConfigLoader.loadIntoRegistry(customConfig, this.registry);
    }
  }

  /**
   * Returns the underlying `UtilityRegistry` for advanced inspection or testing.
   * @returns The `UtilityRegistry` instance backing this resolver.
   */
  public getRegistry(): UtilityRegistry {
    return this.registry;
  }

  /**
   * Attempts to find the canonical Tailwind v3 class for a given utility and value.
   *
   * @param utility  - The utility prefix without value (e.g. `'h'`, `'p'`, `'text'`, `'rounded'`).
   * @param rawValue - The arbitrary CSS value to resolve (e.g. `'40px'`, `'1rem'`, `'#3b82f6'`).
   * @returns The canonical class string (e.g. `'h-10'`, `'p-4'`) or `null` if no
   *          equivalent exists in the configured theme scale.
   *
   * @example
   * resolver.findEquivalent('h', '40px');     // → 'h-10'
   * resolver.findEquivalent('rounded', '4px'); // → 'rounded-sm'
   * resolver.findEquivalent('h', '99px');      // → null
   */
  resolve(utility: string, rawValue: string) {
    return this.registry.resolve(utility, rawValue);
  }

  findEquivalent(utility: string, rawValue: string): string | null {
    return this.registry.findEquivalent(utility, rawValue);
  }

  resolveCanonicalClass(parsed: {
    utility: string;
    value?: string;
    variants: string[];
    important?: boolean;
    isArbitrary?: boolean;
  }): string | null {
    return this.registry.resolveCanonicalClass(parsed);
  }

  sortClasses(tokens: string[]): string[] {
    return this.registry.sortClasses(tokens);
  }

  deduplicateClasses(tokens: string[]): string[] {
    return this.registry.deduplicateClasses(tokens);
  }

  /**
   * Resolves a full class name (e.g. `'h-10'`) to its `UtilityDefinition` metadata.
   *
   * @param className - A full Tailwind class name (e.g. `'h-10'`, `'text-sm'`).
   * @returns The `UtilityDefinition` containing the CSS property, value, and scale step,
   *          or `undefined` if the class is not in the registry.
   *
   * @example
   * const def = resolver.resolveUtility('h-10');
   * // → { property: 'height', value: '2.5rem', scaleKey: '10' }
   */
  resolveUtility(className: string): UtilityDefinition | undefined {
    return this.registry.resolveUtility(className);
  }
}
