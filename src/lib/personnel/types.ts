export type PersonnelRecord = {
  id: number;
  rank: string | null;
  fname: string;
  mname: string | null;
  lname: string;
  qual: string | null;
  rank_name: string | null;
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
  created_at: string;
  updated_at: string;
};

export type PersonnelFormInput = {
  rank: string;
  fname: string;
  mname: string;
  lname: string;
  qual: string;
  designation: string;
  badge_number: string;
  office: string;
  station: string;
  birthdate: string;
  status: string;
  disposition: string;
  remarks: string;
  gender: string;
  email: string;
  phone_number: string;
};

export const PERSONNEL_LIST_FIELDS = [
  'rank',
  'fname',
  'mname',
  'lname',
  'qual',
  'rank_name',
  'designation',
  'badge_number',
  'office',
  'station',
  'birthdate',
  'status',
  'disposition',
  'remarks',
  'gender',
  'email',
  'phone_number',
] as const;
