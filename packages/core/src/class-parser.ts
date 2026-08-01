import type { TailwindClass } from './types.js';

/**
 * Splits class string by colons, respecting brackets `[...]` for arbitrary values.
 */
function splitVariants(classStr: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inBracket = 0;

  for (let i = 0; i < classStr.length; i++) {
    const char = classStr[i];
    if (char === '[') {
      inBracket++;
      current += char;
    } else if (char === ']') {
      if (inBracket > 0) inBracket--;
      current += char;
    } else if (char === ':' && inBracket === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current) {
    parts.push(current);
  }

  return parts;
}

export function isSafeValue(val: string): boolean {
  return !val.includes('$');
}

export function parseTailwindClass(raw: string): TailwindClass | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parts = splitVariants(trimmed);
  if (parts.length === 0) return null;

  const variants = parts.slice(0, parts.length - 1);
  let body = parts[parts.length - 1];

  let important = false;
  if (body.startsWith('!')) {
    important = true;
    body = body.slice(1);
  } else if (body.endsWith('!')) {
    important = true;
    body = body.slice(0, -1);
  }

  // Bracket parsing for arbitrary values (e.g. h-[40px], bg-[#1a8cff], bg-[#1A8CFF]/5, text-[#dc3545]/25)
  const bracketIndex = body.indexOf('[');
  const lastBracketIndex = body.lastIndexOf(']');
  if (bracketIndex > 0 && lastBracketIndex > bracketIndex) {
    const hasDash = body[bracketIndex - 1] === '-';
    const utility = hasDash ? body.slice(0, bracketIndex - 1) : body.slice(0, bracketIndex);
    const value = body.slice(bracketIndex + 1, lastBracketIndex);
    const modifier = body.slice(lastBracketIndex + 1) || undefined;
    return {
      raw: trimmed,
      variants,
      utility,
      value,
      important,
      isArbitrary: true,
      modifier,
    };
  }

  // Standalone negative arbitrary value: e.g. -[10px]
  if (body.startsWith('-[') && body.endsWith(']')) {
    const value = body.slice(2, body.length - 1);
    return {
      raw: trimmed,
      variants,
      utility: '',
      value: `-${value}`,
      important,
      isArbitrary: true,
    };
  }

  // Standard utility with dash: e.g. h-10, p-4, bg-white, text-base, rounded-lg
  const standardDashMatch = body.match(/^([a-z0-9-]+)-([a-z0-9-.]+)$/i);
  if (standardDashMatch) {
    return {
      raw: trimmed,
      variants,
      utility: standardDashMatch[1],
      value: standardDashMatch[2],
      important,
      isArbitrary: false,
    };
  }

  // Single word utility without dash value: e.g. flex, block, rounded, hidden
  return {
    raw: trimmed,
    variants,
    utility: body,
    value: undefined,
    important,
    isArbitrary: false,
  };
}
