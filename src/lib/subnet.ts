import { IPSubnet } from "./supabase";

// Finds the best-matching subnet definition for an IP address, e.g. a
// subnet defined as prefix "10.6.13." matches IP "10.6.13.45". When more
// than one defined prefix matches, the longest (most specific) one wins.
export function matchSubnet(ip: string, subnets: IPSubnet[]): IPSubnet | null {
  const trimmed = ip.trim();
  if (!trimmed) return null;
  let best: IPSubnet | null = null;
  for (const s of subnets) {
    const prefix = s.prefix.trim();
    if (!prefix) continue;
    if (
      trimmed.startsWith(prefix) &&
      (!best || prefix.length > best.prefix.trim().length)
    ) {
      best = s;
    }
  }
  return best;
}

// A defined subnet prefix like "10.6.13." holds exactly three octets -
// that's the shape the IP Availability Board can enumerate in full (a
// /24, 256 addresses). Broader prefixes (e.g. "10.6.") describe more
// addresses than a board can usefully show, so the board only lights up
// for the three-octet shape.
export function isEnumerableSubnet(prefix: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.?$/.test(prefix.trim());
}

// Every address in the /24 described by a three-octet prefix, e.g.
// "10.6.13." -> ["10.6.13.0", "10.6.13.1", ..., "10.6.13.255"].
export function enumerateSubnetIps(prefix: string): string[] {
  const base = prefix.trim().replace(/\.$/, "");
  const ips: string[] = [];
  for (let octet = 0; octet <= 255; octet++) {
    ips.push(`${base}.${octet}`);
  }
  return ips;
}
