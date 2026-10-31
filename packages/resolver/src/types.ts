export interface TailwindResolver {
  findEquivalent(utility: string, rawValue: string): string | null;
  /** Optional: de-duplicate a class token list (preserves first-seen order). */
  deduplicateClasses?(tokens: string[]): string[];
  /** Optional: sort a class token list by category priority. */
  sortClasses?(tokens: string[]): string[];
}

export interface ThemeConfig {
  theme?: ThemeConfig;
  extend?: ThemeConfig;
  spacing?: Record<string, string>;
  colors?: Record<string, string | Record<string, string>>;
  borderRadius?: Record<string, string>;
  fontSize?: Record<string, string | [string, unknown]>;
  borderWidth?: Record<string, string>;
  ringWidth?: Record<string, string>;
  outlineWidth?: Record<string, string>;
  fontWeight?: Record<string, string>;
  fontFamily?: Record<string, string | string[]>;
  opacity?: Record<string, string>;
  zIndex?: Record<string, string>;
  width?: Record<string, string>;
  minWidth?: Record<string, string>;
  maxWidth?: Record<string, string>;
  height?: Record<string, string>;
  minHeight?: Record<string, string>;
  maxHeight?: Record<string, string>;
  plugins?: unknown[];
}
