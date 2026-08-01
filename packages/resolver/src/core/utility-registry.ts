import { DEFAULT_THEME_CONFIG } from '../default-theme.js';
import type { ThemeConfig } from '../types.js';

export type UtilitySource = 'default' | 'theme' | 'plugin';
export type UtilityCategory =
  | 'spacing'
  | 'color'
  | 'typography'
  | 'radius'
  | 'minWidth'
  | 'maxWidth'
  | 'minHeight'
  | 'maxHeight'
  | 'shadow'
  | 'screens'
  | 'layout'
  | 'custom';

export interface UtilityDefinition {
  name: string;
  category: UtilityCategory;
  value?: string;
  source: UtilitySource;
}

export class UtilityRegistry {
  private utilities: Map<string, UtilityDefinition> = new Map();
  private valueToTokenMap: Map<string, { token: string; category: UtilityCategory; source: UtilitySource }> = new Map();
  private memoCache: Map<string, string | null> = new Map();

  constructor() {
    this.registerDefaults();
  }

  public register(def: UtilityDefinition): void {
    this.memoCache.clear();
    if (def.source === 'theme' && def.value && !def.value.includes('calc(') && !def.value.includes('var(')) {
      for (const [k, v] of this.valueToTokenMap.entries()) {
        if (v.token === def.name && v.category === def.category && v.source === 'default') {
          this.valueToTokenMap.delete(k);
        }
      }
    }

    this.utilities.set(def.name, def);

    if (def.value) {
      const normalizedValue = def.value.trim().toLowerCase();
      const key = `${def.category}:${normalizedValue}`;
      const existing = this.valueToTokenMap.get(key);
      if (!existing || def.source !== 'default') {
        this.valueToTokenMap.set(key, { token: def.name, category: def.category, source: def.source });
      }
    }
  }

  public resolveUtility(className: string): UtilityDefinition | undefined {
    return this.utilities.get(className);
  }

  public exportTokens(): {
    spacing: Record<string, string>;
    colors: Record<string, string>;
    borderRadius: Record<string, string>;
    fontSize: Record<string, string>;
  } {
    const spacing: Record<string, string> = {};
    const colors: Record<string, string> = {};
    const borderRadius: Record<string, string> = {};
    const fontSize: Record<string, string> = {};

    for (const def of this.utilities.values()) {
      if (def.source === 'theme' && def.value) {
        if (def.category === 'spacing') spacing[def.name] = def.value;
        else if (def.category === 'color') colors[def.name] = def.value;
        else if (def.category === 'radius') borderRadius[def.name] = def.value;
        else if (def.category === 'typography') fontSize[def.name] = def.value;
      }
    }

    return { spacing, colors, borderRadius, fontSize };
  }

  public resolve(
    utilityPrefix: string,
    rawValue: string
  ):
    | { found: true; canonical: string; cssValue: string }
    | { found: false; reason: 'unknown-utility' | 'no-equivalent' } {
    const canonical = this.findEquivalent(utilityPrefix, rawValue);
    if (canonical) {
      return { found: true, canonical, cssValue: rawValue.trim() };
    }
    return { found: false, reason: 'no-equivalent' };
  }

  private static readonly SPACING_PREFIXES = new Set([
    'p',
    'px',
    'py',
    'pt',
    'pr',
    'pb',
    'pl',
    'm',
    'mx',
    'my',
    'mt',
    'mr',
    'mb',
    'ml',
    'w',
    'h',
    'min-w',
    'min-h',
    'max-w',
    'max-h',
    'gap',
    'gap-x',
    'gap-y',
    'space-x',
    'space-y',
    'inset',
    'inset-x',
    'inset-y',
    'top',
    'right',
    'bottom',
    'left',
    'translate-x',
    'translate-y',
    'size',
    'leading',
    'scroll-m',
    'scroll-mx',
    'scroll-my',
    'scroll-ms',
    'scroll-me',
    'scroll-mt',
    'scroll-mr',
    'scroll-mb',
    'scroll-ml',
    'scroll-p',
    'scroll-px',
    'scroll-py',
    'scroll-ps',
    'scroll-pe',
    'scroll-pt',
    'scroll-pr',
    'scroll-pb',
    'scroll-pl',
  ]);

  private static readonly SIZING_CATEGORY_MAP: Record<string, UtilityCategory> = {
    'min-w': 'minWidth',
    'max-w': 'maxWidth',
    'min-h': 'minHeight',
    'max-h': 'maxHeight',
  };

  public findEquivalent(utilityPrefix: string, rawValue: string): string | null {
    const cacheKey = `${utilityPrefix}:${rawValue}`;
    if (this.memoCache.has(cacheKey)) {
      return this.memoCache.get(cacheKey)!;
    }

    const res = this.computeEquivalent(utilityPrefix, rawValue);
    this.memoCache.set(cacheKey, res);
    return res;
  }

  private computeEquivalent(utilityPrefix: string, rawValue: string): string | null {
    let normValue = rawValue.trim().toLowerCase();
    let isNegative = false;

    if (utilityPrefix.startsWith('-')) {
      isNegative = true;
      utilityPrefix = utilityPrefix.slice(1);
    }

    if (normValue.startsWith('-')) {
      isNegative = !isNegative;
      normValue = normValue.slice(1);
    } else if (normValue.startsWith('[-') && normValue.endsWith(']')) {
      isNegative = !isNegative;
      normValue = normValue.slice(2, -1);
    }

    const actualPrefix = isNegative ? `-${utilityPrefix}` : utilityPrefix;

    const sizingCategory = UtilityRegistry.SIZING_CATEGORY_MAP[utilityPrefix];
    if (sizingCategory) {
      const match = this.valueToTokenMap.get(`${sizingCategory}:${normValue}`);
      if (match) return `${actualPrefix}-${match.token}`;

      const numericStep = parseFloat(normValue);
      if (!isNaN(numericStep) && isFinite(numericStep) && numericStep > 0) {
        const pxVal = `${numericStep * 4}px`;
        const scaleMatch = this.valueToTokenMap.get(`${sizingCategory}:${pxVal}`);
        if (scaleMatch) return `${actualPrefix}-${scaleMatch.token}`;
      }
    }

    if (utilityPrefix === 'text') {
      const colorMatch = this.valueToTokenMap.get(`color:${normValue}`);
      if (colorMatch) return `text-${colorMatch.token}`;

      const fontMatch = this.valueToTokenMap.get(`typography:${normValue}`);
      if (fontMatch) return `text-${fontMatch.token}`;

      return null;
    }

    let category: UtilityCategory | null = null;
    if (
      utilityPrefix === 'bg' ||
      utilityPrefix.startsWith('border') ||
      utilityPrefix.startsWith('ring') ||
      utilityPrefix.startsWith('outline') ||
      utilityPrefix.startsWith('divide') ||
      utilityPrefix === 'accent' ||
      utilityPrefix === 'caret' ||
      utilityPrefix === 'fill' ||
      utilityPrefix === 'stroke'
    ) {
      category = 'color';
    } else if (utilityPrefix === 'rounded' || utilityPrefix.startsWith('rounded-')) {
      category = 'radius';
    } else if (UtilityRegistry.SPACING_PREFIXES.has(utilityPrefix)) {
      category = 'spacing';
    }

    if (!category) return null;

    const key = `${category}:${normValue}`;
    const match = this.valueToTokenMap.get(key);

    if (match) {
      if (category === 'radius') {
        if (match.token === 'DEFAULT') return actualPrefix;
        return `${actualPrefix}-${match.token}`;
      }
      return `${actualPrefix}-${match.token}`;
    }

    if (category === 'spacing') {
      let numVal: number | null = null;
      if (normValue.endsWith('px')) {
        const parsed = parseFloat(normValue.slice(0, -2));
        if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0 && Math.round(parsed * 100) % 25 === 0) {
          numVal = parsed / 4;
        }
      } else if (normValue.endsWith('rem')) {
        const parsed = parseFloat(normValue.slice(0, -3));
        if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0 && Math.round(parsed * 16 * 100) % 25 === 0) {
          numVal = parsed * 4;
        }
      }

      if (numVal !== null) {
        const cleanVal = Number(`${Math.round(Number(`${numVal}e4`))}e-4`);
        return `${actualPrefix}-${cleanVal}`;
      }
    }

    return null;
  }

  public resolveCanonicalClass(parsed: {
    utility: string;
    value?: string;
    variants: string[];
    important?: boolean;
    isArbitrary?: boolean;
    modifier?: string;
  }): string | null {
    if (!parsed.value) return null;
    const equivalent = this.findEquivalent(parsed.utility, parsed.value);
    if (!equivalent) return null;

    const variantPrefix = parsed.variants.length > 0 ? `${parsed.variants.join(':')}:` : '';
    const importantPrefix = parsed.important ? '!' : '';
    const modifierSuffix = parsed.modifier ?? '';
    return `${variantPrefix}${importantPrefix}${equivalent}${modifierSuffix}`;
  }

  public sortClasses(tokens: string[]): string[] {
    const getCategoryPriority = (token: string): number => {
      const parts = token.split(':');
      const base = parts[parts.length - 1];
      const hasVariant = parts.length > 1;
      const variantBonus = hasVariant ? 100 : 0;

      let priority = 8;
      if (/^(absolute|relative|fixed|sticky|static|block|hidden|inline-block|container)$/.test(base)) priority = 1;
      else if (/^(flex|grid|inline-flex|items-|justify-|col-|row-|gap-|space-)/.test(base)) priority = 2;
      else if (/^(p|pt|pr|pb|pl|px|py|m|mt|mr|mb|ml|mx|my|w|h|size|top|left|right|bottom|inset)-/.test(base))
        priority = 3;
      else if (/^(text-|font-|leading-|tracking-|uppercase|lowercase|capitalize|italic|truncate)/.test(base))
        priority = 4;
      else if (/^(bg-|from-|to-|via-)/.test(base)) priority = 5;
      else if (/^(border-|rounded)/.test(base)) priority = 6;

      return variantBonus + priority;
    };

    return [...tokens].sort((a, b) => getCategoryPriority(a) - getCategoryPriority(b));
  }

  public deduplicateClasses(tokens: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const token of tokens) {
      if (!seen.has(token)) {
        seen.add(token);
        result.push(token);
      }
    }
    return result;
  }

  private registerDefaults(): void {
    const categories: Array<[keyof ThemeConfig, UtilityCategory]> = [
      ['spacing', 'spacing'],
      ['colors', 'color'],
      ['borderRadius', 'radius'],
      ['fontSize', 'typography'],
      ['minWidth', 'minWidth'],
      ['maxWidth', 'maxWidth'],
      ['minHeight', 'minHeight'],
      ['maxHeight', 'maxHeight'],
    ];

    for (const [configKey, category] of categories) {
      const scale = (DEFAULT_THEME_CONFIG[configKey] as Record<string, string>) || {};
      for (const [val, token] of Object.entries(scale)) {
        this.register({ name: token, category, value: val, source: 'default' });
      }
    }
  }
}
