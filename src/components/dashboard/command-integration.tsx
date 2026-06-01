'use client';

import { useState, useTransition } from 'react';
import {
  generateCommandApiKey,
  revokeApiKey,
  type ApiKeyRow,
} from '@/app/actions/api-keys';

type CommandIntegrationProps = {
  apiKeys: ApiKeyRow[];
  baseUrl: string;
  hasServiceRole: boolean;
};

const fieldClass =
  'h-8 w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 text-xs text-[var(--app-text)] outline-none focus:border-amber-500/50';

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-7 shrink-0 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 text-[11px] font-medium text-[var(--app-text)] transition hover:bg-[var(--app-hover)]"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

function EndpointRow({ method, url }: { method: string; url: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-6 items-center rounded bg-emerald-500/15 px-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
        {method}
      </span>
      <code className="min-w-0 flex-1 truncate rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2 py-1 font-mono text-[11px] text-[var(--app-text)]">
        {url}
      </code>
      <CopyButton value={url} />
    </div>
  );
}

export function CommandIntegration({ apiKeys, baseUrl, hasServiceRole }: CommandIntegrationProps) {
  const [keys, setKeys] = useState(apiKeys);
  const [label, setLabel] = useState('Command Analytics');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const personnelUrl = `${baseUrl}/api/command/personnel`;
  const statsUrl = `${baseUrl}/api/command/stats`;

  function handleGenerate() {
    const formData = new FormData();
    formData.set('label', label);

    startTransition(async () => {
      const result = await generateCommandApiKey(formData);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok && result.rawKey) {
        setNewKey(result.rawKey);
        // Optimistically reflect the new key in the list (prefix only).
        setKeys((prev) => [
          {
            id: crypto.randomUUID(),
            label: label.trim() || 'Command Analytics',
            key_prefix: result.rawKey!.slice(0, 10),
            is_active: true,
            created_at: new Date().toISOString(),
            last_used_at: null,
          },
          ...prev,
        ]);
      }
    });
  }

  function handleRevoke(id: string) {
    const formData = new FormData();
    formData.set('id', id);

    startTransition(async () => {
      const result = await revokeApiKey(formData);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, is_active: false } : k)));
      }
    });
  }

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--app-text)]">Command Integration (API)</h3>
        <p className="mt-1 text-xs text-[var(--app-text-muted)]">
          Read-only API for <code className="font-mono">command.pro4a-1key.com</code> to pull
          personnel data and analytics. Send the key in an{' '}
          <code className="font-mono">Authorization: Bearer &lt;key&gt;</code> header.
        </p>
      </div>

      {!hasServiceRole ? (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
          Set <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> to enable the API.
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
          Endpoints
        </p>
        <EndpointRow method="GET" url={personnelUrl} />
        <EndpointRow method="GET" url={statsUrl} />
      </div>

      <div className="mt-5 border-t border-[var(--app-border)] pt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
          Generate API key
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Key label (e.g. Command Analytics)"
            disabled={!hasServiceRole || isPending}
            className={`${fieldClass} max-w-xs`}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!hasServiceRole || isPending}
            className="inline-flex h-8 shrink-0 items-center rounded-md bg-amber-500 px-4 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? 'Working...' : 'Generate Key'}
          </button>
        </div>

        {newKey ? (
          <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
            <p className="mb-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200">
              Copy this key now — it will not be shown again:
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2 py-1 font-mono text-[11px] text-[var(--app-text)]">
                {newKey}
              </code>
              <CopyButton value={newKey} label="Copy key" />
            </div>
          </div>
        ) : null}

        {message ? (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-xs ${
              message.ok
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                : 'border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        ) : null}
      </div>

      <div className="mt-5 border-t border-[var(--app-border)] pt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
          Active &amp; past keys
        </p>
        {keys.length === 0 ? (
          <p className="text-xs text-[var(--app-text-muted)]">No API keys yet.</p>
        ) : (
          <div className="space-y-1.5">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[var(--app-text)]">
                    {key.label}{' '}
                    <span className="font-mono text-[10px] text-[var(--app-text-muted)]">
                      {key.key_prefix}…
                    </span>
                  </p>
                  <p className="text-[10px] text-[var(--app-text-muted)]">
                    {key.is_active ? (
                      <span className="text-emerald-600 dark:text-emerald-300">Active</span>
                    ) : (
                      <span className="text-red-500 dark:text-red-300">Revoked</span>
                    )}
                    {key.last_used_at
                      ? ` • last used ${new Date(key.last_used_at).toLocaleString()}`
                      : ' • never used'}
                  </p>
                </div>
                {key.is_active ? (
                  <button
                    type="button"
                    onClick={() => handleRevoke(key.id)}
                    disabled={isPending}
                    className="inline-flex h-7 shrink-0 items-center rounded-md border border-red-500/40 px-2.5 text-[11px] font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
