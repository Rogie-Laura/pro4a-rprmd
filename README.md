# PRO4A RPRMD Entry App (Division R1)

Next.js app for **RPRMD** personnel data entry. Data in **Supabase**.

## Login table: `users`

| Field | Notes |
|-------|-------|
| id | Auto UUID |
| rank | e.g. PSSg |
| full_name | Required |
| rank_fullname | Auto: rank + full_name |
| badge_number | Unique — used for login |
| office | e.g. PRO4A |
| unit | e.g. RICTMD |
| password | Bcrypt hashed |
| role | super_admin, RPRMD_admin, rhq_admin, phq_admin, stn_admin |
| session | Active session token |

Login: **badge number + password**

## Roles

| Role | Access |
|------|--------|
| **super_admin** | Full user management, all roles |
| **RPRMD_admin** | Manage stn_admin users, personnel data |
| **rhq_admin / phq_admin / stn_admin** | App access, personnel data |

## Setup

1. Run SQL in Supabase (in order):
   - `sql/003_users_table.sql` — creates `users` table + your account
   - `sql/004_login_rpc.sql` — connects login to `users` table

2. `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. `npm run dev` → http://localhost:3000

## Bootstrap user (included in 003_users_table.sql)

| Field | Value |
|-------|-------|
| Rank | PSSg |
| Full Name | Rogie J Laura |
| Badge | 226609 |
| Office | PRO4A |
| Unit | RICTMD |
| Password | 111111 |
| Role | super_admin |

After running SQL, login with badge **226609** / password **111111**.

Add more users via Dashboard → **Manage Users**.
