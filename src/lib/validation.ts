// Shared validation helpers used across the registration and
// customization forms, so "numbers only", IP/MAC format, and phone
// format are all checked the same way everywhere instead of each page
// reinventing (or forgetting) its own rule.

export const IPV4_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

export const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

// String forms (no ^/$ — the HTML pattern attribute anchors the whole
// value automatically) for use as <input pattern="..."> hints.
export const IPV4_PATTERN = IPV4_REGEX.source.slice(1, -1);
export const MAC_PATTERN = MAC_REGEX.source.slice(1, -1);

// Deliberately permissive — accepts spaces, dashes, parens and an
// optional leading + for a country code, since registered devices and
// staff phone numbers show up in several local formats.
export const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidIPv4(value: string): boolean {
  return IPV4_REGEX.test(value.trim());
}

export function isValidMac(value: string): boolean {
  return MAC_REGEX.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(value.trim());
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidPort(value: string): boolean {
  if (!/^\d+$/.test(value.trim())) return false;
  const n = Number(value);
  return n >= 1 && n <= 65535;
}

// A partial IP prefix like "10.6.13." (matched with startsWith against
// a full IP) — looser than a full IPv4 address, but still restricted to
// digits and dots so it can't hold garbage.
export const IP_PREFIX_REGEX = /^\d{1,3}(\.\d{1,3}){0,3}\.?$/;

export function isValidIPPrefix(value: string): boolean {
  return IP_PREFIX_REGEX.test(value.trim());
}

export function digitsAndDotsKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  if (allowed.includes(e.key)) return;
  if (!/^[\d.]$/.test(e.key)) e.preventDefault();
}

// Keystroke guard for plain-text inputs that should only ever hold
// digits (e.g. a rack number or a port count). Lets through control
// keys (backspace, delete, tab, arrows, home/end) and any Ctrl/Cmd
// combo (copy/paste/select-all), blocks everything else that isn't
// 0-9.
export function digitsOnlyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  if (allowed.includes(e.key)) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
}

// Strips anything that isn't a digit — used as a paste guard / onChange
// sanitizer so a pasted non-numeric string can't sneak a numbers-only
// field into an invalid state.
export function sanitizeDigits(value: string): string {
  return value.replace(/[^\d]/g, '');
}
