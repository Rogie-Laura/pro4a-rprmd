export const ACCESS_PAGES = ['RPRMD', 'RLRDD', 'BOTH'] as const;

export type AccessPage = (typeof ACCESS_PAGES)[number];

export const ACCESS_PAGE_LABELS: Record<AccessPage, string> = {
  RPRMD: 'RPRMD only',
  RLRDD: 'RLRDD only',
  BOTH: 'RPRMD & RLRDD',
};

export function isAccessPage(value: string | null | undefined): value is AccessPage {
  return !!value && ACCESS_PAGES.includes(value as AccessPage);
}

export function canSignInToRprmd(accessPage: string | null | undefined): boolean {
  return accessPage === 'RPRMD' || accessPage === 'BOTH';
}

export function canSignInToRlrdd(accessPage: string | null | undefined): boolean {
  return accessPage === 'RLRDD' || accessPage === 'BOTH';
}

export function assignableAccessPages(actorRole: string | null | undefined): AccessPage[] {
  if (actorRole === 'super_admin') {
    return [...ACCESS_PAGES];
  }

  if (actorRole === 'RPRMD_admin') {
    return ['RPRMD'];
  }

  return [];
}
