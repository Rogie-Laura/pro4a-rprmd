export const BADGE_LOGIN_DOMAIN = 'pro4a.local';

export function normalizeBadgeNumber(rawBadgeNumber: string): string {
  return rawBadgeNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function badgeNumberToEmail(badgeNumber: string): string {
  return `${normalizeBadgeNumber(badgeNumber)}@${BADGE_LOGIN_DOMAIN}`;
}

export function emailToBadgeNumber(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  const [localPart, domain] = email.split('@');

  if (domain !== BADGE_LOGIN_DOMAIN || !localPart) {
    return null;
  }

  return normalizeBadgeNumber(localPart);
}
