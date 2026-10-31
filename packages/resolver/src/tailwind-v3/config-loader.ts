import { createRequire } from 'module';
import { readFileSync } from 'fs';
import type { UtilityRegistry } from '../core/utility-registry.js';
import { PluginDetector } from '../plugins/plugin-detector.js';
import { CustomUtilityExtractor } from '../plugins/utility-extractor.js';
import type { ThemeConfig } from '../types.js';

export interface TailwindV3ConfigInput {
  theme?: ThemeConfig;
  plugins?: unknown[];
}

function flattenColors(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const token = prefix ? (key === 'DEFAULT' ? prefix : `${prefix}-${key}`) : key;
    if (typeof value === 'string') {
      result[token] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenColors(value as Record<string, unknown>, token === 'DEFAULT' ? '' : token));
    }
  }
  return result;
}

export class TailwindV3ConfigLoader {
  /**
   * Safely loads a Tailwind v3 configuration file (CJS, ESM, TS, or JSON).
   */
  public static loadConfigFile(filePath: string): TailwindV3ConfigInput | ThemeConfig | null {
    try {
      const req = createRequire(filePath);
      const mod = req(filePath);
      return (mod && mod.default) || mod;
    } catch {
      try {
        const content = readFileSync(filePath, 'utf-8');
        if (filePath.endsWith('.json')) {
          return JSON.parse(content);
        }
        let code = content
          .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
          .replace(/import\s+[^;]+;?/g, '')
          .replace(/satisfies\s+[a-zA-Z0-9_$.]+;?/g, ';')
          .replace(/as\s+[a-zA-Z0-9_$.]+;?/g, ';')
          .replace(/export\s+default\s+/, 'return ')
          .replace(/module\.exports\s*=\s*/, 'return ');
        if (!code.includes('return')) {
          code = 'return ' + code;
        }
        return new Function(code)();
      } catch {
        return null;
      }
    }
  }

  public static loadIntoRegistry(config: TailwindV3ConfigInput | ThemeConfig, registry: UtilityRegistry): void {
    const rawConfig = config as TailwindV3ConfigInput;
    const theme = rawConfig.theme ? rawConfig.theme : (config as ThemeConfig);
    const extend = theme.extend || {};

    // 1. Process spacing
    const spacingMap = { ...theme.spacing, ...extend.spacing };
    for (const [token, value] of Object.entries(spacingMap)) {
      if (typeof value === 'string') {
        registry.register({ name: token, category: 'spacing', value, source: 'theme' });
        if (value.endsWith('rem')) {
          const remVal = parseFloat(value);
          if (!isNaN(remVal)) {
            registry.register({ name: token, category: 'spacing', value: `${remVal * 16}px`, source: 'theme' });
          }
        }
      }
    }

    // 2. Process colors (with recursive flattening for nested palettes)
    const rawColorsMap = { ...theme.colors, ...extend.colors };
    const flattenedColors = flattenColors(rawColorsMap as Record<string, unknown>);
    for (const [token, value] of Object.entries(flattenedColors)) {
      registry.register({ name: token, category: 'color', value, source: 'theme' });
    }

    // 3. Process borderRadius
    const radiusMap = { ...theme.borderRadius, ...extend.borderRadius };
    for (const [token, value] of Object.entries(radiusMap)) {
      if (typeof value === 'string') {
        registry.register({ name: token, category: 'radius', value, source: 'theme' });
        if (value.endsWith('rem')) {
          const remVal = parseFloat(value);
          if (!isNaN(remVal)) {
            registry.register({ name: token, category: 'radius', value: `${remVal * 16}px`, source: 'theme' });
          }
        }
      }
    }

    // 4. Process fontSize (supporting string and [fontSize, options] tuple)
    const fontMap = { ...theme.fontSize, ...extend.fontSize };
    for (const [token, rawVal] of Object.entries(fontMap)) {
      const valStr = typeof rawVal === 'string' ? rawVal : (Array.isArray(rawVal) && typeof rawVal[0] === 'string' ? rawVal[0] : null);
      if (valStr) {
        registry.register({ name: token, category: 'typography', value: valStr, source: 'theme' });
        if (valStr.endsWith('rem')) {
          const remVal = parseFloat(valStr);
          if (!isNaN(remVal)) {
            registry.register({ name: token, category: 'typography', value: `${remVal * 16}px`, source: 'theme' });
          }
        }
      }
    }

    // 5. Process borderWidth
    const borderMap = { ...theme.borderWidth, ...extend.borderWidth };
    for (const [token, value] of Object.entries(borderMap)) {
      if (typeof value === 'string') {
        registry.register({ name: token, category: 'borderWidth', value, source: 'theme' });
      }
    }

    // 6. Process ringWidth
    const ringMap = { ...theme.ringWidth, ...extend.ringWidth };
    for (const [token, value] of Object.entries(ringMap)) {
      if (typeof value === 'string') {
        registry.register({ name: token, category: 'ringWidth', value, source: 'theme' });
      }
    }

    // 7. Process outlineWidth
    const outlineMap = { ...theme.outlineWidth, ...extend.outlineWidth };
    for (const [token, value] of Object.entries(outlineMap)) {
      if (typeof value === 'string') {
        registry.register({ name: token, category: 'outlineWidth', value, source: 'theme' });
      }
    }

    // 8. Process fontWeight
    const weightMap = { ...theme.fontWeight, ...extend.fontWeight };
    for (const [token, value] of Object.entries(weightMap)) {
      if (typeof value === 'string' || typeof value === 'number') {
        registry.register({ name: token, category: 'fontWeight', value: String(value), source: 'theme' });
      }
    }

    // 9. Process opacity
    const opacityMap = { ...theme.opacity, ...extend.opacity };
    for (const [token, value] of Object.entries(opacityMap)) {
      if (typeof value === 'string' || typeof value === 'number') {
        registry.register({ name: token, category: 'opacity', value: String(value), source: 'theme' });
      }
    }

    // 10. Process zIndex
    const zMap = { ...theme.zIndex, ...extend.zIndex };
    for (const [token, value] of Object.entries(zMap)) {
      if (typeof value === 'string' || typeof value === 'number') {
        registry.register({ name: token, category: 'zIndex', value: String(value), source: 'theme' });
      }
    }

    // 11. Process plugins
    if (Array.isArray(config.plugins)) {
      const pluginNames: string[] = [];
      for (const p of config.plugins) {
        if (typeof p === 'string') {
          pluginNames.push(p);
        } else if (
          p !== null &&
          typeof p === 'object' &&
          'name' in p &&
          typeof (p as { name: unknown }).name === 'string'
        ) {
          pluginNames.push((p as { name: string }).name);
        } else if (typeof p === 'function') {
          // Attempt custom addUtilities plugin extraction
          const mockAddUtilities = (utils: Record<string, unknown>) => {
            CustomUtilityExtractor.extractAndRegister(utils as Record<string, string>, registry);
          };
          try {
            (p as (opts: { addUtilities: (u: Record<string, unknown>) => void }) => void)({
              addUtilities: mockAddUtilities,
            });
          } catch {
            // Ignore custom plugin execution errors
          }
        }
      }
      PluginDetector.detectAndRegister(pluginNames, registry);
    }
  }
}
