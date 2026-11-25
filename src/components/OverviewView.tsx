import React from 'react';
import { ArrowUpRight, CalendarClock, CheckCircle2, Users, Wallet } from 'lucide-react';
import { effectiveItemCost, formatCurrency } from '../lib/weddingTemplates';
import { BudgetItem, GuestItem, SheetTabKey, VendorItem } from '../types/wedding';

interface OverviewViewProps {
  budgetItems: BudgetItem[];
  guestItems: GuestItem[];
  vendorItems: VendorItem[];
  targetBudget: number;
  onChangeTargetBudget: (val: number) => void;
  onNavigateTab: (tab: SheetTabKey) => void;
  isLoading: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  budgetItems,
  guestItems,
  vendorItems,
  targetBudget,
  onChangeTargetBudget,
  onNavigateTab,
  isLoading,
}) => {
  const totalEstimated = budgetItems.reduce((sum, i) => sum + i.estimated, 0);
  const totalCommitted = budgetItems.reduce(
    (sum, i) => sum + effectiveItemCost(i),
    0
  );
  const totalPaid = budgetItems.reduce((sum, i) => sum + i.paid, 0);
  const balanceRemaining = Math.max(0, totalCommitted - totalPaid);
  const budgetVariance = targetBudget - totalCommitted;

  const attendingGuests = guestItems.filter(
    (g) => g.rsvpStatus === 'Attending'
  );
  const attendingPlusOnes = attendingGuests.filter(
    (g) => g.plusOne === 'Yes'
  ).length;
  const totalConfirmedHeadcount = attendingGuests.length + attendingPlusOnes;
  const pendingGuestsCount = guestItems.filter(
    (g) => g.rsvpStatus === 'Pending'
  ).length;
  const declinedGuestsCount = guestItems.filter(
    (g) => g.rsvpStatus === 'Declined'
  ).length;

  const bookedVendorsCount = vendorItems.filter(
    (v) => v.contractStatus === 'Booked' || v.contractStatus === 'Paid in Full'
  ).length;
  const totalVendorFees = vendorItems.reduce((sum, v) => sum + v.totalFee, 0);
  const totalVendorDeposits = vendorItems.reduce(
    (sum, v) => sum + v.depositPaid,
    0
  );

  // Category aggregation
  const categoryMap = new Map<
    string,
    { estimated: number; committed: number; paid: number }
  >();
  for (const item of budgetItems) {
    const prev = categoryMap.get(item.category) ?? {
      estimated: 0,
      committed: 0,
      paid: 0,
    };
    categoryMap.set(item.category, {
      estimated: prev.estimated + item.estimated,
      committed: prev.committed + effectiveItemCost(item),
      paid: prev.paid + item.paid,
    });
  }
  const categories = Array.from(categoryMap.entries()).sort(
    (a, b) => b[1].committed - a[1].committed
  );

  // Upcoming payments due
  const upcomingPayments = budgetItems
    .filter((i) => i.paymentStatus !== 'Paid in Full' && effectiveItemCost(i) - i.paid > 0)
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
    .slice(0, 6);

  // Meal tally for attending guests
  const mealCounts = new Map<string, number>();
  for (const g of attendingGuests) {
    const key = g.mealChoice || 'Undecided';
    mealCounts.set(key, (mealCounts.get(key) ?? 0) + 1);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4-Column Summary Strip */}
      <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Target Wedding Budget</span>
            <Wallet className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {formatCurrency(totalCommitted)}
            </span>
            <span className="text-xs text-slate-500">
              of{' '}
              <input
                type="number"
                aria-label="Target budget ceiling"
                value={targetBudget}
                onChange={(e) =>
                  onChangeTargetBudget(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-20 border-b border-dashed border-slate-300 bg-transparent font-mono text-xs font-medium text-slate-800 focus:border-emerald-700 focus:outline-none tabular-nums"
              />
            </span>
          </div>
          <p
            className={`mt-2 text-xs font-medium ${
              budgetVariance >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {budgetVariance >= 0
              ? `${formatCurrency(budgetVariance)} under target ceiling`
              : `${formatCurrency(Math.abs(budgetVariance))} over target ceiling`}
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Paid & Remaining Balance</span>
            <CalendarClock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(totalPaid)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 tabular-nums">
            <span>{formatCurrency(balanceRemaining)} remaining</span>
            <span aria-hidden="true">·</span>
            <span>{formatCurrency(totalEstimated)} est.</span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Confirmed Headcount</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {totalConfirmedHeadcount}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 tabular-nums">
            <span>{attendingGuests.length} guests</span>
            <span aria-hidden="true">·</span>
            <span>{attendingPlusOnes} +1s</span>
            <span aria-hidden="true">·</span>
            <span>{pendingGuestsCount} pending</span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Vendors Contracted</span>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {bookedVendorsCount}
            <span className="ml-1.5 text-sm font-normal text-slate-500">
              / {vendorItems.length}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 tabular-nums">
            <span>{formatCurrency(totalVendorDeposits)} deposits</span>
            <span aria-hidden="true">·</span>
            <span>{formatCurrency(totalVendorFees)} total</span>
          </div>
        </div>
      </div>

      {/* Main Analytical Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Category Breakdown */}
        <section className="rounded-lg border border-slate-200 bg-white lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Budget Allocation by Category
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Committed cost vs. amount paid across {budgetItems.length} line
                items
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('budget')}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
            >
              Open Budget Sheet
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              No budget items recorded yet. Switch to the Budget tab to add your
              first expense.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <th className="px-5 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Estimated
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Committed
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">Paid</th>
                    <th className="w-32 px-5 py-2.5 font-medium">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map(([cat, vals]) => {
                    const sharePct =
                      totalCommitted > 0
                        ? Math.round((vals.committed / totalCommitted) * 100)
                        : 0;
                    const paidPct =
                      vals.committed > 0
                        ? Math.min(
                            100,
                            Math.round((vals.paid / vals.committed) * 100)
                          )
                        : 0;

                    return (
                      <tr key={cat} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {cat}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600 tabular-nums">
                          {formatCurrency(vals.estimated)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                          {formatCurrency(vals.committed)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700 tabular-nums">
                          {formatCurrency(vals.paid)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full bg-emerald-700"
                                style={{ width: `${paidPct}%` }}
                              />
                            </div>
                            <span className="w-8 text-right font-mono text-[11px] text-slate-500 tabular-nums">
                              {sharePct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right Column: Upcoming Payments & Catering Summary */}
        <div className="space-y-6 lg:col-span-5">
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Upcoming Balances Due
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Next scheduled vendor & budget installments
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('vendors')}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
              >
                Vendor Sheet
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {upcomingPayments.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-500">
                All logged budget items are paid in full.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcomingPayments.map((item) => {
                  const balance = Math.max(
                    0,
                    effectiveItemCost(item) - item.paid
                  );
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-slate-900">
                          {item.item || 'Untitled Expense'}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{item.vendor || item.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {item.dueDate ? `Due ${item.dueDate}` : 'No due date'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(balance)}
                        </div>
                        <div
                          className={`text-[11px] font-medium ${
                            item.paymentStatus === 'Overdue'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {item.paymentStatus}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  RSVP & Catering Breakdown
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {attendingGuests.length} attending · {pendingGuestsCount}{' '}
                  awaiting reply · {declinedGuestsCount} declined
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('guests')}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
              >
                Guest Sheet
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {attendingGuests.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-500">
                No attending guests logged yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
                {Array.from(mealCounts.entries()).map(([meal, count]) => (
                  <div
                    key={meal}
                    className="flex items-center justify-between px-5 py-3 text-xs"
                  >
                    <span className="text-slate-700">{meal}</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
