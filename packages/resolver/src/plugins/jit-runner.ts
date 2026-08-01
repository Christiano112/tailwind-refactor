import type { UtilityRegistry } from '../core/utility-registry.js';

export class PostCSSJITRunner {
  public static extractFromPluginFunction(pluginFn: Function, registry: UtilityRegistry): void {
    if (typeof pluginFn !== 'function') return;

    try {
      const mockApi = {
        addUtilities: (utilities: Record<string, unknown>) => {
          for (const selector of Object.keys(utilities)) {
            const className = selector.replace(/^\./, '').trim();
            if (className) {
              registry.register({
                name: className,
                category: 'custom',
                source: 'plugin',
              });
            }
          }
        },
        theme: () => ({}),
      };

      pluginFn(mockApi);
    } catch {
      // Safe fallback if plugin function requires full Tailwind PostCSS context
    }
  }
}
