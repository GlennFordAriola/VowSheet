import React from 'react';
import { AlertCircle, PlusCircle } from 'lucide-react';
import { ConnectedSpreadsheet, SheetTabMapping } from '../types/wedding';

interface TabMappingBannerProps {
  spreadsheet: ConnectedSpreadsheet;
  onUpdateMapping: (nextMapping: SheetTabMapping) => void;
  onCreateMissingTabs: (
    missing: Array<'Budget' | 'Guest List' | 'Vendors'>
  ) => void;
}

export const TabMappingBanner: React.FC<TabMappingBannerProps> = ({
  spreadsheet,
  onUpdateMapping,
  onCreateMissingTabs,
}) => {
  const { mapping } = spreadsheet;
  const missingTabs: Array<'Budget' | 'Guest List' | 'Vendors'> = [];
  if (!mapping.budgetTab) missingTabs.push('Budget');
  if (!mapping.guestsTab) missingTabs.push('Guest List');
  if (!mapping.vendorsTab) missingTabs.push('Vendors');

  if (missingTabs.length === 0) return null;

  return (
    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50/70 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-900">
              Map tabs in “{spreadsheet.title}”
            </h3>
            <p className="text-xs text-slate-600">
              We found {mapping.allTabNames.length} tab(s) (
              {mapping.allTabNames.join(', ')}). Select existing tabs below or
              create standard wedding tabs ({missingTabs.join(', ')}).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onCreateMissingTabs(missingTabs)}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Create Missing Tabs
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-700">
            Budget Tab
          </label>
          <select
            value={mapping.budgetTab ?? ''}
            onChange={(e) =>
              onUpdateMapping({
                ...mapping,
                budgetTab: e.target.value || null,
              })
            }
            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-emerald-700 focus:outline-none"
          >
            <option value="">Not mapped</option>
            {mapping.allTabNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-700">
            Guest List Tab
          </label>
          <select
            value={mapping.guestsTab ?? ''}
            onChange={(e) =>
              onUpdateMapping({
                ...mapping,
                guestsTab: e.target.value || null,
              })
            }
            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-emerald-700 focus:outline-none"
          >
            <option value="">Not mapped</option>
            {mapping.allTabNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-700">
            Vendors Tab
          </label>
          <select
            value={mapping.vendorsTab ?? ''}
            onChange={(e) =>
              onUpdateMapping({
                ...mapping,
                vendorsTab: e.target.value || null,
              })
            }
            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:border-emerald-700 focus:outline-none"
          >
            <option value="">Not mapped</option>
            {mapping.allTabNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
