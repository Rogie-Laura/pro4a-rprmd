'use server';

import { revalidatePath } from 'next/cache';
import { DATA_TABLE } from '@/lib/auth/roles';
import { getSessionUser } from '@/lib/auth/session';
import { parsePersonnelExcel } from '@/lib/personnel/parse-excel';
import { createAdminClient, hasAdminClient } from '@/lib/supabase/admin';

export type PersonnelImportResult = {
  ok: boolean;
  message: string;
  imported?: number;
  skipped?: number;
};

const BATCH_SIZE = 200;

async function requireSuperAdmin() {
  const session = await getSessionUser();

  if (!session.userId || !session.user?.is_active || session.user.role !== 'super_admin') {
    throw new Error('You do not have permission to access system settings.');
  }

  return session;
}

export async function uploadPersonnelList(formData: FormData): Promise<PersonnelImportResult> {
  try {
    await requireSuperAdmin();

    if (!hasAdminClient()) {
      return {
        ok: false,
        message: 'SUPABASE_SERVICE_ROLE_KEY is not configured in .env.local.',
      };
    }

    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: 'Please select an Excel file to upload.' };
    }

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'xlsx' && extension !== 'xls') {
      return { ok: false, message: 'Only .xlsx or .xls files are supported.' };
    }

    const replaceExisting = formData.get('replace_existing') !== 'false';
    const buffer = await file.arrayBuffer();
    const { rows, errors } = parsePersonnelExcel(buffer);

    if (rows.length === 0) {
      const detail = errors.length > 0 ? ` ${errors.slice(0, 3).join(' ')}` : '';
      return { ok: false, message: `No valid personnel rows found in the file.${detail}` };
    }

    const admin = createAdminClient();

    if (replaceExisting) {
      const { error: deleteError } = await admin.from(DATA_TABLE).delete().gte('id', 0);

      if (deleteError) {
        return {
          ok: false,
          message: `Failed to clear existing records: ${deleteError.message}`,
        };
      }
    }

    let imported = 0;

    for (let index = 0; index < rows.length; index += BATCH_SIZE) {
      const batch = rows.slice(index, index + BATCH_SIZE);
      const { error } = await admin.from(DATA_TABLE).insert(batch);

      if (error) {
        return {
          ok: false,
          message: `Import stopped at row ${index + 1}: ${error.message}. ${imported} row(s) were saved before the error.`,
          imported,
        };
      }

      imported += batch.length;
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings');

    const warning =
      errors.length > 0 ? ` ${errors.length} row(s) were skipped due to validation errors.` : '';

    return {
      ok: true,
      message: `Successfully imported ${imported} personnel record(s).${
        replaceExisting ? ' Previous RPRMD list was replaced.' : ''
      }${warning}`,
      imported,
      skipped: errors.length,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Upload failed.',
    };
  }
}
