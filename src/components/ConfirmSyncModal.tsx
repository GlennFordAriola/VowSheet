import React, { useState } from 'react';
import { AlertTriangle, FileSpreadsheet, X } from 'lucide-react';
import { ConfirmationAction } from '../types/wedding';

interface ConfirmSyncModalProps {
  action: ConfirmationAction | null;
  onClose: () => void;
}

export const ConfirmSyncModal: React.FC<ConfirmSyncModalProps> = ({
  action,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!action) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await action.onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDanger = action.variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
                isDanger
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {isDanger ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
            </div>
            <h2
              id="confirm-modal-title"
              className="text-base font-semibold text-slate-900"
            >
              {action.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close confirmation dialog"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-slate-600">
            {action.description}
          </p>

          {action.details.length > 0 && (
            <ul className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
              {action.details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-0.5 text-slate-400" aria-hidden="true">
                    •
                  </span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-700 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 whitespace-nowrap shrink-0 disabled:opacity-60 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600'
                : 'bg-emerald-700 hover:bg-emerald-800 focus-visible:outline-emerald-700'
            }`}
          >
            {isSubmitting ? 'Applying...' : action.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
