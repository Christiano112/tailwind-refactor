export interface ThemeMigrationInput {
  spacing?: Record<string, string>;
  colors?: Record<string, string>;
  borderRadius?: Record<string, string>;
  fontSize?: Record<string, string>;
}

export function generateV4ThemeCss(input: ThemeMigrationInput): string {
  const lines: string[] = ['@theme {'];

  if (input.spacing) {
    for (const [key, val] of Object.entries(input.spacing)) {
      lines.push(`  --spacing-${key}: ${val};`);
    }
  }

  if (input.colors) {
    for (const [key, val] of Object.entries(input.colors)) {
      lines.push(`  --color-${key}: ${val};`);
    }
  }

  if (input.borderRadius) {
    for (const [key, val] of Object.entries(input.borderRadius)) {
      lines.push(`  --radius-${key}: ${val};`);
    }
  }

  if (input.fontSize) {
    for (const [key, val] of Object.entries(input.fontSize)) {
      lines.push(`  --text-${key}: ${val};`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}
