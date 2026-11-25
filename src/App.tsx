import React, { useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Briefcase,
  CloudUpload,
  ExternalLink,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { BudgetSheetView } from './components/BudgetSheetView';
import { ConfirmSyncModal } from './components/ConfirmSyncModal';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { GuestSheetView } from './components/GuestSheetView';
import { OverviewView } from './components/OverviewView';
import { TabMappingBanner } from './components/TabMappingBanner';
import { VendorSheetView } from './components/VendorSheetView';
import { WorkbookConnectionModal } from './components/WorkbookConnectionModal';
import {
  clearCachedAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './lib/auth';
import {
  SheetsApiError,
  createWeddingSpreadsheet,
  ensureWeddingTabs,
  inspectSpreadsheet,
  loadWorkbookData,
  syncWorkbookTabs,
} from './lib/sheetsApi';
import { createStarterTemplate } from './lib/weddingTemplates';
import {
  BudgetItem,
  ConfirmationAction,
  ConnectedSpreadsheet,
  GuestItem,
  SavedSpreadsheetRef,
  SheetTabKey,
  SheetTabMapping,
  VendorItem,
} from './types/wedding';

const RECENT_SHEETS_STORAGE_KEY = 'vowsheet_recent_spreadsheets';
const TARGET_BUDGET_STORAGE_KEY = 'vowsheet_target_budget';

const TAB_LABELS: Record<SheetTabKey, string> = {
  overview: 'Overview',
  budget: 'Budget Tracker',
  guests: 'Guest List',
  vendors: 'Vendor Contacts',
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<SheetTabKey>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [connectionModalOpen, setConnectionModalOpen] =
    useState<boolean>(false);

  const [connectedSheet, setConnectedSheet] =
    useState<ConnectedSpreadsheet | null>(null);
  const [recentSheets, setRecentSheets] = useState<SavedSpreadsheetRef[]>(
    () => {
      try {
        const raw = localStorage.getItem(RECENT_SHEETS_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as SavedSpreadsheetRef[]) : [];
      } catch {
        return [];
      }
    }
  );

  const [targetBudget, setTargetBudget] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(TARGET_BUDGET_STORAGE_KEY);
      return raw ? Number(raw) || 35000 : 35000;
    } catch {
      return 35000;
    }
  });

  // Workbook state (initialized empty or populated by user / synced sheet)
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(() => {
    return createStarterTemplate().budget;
  });
  const [guestItems, setGuestItems] = useState<GuestItem[]>(() => {
    return createStarterTemplate().guests;
  });
  const [vendorItems, setVendorItems] = useState<VendorItem[]>(() => {
    return createStarterTemplate().vendors;
  });

  const [dirtyTabs, setDirtyTabs] = useState<{
    budget: boolean;
    guests: boolean;
    vendors: boolean;
  }>({ budget: false, guests: false, vendors: false });

  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);
  const [confirmationAction, setConfirmationAction] =
    useState<ConfirmationAction | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(TARGET_BUDGET_STORAGE_KEY, String(targetBudget));
    } catch {
      // ignore storage errors
    }
  }, [targetBudget]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
      },
      (firebaseUser) => {
        setUser(firebaseUser);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const rememberSpreadsheet = useCallback((sheet: ConnectedSpreadsheet) => {
    setRecentSheets((prev) => {
      const filtered = prev.filter(
        (item) => item.spreadsheetId !== sheet.spreadsheetId
      );
      const next: SavedSpreadsheetRef[] = [
        {
          spreadsheetId: sheet.spreadsheetId,
          title: sheet.title,
          spreadsheetUrl: sheet.spreadsheetUrl,
          lastOpenedAt: new Date().toISOString(),
        },
        ...filtered,
      ].slice(0, 6);
      try {
        localStorage.setItem(RECENT_SHEETS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const handleApiError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof SheetsApiError && err.status === 401) {
      clearCachedAccessToken();
      setNeedsAuth(true);
      setErrorBanner(
        'Your Google Sheets session expired. Sign in with Google again to continue syncing.'
      );
      return;
    }
    setErrorBanner(err instanceof Error ? err.message : fallback);
  }, []);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorBanner(null);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setNeedsAuth(false);
      setNoticeBanner(
        `Signed in as ${result.user.email || result.user.displayName || 'Google User'}. Create or connect a Google Sheet to sync your planner.`
      );
    } catch (err) {
      handleApiError(err, 'Google sign-in was cancelled or failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setNoticeBanner('Signed out of Google.');
  };

  const loadFromConnectedSheet = useCallback(
    async (sheet: ConnectedSpreadsheet) => {
      const token = getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        return;
      }
      setIsLoadingSheet(true);
      setErrorBanner(null);
      try {
        const data = await loadWorkbookData(
          token,
          sheet.spreadsheetId,
          sheet.mapping
        );
        setBudgetItems(data.budget);
        setGuestItems(data.guests);
        setVendorItems(data.vendors);
        setDirtyTabs({ budget: false, guests: false, vendors: false });
        setConnectedSheet({
          ...sheet,
          lastSyncedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleApiError(err, 'Failed to read spreadsheet tabs.');
      } finally {
        setIsLoadingSheet(false);
      }
    },
    [handleApiError]
  );

  const handleCreateNewSpreadsheet = async (
    title: string,
    useStarterTemplate: boolean
  ) => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      throw new Error('Please sign in with Google first.');
    }

    const initialData = useStarterTemplate
      ? createStarterTemplate()
      : { budget: [], guests: [], vendors: [] };

    const created = await createWeddingSpreadsheet(token, title, initialData);
    setConnectedSheet(created);
    rememberSpreadsheet(created);
    setBudgetItems(initialData.budget);
    setGuestItems(initialData.guests);
    setVendorItems(initialData.vendors);
    setDirtyTabs({ budget: false, guests: false, vendors: false });
    setNoticeBanner(
      `Created "${created.title}" in Google Sheets with Budget, Guest List, and Vendors tabs.`
    );
  };

  const handleConnectExistingSpreadsheet = async (spreadsheetId: string) => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      throw new Error('Please sign in with Google first.');
    }

    const inspected = await inspectSpreadsheet(token, spreadsheetId);
    rememberSpreadsheet(inspected);
    await loadFromConnectedSheet(inspected);
    setNoticeBanner(`Connected to "${inspected.title}".`);
  };

  const handleUpdateMapping = async (nextMapping: SheetTabMapping) => {
    if (!connectedSheet) return;
    const updated: ConnectedSpreadsheet = {
      ...connectedSheet,
      mapping: nextMapping,
    };
    setConnectedSheet(updated);
    await loadFromConnectedSheet(updated);
  };

  const handleCreateMissingTabs = (
    missing: Array<'Budget' | 'Guest List' | 'Vendors'>
  ) => {
    if (!connectedSheet) return;
    setConfirmationAction({
      title: 'Add Wedding Tabs to Google Sheet?',
      description: `This will create ${missing.length} new worksheet tab(s) inside "${connectedSheet.title}" in your Google Drive.`,
      details: missing.map((tab) => `Create tab "${tab}" with frozen header row`),
      confirmLabel: 'Confirm & Add Tabs',
      variant: 'primary',
      onConfirm: async () => {
        const token = getAccessToken();
        if (!token) {
          setNeedsAuth(true);
          return;
        }
        try {
          const updated = await ensureWeddingTabs(
            token,
            connectedSheet,
            missing
          );
          await loadFromConnectedSheet(updated);
          setNoticeBanner(
            `Added ${missing.join(', ')} tab(s) to "${updated.title}".`
          );
        } catch (err) {
          handleApiError(err, 'Could not add missing tabs.');
        }
      },
    });
  };

  const hasUnsavedChanges =
    dirtyTabs.budget || dirtyTabs.guests || dirtyTabs.vendors;

  const handleRequestSyncToSheets = () => {
    if (!connectedSheet) {
      setConnectionModalOpen(true);
      return;
    }
    const token = getAccessToken();
    if (!token || needsAuth) {
      setErrorBanner('Sign in with Google to sync changes to your spreadsheet.');
      return;
    }

    const tabsSummary: string[] = [];
    if (dirtyTabs.budget && connectedSheet.mapping.budgetTab) {
      tabsSummary.push(
        `Tab "${connectedSheet.mapping.budgetTab}": write ${budgetItems.length} budget row(s) with balance formulas`
      );
    }
    if (dirtyTabs.guests && connectedSheet.mapping.guestsTab) {
      tabsSummary.push(
        `Tab "${connectedSheet.mapping.guestsTab}": write ${guestItems.length} guest row(s)`
      );
    }
    if (dirtyTabs.vendors && connectedSheet.mapping.vendorsTab) {
      tabsSummary.push(
        `Tab "${connectedSheet.mapping.vendorsTab}": write ${vendorItems.length} vendor row(s) with balance formulas`
      );
    }

    if (tabsSummary.length === 0) {
      // Allow explicit full workbook push if user clicks sync even without dirty flags
      if (connectedSheet.mapping.budgetTab) {
        tabsSummary.push(
          `Tab "${connectedSheet.mapping.budgetTab}": write ${budgetItems.length} budget row(s)`
        );
      }
      if (connectedSheet.mapping.guestsTab) {
        tabsSummary.push(
          `Tab "${connectedSheet.mapping.guestsTab}": write ${guestItems.length} guest row(s)`
        );
      }
      if (connectedSheet.mapping.vendorsTab) {
        tabsSummary.push(
          `Tab "${connectedSheet.mapping.vendorsTab}": write ${vendorItems.length} vendor row(s)`
        );
      }
    }

    setConfirmationAction({
      title: 'Sync Changes to Google Sheets?',
      description: `You are about to update "${connectedSheet.title}" with your current wedding planner data. Existing cell values in the affected tabs will be replaced with your edits.`,
      details: tabsSummary,
      confirmLabel: 'Confirm & Sync to Sheet',
      variant: 'primary',
      onConfirm: async () => {
        const currentToken = getAccessToken();
        if (!currentToken) {
          setNeedsAuth(true);
          return;
        }
        try {
          await syncWorkbookTabs(currentToken, connectedSheet, {
            budget:
              dirtyTabs.budget || !hasUnsavedChanges ? budgetItems : undefined,
            guests:
              dirtyTabs.guests || !hasUnsavedChanges ? guestItems : undefined,
            vendors:
              dirtyTabs.vendors || !hasUnsavedChanges ? vendorItems : undefined,
          });
          setDirtyTabs({ budget: false, guests: false, vendors: false });
          setConnectedSheet((prev) =>
            prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : null
          );
          setNoticeBanner(
            `Synced "${connectedSheet.title}" with Google Sheets.`
          );
        } catch (err) {
          handleApiError(err, 'Failed to sync changes to Google Sheets.');
        }
      },
    });
  };

  const handleRequestRefreshFromSheets = () => {
    if (!connectedSheet) return;
    if (hasUnsavedChanges) {
      setConfirmationAction({
        title: 'Discard Unsynced Edits & Reload?',
        description: `Reloading from "${connectedSheet.title}" will overwrite your unsynced local edits with the latest values from Google Sheets.`,
        details: [
          dirtyTabs.budget ? 'Unsynced edits in Budget will be discarded' : '',
          dirtyTabs.guests
            ? 'Unsynced edits in Guest List will be discarded'
            : '',
          dirtyTabs.vendors
            ? 'Unsynced edits in Vendors will be discarded'
            : '',
        ].filter(Boolean),
        confirmLabel: 'Discard & Reload',
        variant: 'danger',
        onConfirm: async () => {
          await loadFromConnectedSheet(connectedSheet);
          setNoticeBanner(
            `Reloaded latest data from "${connectedSheet.title}".`
          );
        },
      });
    } else {
      void loadFromConnectedSheet(connectedSheet);
    }
  };

  const handleRequestDeleteRows = (
    tab: 'budget' | 'guests' | 'vendors',
    ids: string[]
  ) => {
    if (ids.length === 0) return;

    const getLabel = () => {
      if (tab === 'budget') {
        const names = budgetItems
          .filter((i) => ids.includes(i.id))
          .map((i) => i.item || 'Untitled Expense');
        return {
          title: `Delete ${ids.length} Budget Row(s)?`,
          tabName: connectedSheet?.mapping.budgetTab || 'Budget',
          names,
          applyLocal: () => {
            setBudgetItems((prev) => prev.filter((i) => !ids.includes(i.id)));
            setDirtyTabs((prev) => ({ ...prev, budget: true }));
          },
        };
      }
      if (tab === 'guests') {
        const names = guestItems
          .filter((g) => ids.includes(g.id))
          .map((g) => g.fullName || 'Unnamed Guest');
        return {
          title: `Delete ${ids.length} Guest Row(s)?`,
          tabName: connectedSheet?.mapping.guestsTab || 'Guest List',
          names,
          applyLocal: () => {
            setGuestItems((prev) => prev.filter((g) => !ids.includes(g.id)));
            setDirtyTabs((prev) => ({ ...prev, guests: true }));
          },
        };
      }
      const names = vendorItems
        .filter((v) => ids.includes(v.id))
        .map((v) => v.businessName || 'Unnamed Vendor');
      return {
        title: `Delete ${ids.length} Vendor Row(s)?`,
        tabName: connectedSheet?.mapping.vendorsTab || 'Vendors',
        names,
        applyLocal: () => {
          setVendorItems((prev) => prev.filter((v) => !ids.includes(v.id)));
          setDirtyTabs((prev) => ({ ...prev, vendors: true }));
        },
      };
    };

    const info = getLabel();

    setConfirmationAction({
      title: info.title,
      description: connectedSheet
        ? `Remove ${ids.length} selected row(s) from your workspace and sync the "${info.tabName}" tab in "${connectedSheet.title}"?`
        : `Remove ${ids.length} selected row(s) from the ${info.tabName} table?`,
      details: info.names.slice(0, 5),
      confirmLabel: connectedSheet ? 'Delete & Sync Sheet' : 'Delete Rows',
      variant: 'danger',
      onConfirm: async () => {
        if (!connectedSheet) {
          info.applyLocal();
          return;
        }
        const token = getAccessToken();
        if (!token) {
          info.applyLocal();
          setNeedsAuth(true);
          return;
        }
        if (tab === 'budget') {
          const next = budgetItems.filter((i) => !ids.includes(i.id));
          await syncWorkbookTabs(token, connectedSheet, { budget: next });
          setBudgetItems(next);
          setDirtyTabs((prev) => ({ ...prev, budget: false }));
        } else if (tab === 'guests') {
          const next = guestItems.filter((g) => !ids.includes(g.id));
          await syncWorkbookTabs(token, connectedSheet, { guests: next });
          setGuestItems(next);
          setDirtyTabs((prev) => ({ ...prev, guests: false }));
        } else {
          const next = vendorItems.filter((v) => !ids.includes(v.id));
          await syncWorkbookTabs(token, connectedSheet, { vendors: next });
          setVendorItems(next);
          setDirtyTabs((prev) => ({ ...prev, vendors: false }));
        }
        setNoticeBanner(
          `Removed ${ids.length} row(s) and updated "${connectedSheet.title}".`
        );
      },
    });
  };

  const handlePopulateStarterTemplate = () => {
    const starter = createStarterTemplate();
    setBudgetItems(starter.budget);
    setGuestItems(starter.guests);
    setVendorItems(starter.vendors);
    if (connectedSheet) {
      setDirtyTabs({ budget: true, guests: true, vendors: true });
    }
    setNoticeBanner(
      'Loaded starter wedding template across Budget, Guest List, and Vendors.'
    );
  };

  const navItems: Array<{
    key: SheetTabKey;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }> = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      key: 'budget',
      label: 'Budget Tracker',
      icon: <Wallet className="h-4 w-4" />,
      count: budgetItems.length,
    },
    {
      key: 'guests',
      label: 'Guest List',
      icon: <Users className="h-4 w-4" />,
      count: guestItems.length,
    },
    {
      key: 'vendors',
      label: 'Vendor Contacts',
      icon: <Briefcase className="h-4 w-4" />,
      count: vendorItems.length,
    },
  ];

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-700 text-white">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              VowSheet
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Connected Spreadsheet Box */}
        <div className="px-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="text-[11px] font-medium text-slate-500">
              Linked Google Sheet
            </div>
            {connectedSheet ? (
              <div className="mt-1 space-y-2.5">
                <div className="truncate text-xs font-semibold text-slate-900">
                  {connectedSheet.title}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={connectedSheet.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
                  >
                    Open in Sheets
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => setConnectionModalOpen(true)}
                    className="text-[11px] font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0"
                  >
                    Switch Sheet
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1 space-y-2.5">
                <div className="text-xs font-medium text-slate-700">
                  Local Planner Draft
                </div>
                <button
                  type="button"
                  onClick={() => setConnectionModalOpen(true)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  Create or Link Sheet
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sheet Tabs Navigation */}
        <nav className="space-y-1 px-3" aria-label="Workbook sheets">
          <div className="px-2 pb-1.5 text-[11px] font-medium text-slate-400">
            Workbook Tabs
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            const isTabDirty =
              (item.key === 'budget' && dirtyTabs.budget) ||
              (item.key === 'guests' && dirtyTabs.guests) ||
              (item.key === 'vendors' && dirtyTabs.vendors);

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveTab(item.key);
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={
                      isActive ? 'text-emerald-700' : 'text-slate-400'
                    }
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && (
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {item.count}
                    {isTabDirty ? ' *' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Google Account Block */}
      <div className="border-t border-slate-200 p-4">
        {needsAuth ? (
          <div className="space-y-2.5">
            <p className="text-[11px] leading-relaxed text-slate-500">
              Sign in with Google to create or sync directly with Google Sheets.
            </p>
            <GoogleSignInButton
              onClick={handleSignIn}
              disabled={isLoggingIn}
              label={isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
              className="w-full"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-slate-900">
                {user?.displayName || 'Google Account'}
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {user?.email || 'Connected to Sheets'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out of Google"
              className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          {renderSidebarContent()}
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 h-full w-64 border-r border-slate-200 bg-white">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar (Contextual Breadcrumb + Primary Sync Action) */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
              <span className="truncate font-medium text-slate-500">
                {connectedSheet ? connectedSheet.title : 'Wedding Workbook'}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <h1 className="truncate font-display font-semibold text-slate-900">
                {TAB_LABELS[activeTab]}
              </h1>
            </div>

            {connectedSheet && (
              <span className="hidden text-xs text-slate-500 md:inline">
                <span className="mx-2 text-slate-300" aria-hidden="true">
                  ·
                </span>
                {hasUnsavedChanges
                  ? 'Unsynced edits'
                  : connectedSheet.lastSyncedAt
                    ? `Synced ${new Date(
                        connectedSheet.lastSyncedAt
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : 'Connected'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {connectedSheet && (
              <button
                type="button"
                onClick={handleRequestRefreshFromSheets}
                disabled={isLoadingSheet}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoadingSheet ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRequestSyncToSheets}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <CloudUpload className="h-3.5 w-3.5" />
              <span>
                {connectedSheet ? 'Sync to Google Sheet' : 'Connect Google Sheet'}
              </span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6">
          {errorBanner && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              <span>{errorBanner}</span>
              <div className="flex items-center gap-2 shrink-0">
                {needsAuth && (
                  <button
                    type="button"
                    onClick={handleSignIn}
                    className="rounded border border-red-300 bg-white px-2.5 py-1 font-medium text-red-800 hover:bg-red-50 whitespace-nowrap"
                  >
                    Sign in
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setErrorBanner(null)}
                  aria-label="Dismiss error"
                  className="rounded p-1 text-red-600 hover:bg-red-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {noticeBanner && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
              <span>{noticeBanner}</span>
              <button
                type="button"
                onClick={() => setNoticeBanner(null)}
                aria-label="Dismiss notice"
                className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {connectedSheet && (
            <TabMappingBanner
              spreadsheet={connectedSheet}
              onUpdateMapping={handleUpdateMapping}
              onCreateMissingTabs={handleCreateMissingTabs}
            />
          )}

          {activeTab === 'overview' && (
            <OverviewView
              budgetItems={budgetItems}
              guestItems={guestItems}
              vendorItems={vendorItems}
              targetBudget={targetBudget}
              onChangeTargetBudget={setTargetBudget}
              onNavigateTab={setActiveTab}
              isLoading={isLoadingSheet}
            />
          )}

          {activeTab === 'budget' && (
            <BudgetSheetView
              items={budgetItems}
              onChange={(next) => {
                setBudgetItems(next);
                setDirtyTabs((prev) => ({ ...prev, budget: true }));
              }}
              onRequestDeleteRows={(ids) =>
                handleRequestDeleteRows('budget', ids)
              }
              onPopulateTemplate={handlePopulateStarterTemplate}
              isLoading={isLoadingSheet}
            />
          )}

          {activeTab === 'guests' && (
            <GuestSheetView
              items={guestItems}
              onChange={(next) => {
                setGuestItems(next);
                setDirtyTabs((prev) => ({ ...prev, guests: true }));
              }}
              onRequestDeleteRows={(ids) =>
                handleRequestDeleteRows('guests', ids)
              }
              onPopulateTemplate={handlePopulateStarterTemplate}
              isLoading={isLoadingSheet}
            />
          )}

          {activeTab === 'vendors' && (
            <VendorSheetView
              items={vendorItems}
              onChange={(next) => {
                setVendorItems(next);
                setDirtyTabs((prev) => ({ ...prev, vendors: true }));
              }}
              onRequestDeleteRows={(ids) =>
                handleRequestDeleteRows('vendors', ids)
              }
              onPopulateTemplate={handlePopulateStarterTemplate}
              isLoading={isLoadingSheet}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <WorkbookConnectionModal
        isOpen={connectionModalOpen}
        onClose={() => setConnectionModalOpen(false)}
        isAuthenticated={!needsAuth}
        onSignIn={handleSignIn}
        onCreateNew={handleCreateNewSpreadsheet}
        onConnectExisting={handleConnectExistingSpreadsheet}
        recentSheets={recentSheets}
      />

      <ConfirmSyncModal
        action={confirmationAction}
        onClose={() => setConfirmationAction(null)}
      />
    </div>
  );
}
