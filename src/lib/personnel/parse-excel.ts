import * as XLSX from 'xlsx';

export type PersonnelImportRow = {
  rank: string | null;
  fname: string;
  mname: string | null;
  lname: string;
  qual: string | null;
  designation: string | null;
  badge_number: string | null;
  office: string | null;
  station: string | null;
  birthdate: string | null;
  status: string;
  disposition: string | null;
  remarks: string | null;
  gender: string | null;
  email: string | null;
  phone_number: string | null;
};

type ImportField = keyof PersonnelImportRow;

const HEADER_ALIASES: Record<string, ImportField> = {
  rank: 'rank',
  fname: 'fname',
  first_name: 'fname',
  firstname: 'fname',
  first: 'fname',
  mname: 'mname',
  middle_name: 'mname',
  middlename: 'mname',
  middle: 'mname',
  lname: 'lname',
  last_name: 'lname',
  lastname: 'lname',
  last: 'lname',
  qual: 'qual',
  qualification: 'qual',
  badge_number: 'badge_number',
  badge: 'badge_number',
  badge_no: 'badge_number',
  badge_num: 'badge_number',
  badgenumber: 'badge_number',
  designation: 'designation',
  office: 'office',
  station: 'station',
  unit: 'station',
  birthdate: 'birthdate',
  birth_date: 'birthdate',
  dob: 'birthdate',
  date_of_birth: 'birthdate',
  status: 'status',
  disposition: 'disposition',
  remarks: 'remarks',
  gender: 'gender',
  sex: 'gender',
  email: 'email',
  email_address: 'email',
  phone_number: 'phone_number',
  phone: 'phone_number',
  contact_number: 'phone_number',
  mobile: 'phone_number',
};

const IGNORED_HEADERS = new Set([
  'rank_name',
  'rankname',
  'division_code',
  'division',
  'directorate',
]);

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function cellToString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return String(value).trim() || null;
}

function parseBirthdate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (parsed) {
      const month = String(parsed.m).padStart(2, '0');
      const day = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${month}-${day}`;
    }
  }

  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return isoMatch[0];
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    return `${slashMatch[3]}-${month}-${day}`;
  }

  return text || null;
}

function mapRecord(record: Record<string, unknown>): {
  row: PersonnelImportRow | null;
  error: string | null;
} {
  const mapped: Partial<PersonnelImportRow> = {
    status: 'Active',
  };

  for (const [key, value] of Object.entries(record)) {
    const normalized = normalizeHeader(key);

    if (IGNORED_HEADERS.has(normalized)) {
      continue;
    }

    const field = HEADER_ALIASES[normalized];

    if (!field) {
      continue;
    }

    if (field === 'birthdate') {
      mapped.birthdate = parseBirthdate(value);
      continue;
    }

    if (field === 'fname' || field === 'lname' || field === 'status') {
      mapped[field] = cellToString(value) ?? '';
      continue;
    }

    mapped[field] = cellToString(value);
  }

  const fname = (mapped.fname ?? '').trim();
  const lname = (mapped.lname ?? '').trim();

  if (!fname && !lname) {
    return { row: null, error: null };
  }

  if (!fname || !lname) {
    return { row: null, error: 'First name and last name are required.' };
  }

  return {
    row: {
      rank: mapped.rank ?? null,
      fname,
      mname: mapped.mname ?? null,
      lname,
      qual: mapped.qual ?? null,
      designation: mapped.designation ?? null,
      badge_number: mapped.badge_number ?? null,
      office: mapped.office ?? null,
      station: mapped.station ?? null,
      birthdate: mapped.birthdate ?? null,
      status: mapped.status?.trim() || 'Active',
      disposition: mapped.disposition ?? null,
      remarks: mapped.remarks ?? null,
      gender: mapped.gender ?? null,
      email: mapped.email ?? null,
      phone_number: mapped.phone_number ?? null,
    },
    error: null,
  };
}

export function parsePersonnelExcel(buffer: ArrayBuffer): {
  rows: PersonnelImportRow[];
  errors: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return { rows: [], errors: ['No worksheet found in the Excel file.'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  if (rawRows.length === 0) {
    return { rows: [], errors: ['The Excel file has no data rows.'] };
  }

  const rows: PersonnelImportRow[] = [];
  const errors: string[] = [];

  rawRows.forEach((record, index) => {
    const { row, error } = mapRecord(record);

    if (error) {
      errors.push(`Row ${index + 2}: ${error}`);
      return;
    }

    if (row) {
      rows.push(row);
    }
  });

  return { rows, errors };
}
