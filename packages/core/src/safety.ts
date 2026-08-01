export function isSafeValue(value: string): boolean {
  if (!value) return false;

  // Disallow calc(), var(), env(), clamp(), min(), max(), or dynamic functions
  if (/calc\s*\(/i.test(value)) return false;
  if (/var\s*\(/i.test(value)) return false;
  if (/env\s*\(/i.test(value)) return false;
  if (/(clamp|min|max)\s*\(/i.test(value)) return false;
  if (value.includes('${')) return false;

  return true;
}
