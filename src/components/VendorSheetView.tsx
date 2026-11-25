import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, Plus, Search, Trash2 } from 'lucide-react';
import {
  CONTRACT_STATUSES,
  WEDDING_CATEGORIES,
  exportRowsToCsv,
  formatCurrency,
} from '../lib/weddingTemplates';
import { VENDOR_HEADERS } from '../lib/sheetsApi';
import { VendorItem } from '../types/wedding';

interface VendorSheetViewProps {
  items: VendorItem[];
  onChange: (nextItems: VendorItem[]) => void;
  onRequestDeleteRows: (ids: string[]) => void;
  onPopulateTemplate?: () => void;
  isLoading: boolean;
}

export const VendorSheetView: React.FC<VendorSheetViewProps> = ({
  items,
  onChange,
  onRequestDeleteRows,
  onPopulateTemplate,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [contractFilter, setContractFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((v) => {
      if (categoryFilter !== 'All' && v.category !== categoryFilter) {
        return false;
      }
      if (contractFilter !== 'All' && v.contractStatus !== contractFilter) {
        return false;
      }
      if (!q) return true;
      return (
        v.businessName.toLowerCase().includes(q) ||
        v.contactPerson.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.phone.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter, contractFilter]);

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, v) => {
        acc.totalFee += v.totalFee;
        acc.depositPaid += v.depositPaid;
        acc.balance += Math.max(0, v.totalFee - v.depositPaid);
        return acc;
      },
      { totalFee: 0, depositPaid: 0, balance: 0 }
    );
  }, [filteredItems]);

  const updateField = <K extends keyof VendorItem>(
    id: string,
    field: K,
    value: VendorItem[K]
  ) => {
    onChange(
      items.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddRow = () => {
    const newVendor: VendorItem = {
      id: crypto.randomUUID(),
      businessName: '',
      category: categoryFilter !== 'All' ? categoryFilter : 'Venue & Catering',
      contactPerson: '',
      email: '',
      phone: '',
      website: '',
      contractStatus:
        contractFilter !== 'All' ? contractFilter : 'Researching',
      totalFee: 0,
      depositPaid: 0,
      serviceDate: '',
      notes: '',
    };
    onChange([...items, newVendor]);
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

  const handleCopy = async (key: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore clipboard denial
    }
  };

  const handleExportCsv = () => {
    exportRowsToCsv(
      'wedding-vendor-contacts.csv',
      VENDOR_HEADERS,
      items.map((v) => [
        v.businessName,
        v.category,
        v.contactPerson,
        v.email,
        v.phone,
        v.website,
        v.contractStatus,
        v.totalFee,
        v.depositPaid,
        Math.max(0, v.totalFee - v.depositPaid),
        v.serviceDate,
        v.notes,
      ])
    );
  };

  const contractColorClass = (status: string) => {
    if (status === 'Paid in Full' || status === 'Booked') {
      return 'text-emerald-700 font-medium';
    }
    if (status === 'Proposal Review' || status === 'Inquiry Sent') {
      return 'text-amber-700 font-medium';
    }
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
              placeholder="Search business, contact, email..."
              aria-label="Search vendors"
              className="h-9 w-56 rounded-md border border-slate-300 bg-white pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter vendors by category"
            className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-emerald-700 focus:outline-none"
          >
            <option value="All">All Categories</option>
            {WEDDING_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-0.5 overflow-x-auto rounded-md border border-slate-200 bg-slate-100 p-0.5">
            {['All', ...CONTRACT_STATUSES].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setContractFilter(status)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  contractFilter === status
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
            Add Vendor Row
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
              Your Vendors tab is empty
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Store vendor contacts, contract statuses, deposits paid, and
              day-of service dates directly in your wedding workbook.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Add First Vendor
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
                      aria-label="Select all visible vendors"
                      checked={
                        filteredItems.length > 0 &&
                        filteredItems.every((i) => selectedIds.has(i.id))
                      }
                      onChange={toggleAllVisible}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                    />
                  </th>
                  {[
                    'A',
                    'B',
                    'C',
                    'D',
                    'E',
                    'F',
                    'G',
                    'H',
                    'I',
                    'J',
                    'K',
                    'L',
                  ].map((col) => (
                    <th
                      key={col}
                      className="border-r border-slate-200 px-3 py-1 text-center font-medium last:border-r-0"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="border-r border-slate-200 px-2 py-2 text-center font-mono text-[11px] font-medium">
                    1
                  </th>
                  <th className="border-r border-slate-200 px-2 py-2" />
                  <th className="min-w-[185px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Vendor / Business
                  </th>
                  <th className="min-w-[165px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Category
                  </th>
                  <th className="min-w-[145px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Contact Person
                  </th>
                  <th className="min-w-[205px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Email
                  </th>
                  <th className="min-w-[140px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Phone
                  </th>
                  <th className="min-w-[160px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Website
                  </th>
                  <th className="min-w-[140px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Contract Status
                  </th>
                  <th className="min-w-[110px] border-r border-slate-200 px-3 py-2 text-right font-semibold">
                    Total Fee ($)
                  </th>
                  <th className="min-w-[115px] border-r border-slate-200 px-3 py-2 text-right font-semibold">
                    Deposit Paid ($)
                  </th>
                  <th className="min-w-[110px] border-r border-slate-200 px-3 py-2 text-right font-semibold">
                    Balance ($)
                  </th>
                  <th className="min-w-[130px] border-r border-slate-200 px-3 py-2 font-semibold">
                    Service Date
                  </th>
                  <th className="min-w-[210px] px-3 py-2 font-semibold">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((vendor, index) => {
                  const balance = Math.max(
                    0,
                    vendor.totalFee - vendor.depositPaid
                  );
                  const isSelected = selectedIds.has(vendor.id);

                  return (
                    <tr
                      key={vendor.id}
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
                          aria-label={`Select ${vendor.businessName || 'vendor'}`}
                          checked={isSelected}
                          onChange={() => toggleSelect(vendor.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="text"
                          value={vendor.businessName}
                          placeholder="Business name"
                          onChange={(e) =>
                            updateField(
                              vendor.id,
                              'businessName',
                              e.target.value
                            )
                          }
                          className="h-9 w-full bg-transparent px-3 font-medium text-slate-900 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <select
                          value={vendor.category}
                          onChange={(e) =>
                            updateField(vendor.id, 'category', e.target.value)
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
                          value={vendor.contactPerson}
                          placeholder="Primary contact"
                          onChange={(e) =>
                            updateField(
                              vendor.id,
                              'contactPerson',
                              e.target.value
                            )
                          }
                          className="h-9 w-full bg-transparent px-3 text-slate-700 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <div className="flex items-center">
                          <input
                            type="email"
                            value={vendor.email}
                            placeholder="vendor@studio.com"
                            onChange={(e) =>
                              updateField(vendor.id, 'email', e.target.value)
                            }
                            className="h-9 w-full bg-transparent px-3 text-slate-700 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                          />
                          {vendor.email && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(`email-${vendor.id}`, vendor.email)
                              }
                              title="Copy email"
                              aria-label="Copy vendor email"
                              className="mr-1.5 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              {copiedId === `email-${vendor.id}` ? (
                                <Check className="h-3 w-3 text-emerald-700" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <div className="flex items-center">
                          <input
                            type="tel"
                            value={vendor.phone}
                            placeholder="(555) 000-0000"
                            onChange={(e) =>
                              updateField(vendor.id, 'phone', e.target.value)
                            }
                            className="h-9 w-full bg-transparent px-3 font-mono text-slate-700 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                          />
                          {vendor.phone && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(`phone-${vendor.id}`, vendor.phone)
                              }
                              title="Copy phone"
                              aria-label="Copy vendor phone"
                              className="mr-1.5 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              {copiedId === `phone-${vendor.id}` ? (
                                <Check className="h-3 w-3 text-emerald-700" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="text"
                          value={vendor.website}
                          placeholder="studio.com"
                          onChange={(e) =>
                            updateField(vendor.id, 'website', e.target.value)
                          }
                          className="h-9 w-full bg-transparent px-3 text-slate-700 placeholder:text-slate-300 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <select
                          value={vendor.contractStatus}
                          onChange={(e) =>
                            updateField(
                              vendor.id,
                              'contractStatus',
                              e.target.value
                            )
                          }
                          className={`h-9 w-full bg-transparent px-2.5 focus:bg-emerald-50/40 focus:outline-none ${contractColorClass(
                            vendor.contractStatus
                          )}`}
                        >
                          {CONTRACT_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="number"
                          min={0}
                          value={vendor.totalFee}
                          onChange={(e) =>
                            updateField(
                              vendor.id,
                              'totalFee',
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
                          value={vendor.depositPaid}
                          onChange={(e) =>
                            updateField(
                              vendor.id,
                              'depositPaid',
                              Number(e.target.value) || 0
                            )
                          }
                          className="h-9 w-full bg-transparent px-3 text-right font-mono text-emerald-700 tabular-nums focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td
                        className="border-r border-slate-200 bg-slate-50/50 px-3 py-2 text-right font-mono font-medium text-slate-900 tabular-nums"
                        title="Calculated formula: =TotalFee - DepositPaid"
                      >
                        {formatCurrency(balance)}
                      </td>
                      <td className="border-r border-slate-200 p-0">
                        <input
                          type="date"
                          value={vendor.serviceDate}
                          onChange={(e) =>
                            updateField(
                              vendor.id,
                              'serviceDate',
                              e.target.value
                            )
                          }
                          className="h-9 w-full bg-transparent px-2.5 font-mono text-slate-700 focus:bg-emerald-50/40 focus:outline-none"
                        />
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          value={vendor.notes}
                          placeholder="Contract notes..."
                          onChange={(e) =>
                            updateField(vendor.id, 'notes', e.target.value)
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
                    colSpan={9}
                    className="border-r border-slate-200 px-3 py-2.5 text-right text-xs text-slate-600"
                  >
                    Contract Totals ({filteredItems.length} vendors)
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatCurrency(totals.totalFee)}
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2.5 text-right font-mono text-emerald-700 tabular-nums">
                    {formatCurrency(totals.depositPaid)}
                  </td>
                  <td className="border-r border-slate-200 px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatCurrency(totals.balance)}
                  </td>
                  <td colSpan={2} className="px-3 py-2.5 text-[11px] font-normal text-slate-500">
                    Balance syncs as a live Google Sheets formula (`=H-I`)
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
