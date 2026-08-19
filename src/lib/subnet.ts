import { IPSubnet } from './supabase';

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
    if (trimmed.startsWith(prefix) && (!best || prefix.length > best.prefix.trim().length)) {
      best = s;
    }
  }
  return best;
}
