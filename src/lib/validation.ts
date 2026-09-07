// Shared validation helpers used across the registration and
// customization forms, so "numbers only", IP/MAC format, and phone
// format are all checked the same way everywhere instead of each page
// reinventing (or forgetting) its own rule.

export const IPV4_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

export const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

// Loose RFC-1123-style hostname: dot-separated labels of letters,
// digits and hyphens, each 1-63 chars, never starting or ending with
// a hyphen. Blocks spaces, underscores and other stray characters
// without being strict about site-specific naming conventions.
export const HOSTNAME_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;

// String forms (no ^/$ — the HTML pattern attribute anchors the whole
// value automatically) for use as <input pattern="..."> hints.
export const IPV4_PATTERN = IPV4_REGEX.source.slice(1, -1);
export const MAC_PATTERN = MAC_REGEX.source.slice(1, -1);
export const HOSTNAME_PATTERN = HOSTNAME_REGEX.source.slice(1, -1);

// Deliberately permissive — accepts spaces, dashes, parens and an
// optional leading + for a country code, since registered devices and
// staff phone numbers show up in several local formats.
export const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Requires an http/https scheme so it can't be confused with a bare
// hostname or file path — used for the "URL" custom field type.
export const URL_REGEX = /^https?:\/\/[^\s]+\.[^\s]+$/i;

export function isValidUrl(value: string): boolean {
  return URL_REGEX.test(value.trim());
}

export function isValidIPv4(value: string): boolean {
  return IPV4_REGEX.test(value.trim());
}

export function isValidMac(value: string): boolean {
  return MAC_REGEX.test(value.trim());
}

export function isValidHostname(value: string): boolean {
  return HOSTNAME_REGEX.test(value.trim());
}

// Employee / person name - must start with a letter and otherwise
// hold only letters (incl. accented), spaces, apostrophes, hyphens
// and periods, so a value like "12345" or "-" can't pass as a "valid"
// owner selection.
export const EMPLOYEE_NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'.\- ]{1,79}$/;

export function isValidEmployeeName(value: string): boolean {
  return EMPLOYEE_NAME_REGEX.test(value.trim());
}

// Loose format for patch-panel labels and switch port/interface
// numbers: must start with a letter or digit, then any mix of
// letters, digits, spaces and the separators these labels commonly
// use (e.g. "Gi1/0/24", "PP-3F-A12") - just enough to reject garbage
// input without being strict about site-specific naming schemes.
export const PORT_LABEL_REGEX = /^[A-Za-z0-9][A-Za-z0-9 /.:#_-]{0,39}$/;
export const PORT_LABEL_PATTERN = PORT_LABEL_REGEX.source.slice(1, -1);

export function isValidPortLabel(value: string): boolean {
  return PORT_LABEL_REGEX.test(value.trim());
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
