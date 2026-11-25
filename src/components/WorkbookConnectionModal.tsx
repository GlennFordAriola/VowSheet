import React, { useState } from 'react';
import { FilePlus2, Link2, X } from 'lucide-react';
import { extractSpreadsheetId } from '../lib/sheetsApi';
import { SavedSpreadsheetRef } from '../types/wedding';
import { GoogleSignInButton } from './GoogleSignInButton';

interface WorkbookConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onSignIn: () => Promise<void>;
  onCreateNew: (title: string, useStarterTemplate: boolean) => Promise<void>;
  onConnectExisting: (spreadsheetId: string) => Promise<void>;
  recentSheets: SavedSpreadsheetRef[];
}

export const WorkbookConnectionModal: React.FC<WorkbookConnectionModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  onSignIn,
  onCreateNew,
  onConnectExisting,
  recentSheets,
}) => {
  const [mode, setMode] = useState<'create' | 'connect'>('create');
  const [newTitle, setNewTitle] = useState('Wedding Planner Workbook');
  const [useStarterTemplate, setUseStarterTemplate] = useState(true);
  const [sheetInput, setSheetInput] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newTitle.trim()) {
      setError('Enter a name for your Google Sheet.');
      return;
    }
    setIsWorking(true);
    try {
      await onCreateNew(newTitle.trim(), useStarterTemplate);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to create Google Sheet.'
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = extractSpreadsheetId(sheetInput);
    if (!id) {
      setError(
        'Paste a valid Google Sheets URL (docs.google.com/spreadsheets/d/...) or Spreadsheet ID.'
      );
      return;
    }
    setIsWorking(true);
    try {
      await onConnectExisting(id);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to open that Google Sheet. Check sharing permissions.'
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleOpenRecent = async (spreadsheetId: string) => {
    setError(null);
    setIsWorking(true);
    try {
      await onConnectExisting(spreadsheetId);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to load spreadsheet.'
      );
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workbook-modal-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2
            id="workbook-modal-title"
            className="text-base font-semibold text-slate-900"
          >
            Connect Google Sheets Workbook
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isWorking}
            aria-label="Close modal"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm leading-relaxed text-slate-600">
              Sign in with your Google account to create a new 3-tab Wedding
              Planner spreadsheet or connect an existing Google Sheet.
            </p>
            <div className="pt-1">
              <GoogleSignInButton
                onClick={onSignIn}
                label="Sign in with Google to Connect Sheets"
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-5">
            <div className="mb-5 flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('create');
                  setError(null);
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'create'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                Create New Sheet
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('connect');
                  setError(null);
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'connect'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Open Existing Sheet
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            {mode === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label
                    htmlFor="sheet-title"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    Spreadsheet Title
                  </label>
                  <input
                    id="sheet-title"
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Elena & Marcus Wedding 2027"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={useStarterTemplate}
                    onChange={(e) => setUseStarterTemplate(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                  />
                  <span className="text-xs leading-relaxed text-slate-700">
                    <span className="block font-medium text-slate-900">
                      Include starter wedding template rows
                    </span>
                    Creates three formatted tabs (Budget, Guest List, Vendors)
                    with formulas and sample line items you can customize.
                  </span>
                </label>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isWorking}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isWorking}
                    className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    {isWorking ? 'Creating Sheet...' : 'Create in Google Sheets'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label
                    htmlFor="sheet-url"
                    className="mb-1.5 block text-xs font-medium text-slate-700"
                  >
                    Google Sheets URL or Spreadsheet ID
                  </label>
                  <input
                    id="sheet-url"
                    type="text"
                    value={sheetInput}
                    onChange={(e) => setSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    The app inspects your existing tab names automatically and
                    never assumes a hardcoded tab name.
                  </p>
                </div>

                {recentSheets.length > 0 && (
                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <div className="text-xs font-medium text-slate-700">
                      Recently Linked Workbooks
                    </div>
                    <div className="max-h-36 space-y-1.5 overflow-y-auto">
                      {recentSheets.map((item) => (
                        <button
                          key={item.spreadsheetId}
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleOpenRecent(item.spreadsheetId)}
                          className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs transition-colors hover:border-slate-300 hover:bg-slate-100"
                        >
                          <span className="truncate font-medium text-slate-900">
                            {item.title}
                          </span>
                          <span className="ml-3 shrink-0 font-mono text-[11px] text-slate-500">
                            {item.spreadsheetId.slice(0, 10)}…
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isWorking}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isWorking}
                    className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    {isWorking ? 'Connecting...' : 'Connect Spreadsheet'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
