'use client';

import { useEffect, type ReactNode } from 'react';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** When false, clicking the backdrop does not close the modal. Default: false */
  closeOnBackdrop?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg';
};

const maxWidthClass = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  title,
  onClose,
  children,
  footer,
  closeOnBackdrop = false,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={closeOnBackdrop ? onClose : undefined}
        tabIndex={closeOnBackdrop ? 0 : -1}
      />

      <div
        className={`relative z-10 flex max-h-[90vh] w-full ${maxWidthClass[maxWidth]} flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-popover)] shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[var(--app-border)] px-5 py-4">
          <h3 id="modal-title" className="text-sm font-semibold text-[var(--app-text)]">
            {title}
          </h3>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-[var(--app-border)] px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
