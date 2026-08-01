export interface TailwindResolver {
  findEquivalent(utility: string, rawValue: string): string | null;
}

export interface ThemeConfig {
  theme?: ThemeConfig;
  extend?: ThemeConfig;
  spacing?: Record<string, string>;
  colors?: Record<string, string>;
  borderRadius?: Record<string, string>;
  fontSize?: Record<string, string>;
  width?: Record<string, string>;
  minWidth?: Record<string, string>;
  maxWidth?: Record<string, string>;
  height?: Record<string, string>;
  minHeight?: Record<string, string>;
  maxHeight?: Record<string, string>;
  plugins?: unknown[];
}
