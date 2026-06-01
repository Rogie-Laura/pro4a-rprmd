export function normalizeBadgeNumber(rawBadgeNumber: string): string {
  return rawBadgeNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
