import type { UtilityRegistry } from '../core/utility-registry.js';
import { PluginDetector } from '../plugins/plugin-detector.js';
import { CustomUtilityExtractor } from '../plugins/utility-extractor.js';
import type { ThemeConfig } from '../types.js';

export interface TailwindV3ConfigInput {
  theme?: ThemeConfig;
  plugins?: unknown[];
}

export class TailwindV3ConfigLoader {
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

    // 2. Process colors
    const colorsMap = { ...theme.colors, ...extend.colors };
    for (const [token, value] of Object.entries(colorsMap)) {
      if (typeof value === 'string') {
        registry.register({ name: token, category: 'color', value, source: 'theme' });
      }
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

    // 4. Process fontSize
    const fontMap = { ...theme.fontSize, ...extend.fontSize };
    for (const [token, value] of Object.entries(fontMap)) {
      if (typeof value === 'string') {
        registry.register({ name: token, category: 'typography', value, source: 'theme' });
      }
    }

    // 5. Process plugins
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
