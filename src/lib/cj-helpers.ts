export function normalizeLogisticName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function parseFreightLogisticNames(data: unknown): string[] | null {
  const rows = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        Array.isArray((data as { list?: unknown }).list)
      ? (data as { list: unknown[] }).list
      : null;
  if (!rows) return null;

  const names: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const name = (row as { logisticName?: unknown }).logisticName;
    if (typeof name === 'string' && name.trim()) names.push(name.trim());
  }
  return names;
}

export function resolveLogisticName(
  available: string[],
  requested: string,
): string | null {
  const target = normalizeLogisticName(requested);
  if (!target) return null;
  return (
    available.find((name) => normalizeLogisticName(name) === target) ?? null
  );
}

export function storeOrderTimeSeconds(createdAt: string, now = Date.now()): number {
  const parsed = Date.parse(createdAt);
  const safe = Number.isFinite(parsed) ? Math.min(parsed, now) : now;
  return Math.floor(safe / 1000);
}

export function isCjProductionLocked(
  sandboxFlag: string | null | undefined,
  productionFlag: string | null | undefined,
): boolean {
  const sandbox = sandboxFlag?.trim().toLowerCase() !== 'false';
  const productionEnabled = productionFlag?.trim().toLowerCase() === 'true';
  return !sandbox && !productionEnabled;
}

export function mapCjOrderStatus(
  status: string | null | undefined,
): 'shipped' | 'delivered' | null {
  if (status === 'DELIVERED') return 'delivered';
  if (status === 'SHIPPED') return 'shipped';
  return null;
}
