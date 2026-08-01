import type { UtilityRegistry } from '../core/utility-registry.js';

export const STANDARD_PLUGIN_UTILITIES: Record<string, string[]> = {
  '@tailwindcss/forms': ['form-input', 'form-textarea', 'form-select', 'form-checkbox', 'form-radio'],
  '@tailwindcss/typography': ['prose', 'prose-sm', 'prose-lg', 'prose-xl', 'prose-2xl', 'prose-slate', 'prose-invert'],
  '@tailwindcss/aspect-ratio': ['aspect-w-16', 'aspect-h-9', 'aspect-w-1', 'aspect-h-1', 'aspect-none'],
  '@tailwindcss/container-queries': ['@container', '@container-normal'],
};

export class PluginDetector {
  public static detectAndRegister(
    pluginNames: string[],
    registry: UtilityRegistry
  ): { analyzed: string[]; skipped: string[] } {
    const analyzed: string[] = [];
    const skipped: string[] = [];

    for (const pluginName of pluginNames) {
      const knownUtilities = STANDARD_PLUGIN_UTILITIES[pluginName];
      if (knownUtilities) {
        analyzed.push(pluginName);
        for (const utilName of knownUtilities) {
          registry.register({
            name: utilName,
            category: 'custom',
            source: 'plugin',
          });
        }
      } else {
        skipped.push(pluginName);
      }
    }

    return { analyzed, skipped };
  }
}
