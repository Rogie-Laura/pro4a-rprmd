'use client';

import { useEffect } from 'react';

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  isPending = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isPending) {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel, isPending]);

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-500'
      : 'bg-amber-500 text-slate-950 hover:bg-amber-400';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <button
        type="button"
        aria-label="Close confirmation"
        className="absolute inset-0 bg-black/70"
        onClick={isPending ? undefined : onCancel}
        tabIndex={-1}
      />

      <div
        className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--app-border)] bg-[var(--app-popover)] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h4 id="confirm-title" className="text-sm font-semibold text-[var(--app-text)]">
          {title}
        </h4>
        <p id="confirm-message" className="mt-2 text-xs leading-relaxed text-[var(--app-text-muted)]">
          {message}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex h-8 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 text-xs font-medium text-[var(--app-text)] transition hover:bg-[var(--app-hover)] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex h-8 items-center rounded-md px-4 text-xs font-semibold transition disabled:opacity-50 ${confirmClass}`}
          >
            {isPending ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
