import React, { useMemo, useState } from 'react';
import { Download, Plus, Search, Trash2 } from 'lucide-react';
import {
  GUEST_SIDES,
  MEAL_CHOICES,
  RSVP_STATUSES,
  exportRowsToCsv,
} from '../lib/weddingTemplates';
import { GUEST_HEADERS } from '../lib/sheetsApi';
import { GuestItem } from '../types/wedding';

interface GuestSheetViewProps {
  items: GuestItem[];
  onChange: (nextItems: GuestItem[]) => void;
  onRequestDeleteRows: (ids: string[]) => void;
  onPopulateTemplate?: () => void;
  isLoading: boolean;
}

export const GuestSheetView: React.FC<GuestSheetViewProps> = ({
  items,
  onChange,
  onRequestDeleteRows,
  onPopulateTemplate,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<string>('All');
  const [sideFilter, setSideFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((g) => {
      if (rsvpFilter !== 'All' && g.rsvpStatus !== rsvpFilter) return false;
      if (sideFilter !== 'All' && g.side !== sideFilter) return false;
      if (!q) return true;
      return (
        g.fullName.toLowerCase().includes(q) ||
        g.household.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.dietaryNotes.toLowerCase().includes(q) ||
        g.tableNumber.toLowerCase().includes(q)
      );
    });
  }, [items, search, rsvpFilter, sideFilter]);

  const summary = useMemo(() => {
    const attending = items.filter((g) => g.rsvpStatus === 'Attending').length;
    const plusOnes = items.filter(
      (g) => g.rsvpStatus === 'Attending' && g.plusOne === 'Yes'
    ).length;
    const pending = items.filter((g) => g.rsvpStatus === 'Pending').length;
    const declined = items.filter((g) => g.rsvpStatus === 'Declined').length;
    return {
      attending,
      plusOnes,
      totalSeats: attending + plusOnes,
      pending,
      declined,
    };
  }, [items]);

  const updateField = <K extends keyof GuestItem>(
    id: string,
    field: K,
    value: GuestItem[K]
  ) => {
    onChange(
      items.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddRow = () => {
    const newGuest: GuestItem = {
      id: crypto.randomUUID(),
      fullName: '',
      household: '',
      side: sideFilter !== 'All' ? sideFilter : 'Mutual',
      email: '',
      phone: '',
      rsvpStatus: rsvpFilter !== 'All' ? rsvpFilter : 'Pending',
      plusOne: 'No',
      mealChoice: 'Undecided',
      dietaryNotes: '',
      tableNumber: '',
      thankYouSent: 'Pending',
    };
    onChange([...items, newGuest]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (
      filteredItems.length > 0 &&
      filteredItems.every((i) => selectedIds.has(i.id))
    ) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleExportCsv = () => {
    exportRowsToCsv(
      'wedding-guest-list.csv',
      GUEST_HEADERS,
      items.map((g) => [
        g.fullName,
        g.household,
        g.side,
        g.email,
        g.phone,
        g.rsvpStatus,
        g.plusOne,
        g.mealChoice,
        g.dietaryNotes,
        g.tableNumber,
        g.thankYouSent,
      ])
    );
  };

  const rsvpColorClass = (status: string) => {
    if (status === 'Attending') return 'text-emerald-700 font-medium';
    if (status === 'Declined') return 'text-red-700 font-medium';
    return 'text-amber-700 font-medium';
  };

  return (
    <div className="space-y-4">
      {/* RSVP Tally Strip */}
      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-slate-200 bg-white px-5 py-3 text-xs">
        <div>
          <span className="text-slate-500">Total Invited:</span>{' '}
          <span className="font-mono font-semibold text-slate-900 tabular-nums">
            {items.length}
          </span>
        </div>
        <span className="text-slate-300" aria-hidden="true">
          |
        </span>
        <div>
          <span className="text-slate-500">Confirmed Seats:</span>{' '}
          <span className="font-mono font-semibold text-emerald-700 tabular-nums">
            {summary.totalSeats}
          </span>{' '}
          <span className="text-slate-500 tabular-nums">
            ({summary.attending} guests + {summary.plusOnes} plus-ones)
          </span>
        </div>
        <span className="text-slate-300" aria-hidden="true">
          |
        </span>
        <div>
          <span className="text-slate-500">Pending RSVP:</span>{' '}
          <span className="font-mono font-semibold text-amber-700 tabular-nums">
            {summary.pending}
          </span>
        </div>
        <span className="text-slate-300" aria-hidden="true">
          |
        </span>
        <div>
          <span className="text-slate-500">Declined:</span>{' '}
          <span className="font-mono font-semibold text-slate-700 tabular-nums">
            {summary.declined}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest, household, dietary..."
              aria-label="Search guests"
              className="h-9 w-56 rounded-md border border-slate-300 bg-white pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <select
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value)}
            aria-label="Filter by wedding side"
            className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-emerald-700 focus:outline-none"
          >
            <option value="All">All Sides</option>
            {GUEST_SIDES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 p-0.5">
            {['All', ...RSVP_STATUSES].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setRsvpFilter(status)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  rsvpFilter === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => {
                onRequestDeleteRows(Array.from(selectedIds));
                setSelectedIds(new Set());
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Guest Row
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="h-10 animate-pulse rounded bg-slate-100"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              Your Guest List tab is empty
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Track RSVPs, plus-ones, meal selections, dietary restrictions, and
              seating table assignments in one spreadsheet.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Add First Guest
              </button>
              {onPopulateTemplate && (
                <button
                  type="button"
                  onClick={onPopulateTemplate}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  Load Starter Template
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-mono text-slate-500">
                  <th className="w-10 border-r border-slate-200 px-2 py-1 text-center">
                    #
                  </th>
                  <th className="w-9 border-r border-slate-200 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all visible guests"
                      checked={
                        filteredItems.length > 0 &&
                        filteredItems.every((i) => selectedIds.has(i.id))
                      }
                      onChange={toggleAllVisible}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                    />
                  </th>
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map(
                    (col) => (
                      <th
                        key={col}
                        className="border-r border-slate-200 px-3 py-1 text-center font-medium last:border-r-0"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="border-r border-slate-200 px-2 py-2 text-center font-mono text-[11px] font-medium">
                    1
                  </th>
                  <th className="border-r border-slate-200 px-2 py-2" />
                  <th className="min-w-[165px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Full Name
                  </th>
                  <th className="min-w-[140px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Household
                  </th>
                  <th className="min-w-[115px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Side
                  </th>
                  <th className="min-w-[185px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Email
                  </th>
                  <th className="min-w-[130px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Phone
                  </th>
                  <th className="min-w-[115px] border-r border-slate-200 px-3 py-2 font-semibold">
                    RSVP Status
                  </th>
                  <th className="min-w-[85px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Plus One
                  </th>
                  <th className="min-w-[135px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Meal Choice
                  </th>
                  <th className="min-w-[150px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Dietary Notes
                  </th>
                  <th className="min-w-[85px] border-r border-slate-200 px-3 py-2 text-right font-semibold">
                    Table #
                  </th>
                  <th className="min-w-[105px] px-3 py-2 font-semibold">
                    Thank You
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((guest, index) => {
                  const isSelected = selectedIds.has(guest.id);
                  return (
                    <tr
                      key={guest.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="border-r border-slate-200 bg-slate-50/70 px-2 py-1.5 text-center font-mono text-[11px] text-slate-400 tabular-nums">
                        {index + 2}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${guest.fullName || 'guest'}`}
                          checked={isSelected}
                          onChange={() => toggleSelect(guest.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="text"
                          value={guest.fullName}
                          placeholder="Guest name"
                          onChange={(e) =>
                            updateField(guest.id, 'fullName', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-3 font-medium text-slate-900 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="text"
                          value={guest.household}
                          placeholder="Household"
                          onChange={(e) =>
                            updateField(guest.id, 'household', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-3 text-slate-700 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <select
                          value={guest.side}
                          onChange={(e) =>
                            updateField(guest.id, 'side', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-2.5 text-slate-700 focus:bg-emerald-50/40 focus:outline-none"
                        >
                          {GUEST_SIDES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="email"
                          value={guest.email}
                          placeholder="guest@email.com"
                          onChange={(e) =>
                            updateField(guest.id, 'email', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-3 text-slate-700 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="tel"
                          value={guest.phone}
                          placeholder="(555) 000-0000"
                          onChange={(e) =>
                            updateField(guest.id, 'phone', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-3 font-mono text-slate-700 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <select
                          value={guest.rsvpStatus}
                          onChange={(e) =>
                            updateField(guest.id, 'rsvpStatus', e.target.value)
                          }
                          className={`h-9 w-full bg-transparent px-2.5 focus:bg-emerald-50/40 focus:outline-none ${rsvpColorClass(
                            guest.rsvpStatus
                          )}`}
                        >
                          {RSVP_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <select
                          value={guest.plusOne}
                          onChange={(e) =>
                            updateField(guest.id, 'plusOne', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-2.5 text-slate-700 focus:bg-emerald-50/40 focus:outline-none"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <select
                          value={guest.mealChoice}
                          onChange={(e) =>
                            updateField(guest.id, 'mealChoice', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-2.5 text-slate-700 focus:bg-emerald-50/40 focus:outline-none"
                        >
                          {MEAL_CHOICES.map((meal) => (
                            <option key={meal} value={meal}>
                              {meal}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="text"
                          value={guest.dietaryNotes}
                          placeholder="Allergies / notes"
                          onChange={(e) =>
                            updateField(
                              guest.id,
                              'dietaryNotes',
                              e.target.value
                            )
                          }
                          className="h-9 w-full bg-transparent px-3 text-slate-700 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="text"
                          value={guest.tableNumber}
                          placeholder="—"
                          onChange={(e) =>
                            updateField(guest.id, 'tableNumber', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-3 text-right font-mono text-slate-800 placeholder:text-slate-300 tabular-nums focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="p-0">
                        <select
                          value={guest.thankYouSent}
                          onChange={(e) =>
                            updateField(
                              guest.id,
                              'thankYouSent',
                              e.target.value
                            )
                          }
                          className={`h-9 w-full bg-transparent px-2.5 focus:bg-emerald-50/40 focus:outline-none ${
                            guest.thankYouSent === 'Sent'
                              ? 'text-emerald-700 font-medium'
                              : 'text-slate-600'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Sent">Sent</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
