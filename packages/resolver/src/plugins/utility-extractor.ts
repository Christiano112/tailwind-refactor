import type { UtilityRegistry } from '../core/utility-registry.js';

export class CustomUtilityExtractor {
  public static extractAndRegister(utilitiesObject: Record<string, unknown>, registry: UtilityRegistry): void {
    for (const selector of Object.keys(utilitiesObject)) {
      // Strip leading dot from CSS class selector
      const utilName = selector.replace(/^\./, '').trim();
      if (utilName) {
        registry.register({
          name: utilName,
          category: 'custom',
          source: 'plugin',
        });
      }
    }
  }
}
