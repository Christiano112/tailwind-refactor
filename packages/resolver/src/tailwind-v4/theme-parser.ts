import postcss from 'postcss';
import type { UtilityRegistry } from '../core/utility-registry.js';

/**
 * PostCSS-based CSS Theme & Custom Property Parser.
 * Parses `@theme` blocks, `:root` blocks, and custom CSS variables (--spacing-*, --color-*, --radius-*, --font-*, --sc-*).
 * Dereferences `var(...)` references recursively and registers tokens into the UtilityRegistry.
 */
export class TailwindV4ThemeParser {
  public static parseAndRegister(cssContent: string, registry: UtilityRegistry): void {
    if (!cssContent || !cssContent.trim()) return;

    try {
      const root = postcss.parse(cssContent);
      const rawVars = new Map<string, string>();

      // Pass 1: Collect all CSS custom property declarations
      root.walkDecls((decl) => {
        if (decl.prop.startsWith('--')) {
          rawVars.set(decl.prop.trim(), decl.value.trim());
        }
      });

      // Dereference var(--...) references recursively
      const resolveValue = (val: string, visited = new Set<string>()): string => {
        const match = val.match(/^var\((--[^,)]+)(?:,\s*([^)]+))?\)$/);
        if (!match) return val;

        const varName = match[1].trim();
        const fallback = match[2]?.trim();

        if (visited.has(varName)) return fallback || val;
        visited.add(varName);

        const targetVal = rawVars.get(varName);
        if (targetVal) {
          return resolveValue(targetVal, visited);
        }
        return fallback || val;
      };

      // Pass 2: Register resolved tokens into UtilityRegistry
      for (const [prop, rawVal] of rawVars.entries()) {
        const resolvedVal = resolveValue(rawVal);
        if (!resolvedVal || resolvedVal.startsWith('var(')) continue;

        // Check explicit categories (--color-*, --spacing-*, --radius-*, --font-weight-*, --font-*, --text-*)
        const categoryMatch = prop.match(/^--(spacing|color|radius|font-weight|font|text)-(.+)$/i);

        if (categoryMatch) {
          const category = categoryMatch[1].toLowerCase();
          const tokenName = categoryMatch[2].toLowerCase();

          if (category === 'spacing') {
            registry.register({ name: tokenName, category: 'spacing', value: resolvedVal, source: 'theme' });
            if (resolvedVal.endsWith('rem')) {
              const remVal = parseFloat(resolvedVal);
              if (!isNaN(remVal)) {
                registry.register({ name: tokenName, category: 'spacing', value: `${remVal * 16}px`, source: 'theme' });
              }
            } else if (resolvedVal.endsWith('px')) {
              const pxVal = parseFloat(resolvedVal);
              if (!isNaN(pxVal)) {
                registry.register({ name: tokenName, category: 'spacing', value: `${pxVal / 16}rem`, source: 'theme' });
              }
            }
          } else if (category === 'text') {
            const fontToken = tokenName === 'default' ? 'DEFAULT' : tokenName;
            registry.register({ name: fontToken, category: 'typography', value: resolvedVal, source: 'theme' });
            if (resolvedVal.endsWith('rem')) {
              const remVal = parseFloat(resolvedVal);
              if (!isNaN(remVal)) {
                registry.register({
                  name: fontToken,
                  category: 'typography',
                  value: `${remVal * 16}px`,
                  source: 'theme',
                });
              }
            } else if (resolvedVal.endsWith('px')) {
              const pxVal = parseFloat(resolvedVal);
              if (!isNaN(pxVal)) {
                registry.register({
                  name: fontToken,
                  category: 'typography',
                  value: `${pxVal / 16}rem`,
                  source: 'theme',
                });
              }
            }
          } else if (category === 'color') {
            registry.register({ name: tokenName, category: 'color', value: resolvedVal, source: 'theme' });
          } else if (category === 'radius') {
            const radiusToken = tokenName === 'default' ? 'DEFAULT' : tokenName;
            registry.register({ name: radiusToken, category: 'radius', value: resolvedVal, source: 'theme' });
            if (resolvedVal.endsWith('rem')) {
              const remVal = parseFloat(resolvedVal);
              if (!isNaN(remVal)) {
                registry.register({
                  name: radiusToken,
                  category: 'radius',
                  value: `${remVal * 16}px`,
                  source: 'theme',
                });
              }
            } else if (resolvedVal.endsWith('px')) {
              const pxVal = parseFloat(resolvedVal);
              if (!isNaN(pxVal)) {
                registry.register({
                  name: radiusToken,
                  category: 'radius',
                  value: `${pxVal / 16}rem`,
                  source: 'theme',
                });
              }
            }
          } else if (category === 'font') {
            const fontToken = tokenName === 'default' ? 'DEFAULT' : tokenName;
            registry.register({ name: fontToken, category: 'fontFamily', value: resolvedVal, source: 'theme' });
          } else if (category === 'font-weight') {
            registry.register({ name: tokenName, category: 'fontWeight', value: resolvedVal, source: 'theme' });
          }
        } else {
          // Unprefixed or custom variables (e.g. --sc-primary-300: #1a8cff)
          const tokenName = prop.slice(2).toLowerCase();

          // Do not treat variables named with prefixes (like text-*, font-*) as spacing
          if (tokenName.startsWith('text-') || tokenName.startsWith('font-') || tokenName.startsWith('breakpoint-')) {
            if (tokenName.startsWith('text-')) {
              registry.register({
                name: tokenName.slice(5),
                category: 'typography',
                value: resolvedVal,
                source: 'theme',
              });
            }
            continue;
          }

          // Auto-detect category based on value format (hex colors, rgb, hsl, oklch, px, rem)
          if (/^#(?:[0-9a-fA-F]{3,4}){1,2}$|^rgba?\(|^hsla?\(|^oklch\(/i.test(resolvedVal)) {
            registry.register({ name: tokenName, category: 'color', value: resolvedVal, source: 'theme' });
          } else if (resolvedVal.endsWith('rem') || resolvedVal.endsWith('px')) {
            registry.register({ name: tokenName, category: 'spacing', value: resolvedVal, source: 'theme' });
            if (resolvedVal.endsWith('rem')) {
              const remVal = parseFloat(resolvedVal);
              if (!isNaN(remVal)) {
                registry.register({ name: tokenName, category: 'spacing', value: `${remVal * 16}px`, source: 'theme' });
              }
            }
          }
        }
      }
    } catch {
      // Fallback line-by-line parser if PostCSS fails
      const lines = cssContent.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*--([a-z0-9-]+)\s*:\s*([^;]+);/i);
        if (match && match[1] && match[2]) {
          const value = match[2].trim();
          const tokenName = match[1].toLowerCase();

          if (/^#(?:[0-9a-fA-F]{3,4}){1,2}$|^rgba?\(|^hsla?\(/i.test(value)) {
            registry.register({ name: tokenName, category: 'color', value, source: 'theme' });
          }
        }
      }
    }
  }
}
