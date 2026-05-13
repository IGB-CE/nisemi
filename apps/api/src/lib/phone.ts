import { z } from 'zod';

const AL_MOBILE = /^6[7-9]\d{7}$/;

export function normalizeAlbanianMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/[\s\-.()]/g, '');
  let n: string;
  if (digits.startsWith('+355')) n = digits.slice(4);
  else if (digits.startsWith('00355')) n = digits.slice(5);
  else if (digits.startsWith('355')) n = digits.slice(3);
  else if (digits.startsWith('0')) n = digits.slice(1);
  else if (digits.startsWith('+')) return null;
  else n = digits;
  if (!AL_MOBILE.test(n)) return null;
  return `+355${n}`;
}

export function isValidAlbanianMobile(input: string | null | undefined): boolean {
  return normalizeAlbanianMobile(input) !== null;
}

export const albanianMobileSchema = z.string().transform((v, ctx) => {
  const normalized = normalizeAlbanianMobile(v);
  if (!normalized) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Numri i telefonit nuk është i vlefshëm' });
    return z.NEVER;
  }
  return normalized;
});
