import React, { useMemo, useState } from 'react';
import { Download, Plus, Search, Trash2 } from 'lucide-react';
import {
  PAYMENT_STATUSES,
  WEDDING_CATEGORIES,
  effectiveItemCost,
  exportRowsToCsv,
  formatCurrency,
} from '../lib/weddingTemplates';
import { BUDGET_HEADERS } from '../lib/sheetsApi';
import { BudgetItem } from '../types/wedding';

interface BudgetSheetViewProps {
  items: BudgetItem[];
  onChange: (nextItems: BudgetItem[]) => void;
  onRequestDeleteRows: (ids: string[]) => void;
  onPopulateTemplate?: () => void;
  isLoading: boolean;
}

export const BudgetSheetView: React.FC<BudgetSheetViewProps> = ({
  items,
  onChange,
  onRequestDeleteRows,
  onPopulateTemplate,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }
      if (statusFilter !== 'All' && item.paymentStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.item.toLowerCase().includes(q) ||
        item.vendor.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter, statusFilter]);

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, row) => {
        const committed = effectiveItemCost(row);
        acc.estimated += row.estimated;
        acc.actual += row.actual;
        acc.paid += row.paid;
        acc.balance += Math.max(0, committed - row.paid);
        return acc;
      },
      { estimated: 0, actual: 0, paid: 0, balance: 0 }
    );
  }, [filteredItems]);

  const updateField = <K extends keyof BudgetItem>(
    id: string,
    field: K,
    value: BudgetItem[K]
  ) => {
    onChange(
      items.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddRow = () => {
    const newRow: BudgetItem = {
      id: crypto.randomUUID(),
      item: '',
      category: categoryFilter !== 'All' ? categoryFilter : 'Venue & Catering',
      vendor: '',
      estimated: 0,
      actual: 0,
      paid: 0,
      paymentStatus: 'Unpaid',
      dueDate: '',
      notes: '',
    };
    onChange([...items, newRow]);
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
      'wedding-budget.csv',
      BUDGET_HEADERS,
      items.map((item) => [
        item.item,
        item.category,
        item.vendor,
        item.estimated,
        item.actual,
        item.paid,
        Math.max(0, effectiveItemCost(item) - item.paid),
        item.paymentStatus,
        item.dueDate,
        item.notes,
      ])
    );
  };

  const statusColorClass = (status: string) => {
    if (status === 'Paid in Full') return 'text-emerald-700 font-medium';
    if (status === 'Overdue') return 'text-red-700 font-medium';
    if (status === 'Deposit Paid') return 'text-amber-700 font-medium';
    return 'text-slate-600';
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items, vendors, notes..."
              aria-label="Search budget items"
              className="h-9 w-56 rounded-md border border-slate-300 bg-white pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-emerald-700 focus:outline-none"
          >
            <option value="All">All Categories</option>
            {WEDDING_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 p-0.5">
            {['All', ...PAYMENT_STATUSES].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === status
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
            Add Expense Row
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
              Your Budget tab is empty
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Add wedding expenses row by row or populate a starter wedding
              budget checklist with formulas ready for Google Sheets.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Add First Expense
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
                {/* Spreadsheet Column Letters */}
                <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-mono text-slate-500">
                  <th className="w-10 border-r border-slate-200 px-2 py-1 text-center">
                    #
                  </th>
                  <th className="w-9 border-r border-slate-200 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all visible rows"
                      checked={
                        filteredItems.length > 0 &&
                        filteredItems.every((i) => selectedIds.has(i.id))
                      }
                      onChange={toggleAllVisible}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                    />
                  </th>
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map(
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
                {/* Column Titles */}
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="border-r border-slate-200 px-2 py-2 text-center font-mono text-[11px] font-medium">
                    1
                  </th>
                  <th className="border-r border-slate-200 px-2 py-2" />
                  <th className="min-w-[210px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Item
                  </th>
                  <th className="min-w-[165px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Category
                  </th>
                  <th className="min-w-[160px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Vendor
                  </th>
                  <th className="min-w-[110px] border-r border-slate-200 px-3 py-2 text-right font-semibold">
                    Estimated ($)
                  </th>
                  <th className="min-w-[110px] border-r border-slate-200 px-3 py-2 text-right font-semibold">
                    Actual ($)
                  </th>
                  <th className="min-w-[110px] border-r border-slate-200 px-3 py-2 text-right font-semibold">
                    Paid ($)
                  </th>
                  <th className="min-w-[110px] border-r border-slate-200 px-3 py-2 text-right font-semibold">
                    Balance ($)
                  </th>
                  <th className="min-w-[130px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Payment Status
                  </th>
                  <th className="min-w-[130px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Due Date
                  </th>
                  <th className="min-w-[210px] px-3 py-2 font-semibold">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((row, index) => {
                  const balance = Math.max(
                    0,
                    effectiveItemCost(row) - row.paid
                  );
                  const isSelected = selectedIds.has(row.id);

                  return (
                    <tr
                      key={row.id}
                      className={`group transition-colors ${
                        isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="border-r border-slate-200 bg-slate-50/70 px-2 py-1.5 text-center font-mono text-[11px] text-slate-400 tabular-nums">
                        {index + 2}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.item || 'row'}`}
                          checked={isSelected}
                          onChange={() => toggleSelect(row.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="text"
                          value={row.item}
                          placeholder="Expense description"
                          onChange={(e) =>
                            updateField(row.id, 'item', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-3 text-slate-900 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <select
                          value={row.category}
                          onChange={(e) =>
                            updateField(row.id, 'category', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-2.5 text-slate-700 focus:bg-emerald-50/40 focus:outline-none"
                        >
                          {WEDDING_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="text"
                          value={row.vendor}
                          placeholder="Vendor name"
                          onChange={(e) =>
                            updateField(row.id, 'vendor', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-3 text-slate-700 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="number"
                          min={0}
                          value={row.estimated}
                          onChange={(e) =>
                            updateField(
                              row.id,
                              'estimated',
                              Number(e.target.value) || 0
                            )
                          }
                          className="h-9 w-full bg-transparent px-3 text-right font-mono text-slate-800 tabular-nums focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="number"
                          min={0}
                          value={row.actual}
                          onChange={(e) =>
                            updateField(
                              row.id,
                              'actual',
                              Number(e.target.value) || 0
                            )
                          }
                          className="h-9 w-full bg-transparent px-3 text-right font-mono text-slate-900 tabular-nums focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="number"
                          min={0}
                          value={row.paid}
                          onChange={(e) =>
                            updateField(
                              row.id,
                              'paid',
                              Number(e.target.value) || 0
                            )
                          }
                          className="h-9 w-full bg-transparent px-3 text-right font-mono text-emerald-700 tabular-nums focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td
                        className="border-r border-slate-200 bg-slate-50/50 px-3 py-2 text-right font-mono font-medium text-slate-900 tabular-nums"
                        title="Calculated formula: =IF(Actual>0, Actual, Estimated) - Paid"
                      >
                        {formatCurrency(balance)}
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <select
                          value={row.paymentStatus}
                          onChange={(e) =>
                            updateField(row.id, 'paymentStatus', e.target.value)
                          }
                          className={`h-9 w-full bg-transparent px-2.5 focus:bg-emerald-50/40 focus:outline-none ${statusColorClass(
                            row.paymentStatus
                          )}`}
                        >
                          {PAYMENT_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="date"
                          value={row.dueDate}
                          onChange={(e) =>
                            updateField(row.id, 'dueDate', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-2.5 font-mono text-slate-700 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          value={row.notes}
                          placeholder="Add notes..."
                          onChange={(e) =>
                            updateField(row.id, 'notes', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-3 text-slate-600 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                  <td
                    colSpan={5}
                    className="border-r border-slate-200 px-3 py-2.5 text-right text-xs text-slate-600"
                  >
                    Sheet Totals ({filteredItems.length} rows)
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatCurrency(totals.estimated)}
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatCurrency(totals.actual)}
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2.5 text-right font-mono text-emerald-700 tabular-nums">
                    {formatCurrency(totals.paid)}
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatCurrency(totals.balance)}
                  </td>
                  <td colSpan={3} className="px-3 py-2.5 text-[11px] font-normal text-slate-500">
                    Balance syncs as a live Google Sheets formula (`=IF(E&gt;0,E,D)-F`)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
