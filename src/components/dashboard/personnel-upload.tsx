'use client';

import { useRef, useState, useTransition } from 'react';
import { uploadPersonnelList, type PersonnelImportResult } from '@/app/actions/personnel-import';
import { PERSONNEL_LIST_FIELDS } from '@/lib/personnel/types';

type PersonnelUploadProps = {
  hasServiceRole: boolean;
};

const EXPECTED_COLUMNS = [...PERSONNEL_LIST_FIELDS];

export function PersonnelUpload({ hasServiceRole }: PersonnelUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [result, setResult] = useState<PersonnelImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload() {
    if (!selectedFile) {
      setResult({ ok: false, message: 'Please select an Excel file first.' });
      return;
    }

    const formData = new FormData();
    formData.set('file', selectedFile);
    formData.set('replace_existing', replaceExisting ? 'true' : 'false');

    startTransition(async () => {
      const response = await uploadPersonnelList(formData);
      setResult(response);

      if (response.ok) {
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
  }

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--app-text)]">Upload Personnel List</h3>
        <p className="mt-1 text-xs text-[var(--app-text-muted)]">
          Import personnel records from an Excel file (.xlsx or .xls) into the database.
        </p>
      </div>

      {!hasServiceRole ? (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
          Set <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in{' '}
          <code className="font-mono">.env.local</code> to enable uploads.
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            disabled={!hasServiceRole || isPending}
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
              setResult(null);
            }}
            className="block max-w-full text-xs text-[var(--app-text-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-950 hover:file:bg-amber-400 disabled:opacity-50"
          />

          <button
            type="button"
            onClick={handleUpload}
            disabled={!hasServiceRole || isPending || !selectedFile}
            className="inline-flex h-8 items-center rounded-md bg-amber-500 px-4 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? 'Uploading...' : 'Upload Personnel List'}
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs text-[var(--app-text-muted)]">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(event) => setReplaceExisting(event.target.checked)}
            disabled={!hasServiceRole || isPending}
            className="rounded border-[var(--app-border)]"
          />
          Replace existing RPRMD personnel list before import
        </label>

        {selectedFile ? (
          <p className="text-xs text-[var(--app-text-muted)]">
            Selected: <span className="text-[var(--app-text)]">{selectedFile.name}</span>
          </p>
        ) : null}

        {result ? (
          <div
            className={`rounded-lg px-3 py-2 text-xs ${
              result.ok
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                : 'border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
            }`}
          >
            {result.message}
          </div>
        ) : null}
      </div>

      <div className="mt-5 border-t border-[var(--app-border)] pt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
          Expected Excel columns
        </p>
        <p className="mb-2 text-xs text-[var(--app-text-muted)]">
          First row should be headers. Required: <strong>fname</strong>, <strong>lname</strong>.
          {' '}
          <strong>rank_name</strong> is auto-generated from rank, fname, mname, lname, and qual.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {EXPECTED_COLUMNS.map((column) => (
            <span
              key={column}
              className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--app-text-muted)]"
            >
              {column}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
