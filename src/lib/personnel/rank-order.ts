/** Highest rank first — used for Highest → Lowest sort */
const RANK_ORDER_HIGH_TO_LOW = [
  'PBGEN',
  'PCOL',
  'PLTCOL',
  'PMAJ',
  'PCPT',
  'PLT',
  'PEMS',
  'PCSGT',
  'PSMS',
  'PMSG',
  'PSSG',
  'PCPL',
  'PAT',
  'NUP',
] as const;

/** Lowest rank first — used for Lowest → Highest sort */
const RANK_ORDER_LOW_TO_HIGH = [
  'PAT',
  'PCPL',
  'PSSG',
  'PMSG',
  'PSMS',
  'PCSGT',
  'PEMS',
  'PLT',
  'PCPT',
  'PMAJ',
  'PLTCOL',
  'PCOL',
  'PBGEN',
  'NUP',
] as const;

type RankCode = (typeof RANK_ORDER_LOW_TO_HIGH)[number];

const RANK_ALIASES: Record<string, RankCode> = {
  PAT: 'PAT',
  PATROLMAN: 'PAT',
  PATROLWOMAN: 'PAT',
  PCPL: 'PCPL',
  CORPORAL: 'PCPL',
  PSSG: 'PSSG',
  STAFFSERGEANT: 'PSSG',
  PMSG: 'PMSG',
  MASTERSERGEANT: 'PMSG',
  PSMS: 'PSMS',
  PCSGT: 'PCSGT',
  PCMS: 'PCSGT',
  CHIEFSERGEANT: 'PCSGT',
  PEMS: 'PEMS',
  PLT: 'PLT',
  PLIEUT: 'PLT',
  LIEUTENANT: 'PLT',
  PCPT: 'PCPT',
  CAPTAIN: 'PCPT',
  PMAJ: 'PMAJ',
  MAJOR: 'PMAJ',
  PLTCOL: 'PLTCOL',
  LTCOL: 'PLTCOL',
  PCOL: 'PCOL',
  COLONEL: 'PCOL',
  PBGEN: 'PBGEN',
  BRIGGEN: 'PBGEN',
  NUP: 'NUP',
  NONUNIFORMED: 'NUP',
  NONUNIFORMEDPERSONNEL: 'NUP',
};

function normalizeRankKey(raw: string | null | undefined): RankCode | '' {
  if (!raw) {
    return '';
  }

  const compact = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  return RANK_ALIASES[compact] ?? '';
}

function getRankIndex(
  rank: string | null | undefined,
  rankName: string | null | undefined,
  order: readonly RankCode[]
): number {
  const fromRank = normalizeRankKey(rank);
  if (fromRank) {
    const index = order.indexOf(fromRank);
    if (index >= 0) {
      return index;
    }
  }

  if (rankName) {
    const firstToken = rankName.trim().split(/\s+/)[0] ?? '';
    const fromName = normalizeRankKey(firstToken);
    if (fromName) {
      const index = order.indexOf(fromName);
      if (index >= 0) {
        return index;
      }
    }
  }

  return 999;
}

export function compareByRank(
  a: { rank: string | null; rank_name: string | null; lname: string },
  b: { rank: string | null; rank_name: string | null; lname: string },
  direction: 'asc' | 'desc'
): number {
  const order = direction === 'asc' ? RANK_ORDER_LOW_TO_HIGH : RANK_ORDER_HIGH_TO_LOW;
  const aIndex = getRankIndex(a.rank, a.rank_name, order);
  const bIndex = getRankIndex(b.rank, b.rank_name, order);

  if (aIndex !== bIndex) {
    return aIndex - bIndex;
  }

  return (a.rank_name ?? a.lname).localeCompare(b.rank_name ?? b.lname, undefined, {
    sensitivity: 'base',
  });
}
