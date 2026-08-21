const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

export function isValidIPv4(value: string): boolean {
  return IPV4_RE.test(value.trim());
}

export function normalizeIp(value: string): string {
  return value.trim();
}
