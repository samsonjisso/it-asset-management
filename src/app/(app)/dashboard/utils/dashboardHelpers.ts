/**
 * Returns the number of whole days between now and the given date.
 * Positive = in the future, negative = in the past.
 */
export function daysUntil(dateString: string): number {
  return Math.ceil(
    (new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
}

/**
 * Tallies items in an array by a key derived from each item.
 * Example: countBy(devices, (d) => d.device_type)
 */
export function countBy<T>(
  items: T[],
  keyFn: (item: T) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * Safely computes a percentage, avoiding division by zero.
 */
export function safePercent(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}
