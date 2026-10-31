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
  let trimmed = raw.trim();
  if (!trimmed) return null;

  let important = false;
  if (trimmed.startsWith('!')) {
    important = true;
    trimmed = trimmed.slice(1);
  }

  const parts = splitVariants(trimmed);
  if (parts.length === 0) return null;

  const rawVariants = parts.slice(0, parts.length - 1);
  const variants = rawVariants.map((v) => {
    if (v.startsWith('!')) {
      important = true;
      return v.slice(1);
    }
    return v;
  });

  let body = parts[parts.length - 1];

  if (body.startsWith('!')) {
    important = true;
    body = body.slice(1);
  } else if (body.endsWith('!')) {
    important = true;
    body = body.slice(0, -1);
  }

  // Arbitrary property syntax: e.g. [color:red], [mask-type:luminance], [--custom-var:10px]
  if (body.startsWith('[') && body.endsWith(']') && body.includes(':')) {
    const value = body.slice(1, -1);
    return {
      raw: trimmed,
      variants,
      utility: body,
      value,
      important,
      isArbitrary: true,
    };
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

  // Standard utility with dash: e.g. h-10, p-4, bg-white, text-base, rounded-lg, w-1/2, -translate-x-1/2
  const standardDashMatch = body.match(/^([a-z0-9-]+)-([a-z0-9-./]+)$/i);
  if (standardDashMatch) {
    const utility = standardDashMatch[1];
    let val = standardDashMatch[2];
    let modifier: string | undefined;

    // Detect modifier suffix (e.g. /50, /75) if not a fraction utility like w-1/2
    const fractionalPrefixes = new Set([
      'w',
      'h',
      'min-w',
      'max-w',
      'min-h',
      'max-h',
      'inset',
      'inset-x',
      'inset-y',
      'top',
      'bottom',
      'left',
      'right',
      'translate-x',
      'translate-y',
      '-translate-x',
      '-translate-y',
      'aspect',
      'basis',
      'col-span',
      'row-span',
    ]);

    if (!fractionalPrefixes.has(utility) && !fractionalPrefixes.has(utility.replace(/^-/, ''))) {
      const slashIndex = val.lastIndexOf('/');
      if (slashIndex > 0) {
        modifier = val.slice(slashIndex);
        val = val.slice(0, slashIndex);
      }
    }

    return {
      raw: trimmed,
      variants,
      utility,
      value: val,
      important,
      isArbitrary: false,
      modifier,
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
