import {
  BudgetItem,
  ConnectedSpreadsheet,
  GuestItem,
  SheetTabMapping,
  VendorItem,
} from '../types/wedding';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export const BUDGET_HEADERS = [
  'Item',
  'Category',
  'Vendor',
  'Estimated ($)',
  'Actual ($)',
  'Paid ($)',
  'Balance ($)',
  'Payment Status',
  'Due Date',
  'Notes',
];

export const GUEST_HEADERS = [
  'Full Name',
  'Household',
  'Side',
  'Email',
  'Phone',
  'RSVP Status',
  'Plus One',
  'Meal Choice',
  'Dietary Notes',
  'Table #',
  'Thank You',
];

export const VENDOR_HEADERS = [
  'Vendor / Business',
  'Category',
  'Contact Person',
  'Email',
  'Phone',
  'Website',
  'Contract Status',
  'Total Fee ($)',
  'Deposit Paid ($)',
  'Balance ($)',
  'Service Date',
  'Notes',
];

export class SheetsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'SheetsApiError';
    this.status = status;
  }
}

async function sheetsFetch<T>(
  url: string,
  accessToken: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let errorMessage = `Google Sheets request failed (${response.status})`;
    try {
      const errBody = await response.json();
      if (errBody?.error?.message) {
        errorMessage = errBody.error.message;
      }
    } catch {
      // ignore non-json error body
    }
    throw new SheetsApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) return urlMatch[1];
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) return trimmed;
  return null;
}

function quoteSheetName(sheetName: string): string {
  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'`;
}

function parseNumber(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val !== 'string') return 0;
  const cleaned = val.replace(/[$,\s]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function findMatchingTab(tabNames: string[], keywords: string[]): string | null {
  for (const kw of keywords) {
    const exact = tabNames.find((name) => name.toLowerCase() === kw);
    if (exact) return exact;
  }
  for (const kw of keywords) {
    const partial = tabNames.find((name) => name.toLowerCase().includes(kw));
    if (partial) return partial;
  }
  return null;
}

interface SpreadsheetMetadataResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
  properties: { title: string };
  sheets: Array<{
    properties: {
      sheetId: number;
      title: string;
      index: number;
    };
  }>;
}

export async function inspectSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<ConnectedSpreadsheet> {
  const data = await sheetsFetch<SpreadsheetMetadataResponse>(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,index)`,
    accessToken
  );

  const tabIds: Record<string, number> = {};
  const allTabNames: string[] = [];

  for (const sheet of data.sheets ?? []) {
    allTabNames.push(sheet.properties.title);
    tabIds[sheet.properties.title] = sheet.properties.sheetId;
  }

  const mapping: SheetTabMapping = {
    budgetTab: findMatchingTab(allTabNames, ['budget', 'expenses', 'costs']),
    guestsTab: findMatchingTab(allTabNames, ['guest list', 'guests', 'rsvp']),
    vendorsTab: findMatchingTab(allTabNames, ['vendors', 'vendor contacts', 'contacts']),
    tabIds,
    allTabNames,
  };

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Wedding Workbook',
    spreadsheetUrl:
      data.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    mapping,
    lastSyncedAt: null,
  };
}

export function budgetItemsToSheetRows(items: BudgetItem[]): (string | number)[][] {
  return [
    BUDGET_HEADERS,
    ...items.map((item, idx) => {
      const rowNum = idx + 2;
      return [
        item.item,
        item.category,
        item.vendor,
        item.estimated,
        item.actual,
        item.paid,
        `=IF(E${rowNum}>0,E${rowNum},D${rowNum})-F${rowNum}`,
        item.paymentStatus,
        item.dueDate,
        item.notes,
      ];
    }),
  ];
}

export function guestItemsToSheetRows(items: GuestItem[]): (string | number)[][] {
  return [
    GUEST_HEADERS,
    ...items.map((guest) => [
      guest.fullName,
      guest.household,
      guest.side,
      guest.email,
      guest.phone,
      guest.rsvpStatus,
      guest.plusOne,
      guest.mealChoice,
      guest.dietaryNotes,
      guest.tableNumber,
      guest.thankYouSent,
    ]),
  ];
}

export function vendorItemsToSheetRows(items: VendorItem[]): (string | number)[][] {
  return [
    VENDOR_HEADERS,
    ...items.map((vendor, idx) => {
      const rowNum = idx + 2;
      return [
        vendor.businessName,
        vendor.category,
        vendor.contactPerson,
        vendor.email,
        vendor.phone,
        vendor.website,
        vendor.contractStatus,
        vendor.totalFee,
        vendor.depositPaid,
        `=H${rowNum}-I${rowNum}`,
        vendor.serviceDate,
        vendor.notes,
      ];
    }),
  ];
}

function buildHeaderIndex(
  headerRow: unknown[] | undefined,
  expectedHeaders: string[]
): Record<string, number> {
  const indexMap: Record<string, number> = {};
  if (!headerRow || headerRow.length === 0) {
    expectedHeaders.forEach((h, idx) => {
      indexMap[h] = idx;
    });
    return indexMap;
  }

  const normalized = headerRow.map((cell) =>
    String(cell ?? '')
      .trim()
      .toLowerCase()
  );

  expectedHeaders.forEach((expected, fallbackIdx) => {
    const cleanKey = expected.replace(/\s*\(\$\)/g, '').toLowerCase();
    const matched = normalized.findIndex(
      (col) => col === expected.toLowerCase() || col.includes(cleanKey)
    );
    indexMap[expected] = matched >= 0 ? matched : fallbackIdx;
  });

  return indexMap;
}

export function parseBudgetRows(values: unknown[][] | undefined): BudgetItem[] {
  if (!values || values.length <= 1) return [];
  const headerIdx = buildHeaderIndex(values[0], BUDGET_HEADERS);

  return values
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .filter((row) => {
      const firstCell = String(row[headerIdx['Item']] ?? '').trim().toLowerCase();
      return firstCell !== 'total' && firstCell !== 'totals';
    })
    .map((row) => ({
      id: crypto.randomUUID(),
      item: String(row[headerIdx['Item']] ?? ''),
      category: String(row[headerIdx['Category']] ?? 'Venue & Catering') || 'Venue & Catering',
      vendor: String(row[headerIdx['Vendor']] ?? ''),
      estimated: parseNumber(row[headerIdx['Estimated ($)']]),
      actual: parseNumber(row[headerIdx['Actual ($)']]),
      paid: parseNumber(row[headerIdx['Paid ($)']]),
      paymentStatus:
        String(row[headerIdx['Payment Status']] ?? 'Unpaid') || 'Unpaid',
      dueDate: String(row[headerIdx['Due Date']] ?? ''),
      notes: String(row[headerIdx['Notes']] ?? ''),
    }));
}

export function parseGuestRows(values: unknown[][] | undefined): GuestItem[] {
  if (!values || values.length <= 1) return [];
  const headerIdx = buildHeaderIndex(values[0], GUEST_HEADERS);

  return values
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) => ({
      id: crypto.randomUUID(),
      fullName: String(row[headerIdx['Full Name']] ?? ''),
      household: String(row[headerIdx['Household']] ?? ''),
      side: String(row[headerIdx['Side']] ?? 'Mutual') || 'Mutual',
      email: String(row[headerIdx['Email']] ?? ''),
      phone: String(row[headerIdx['Phone']] ?? ''),
      rsvpStatus:
        String(row[headerIdx['RSVP Status']] ?? 'Pending') || 'Pending',
      plusOne: String(row[headerIdx['Plus One']] ?? 'No') || 'No',
      mealChoice:
        String(row[headerIdx['Meal Choice']] ?? 'Undecided') || 'Undecided',
      dietaryNotes: String(row[headerIdx['Dietary Notes']] ?? ''),
      tableNumber: String(row[headerIdx['Table #']] ?? ''),
      thankYouSent:
        String(row[headerIdx['Thank You']] ?? 'Pending') || 'Pending',
    }));
}

export function parseVendorRows(values: unknown[][] | undefined): VendorItem[] {
  if (!values || values.length <= 1) return [];
  const headerIdx = buildHeaderIndex(values[0], VENDOR_HEADERS);

  return values
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
    .map((row) => ({
      id: crypto.randomUUID(),
      businessName: String(row[headerIdx['Vendor / Business']] ?? ''),
      category:
        String(row[headerIdx['Category']] ?? 'Venue & Catering') ||
        'Venue & Catering',
      contactPerson: String(row[headerIdx['Contact Person']] ?? ''),
      email: String(row[headerIdx['Email']] ?? ''),
      phone: String(row[headerIdx['Phone']] ?? ''),
      website: String(row[headerIdx['Website']] ?? ''),
      contractStatus:
        String(row[headerIdx['Contract Status']] ?? 'Researching') ||
        'Researching',
      totalFee: parseNumber(row[headerIdx['Total Fee ($)']]),
      depositPaid: parseNumber(row[headerIdx['Deposit Paid ($)']]),
      serviceDate: String(row[headerIdx['Service Date']] ?? ''),
      notes: String(row[headerIdx['Notes']] ?? ''),
    }));
}

export async function loadWorkbookData(
  accessToken: string,
  spreadsheetId: string,
  mapping: SheetTabMapping
): Promise<{
  budget: BudgetItem[];
  guests: GuestItem[];
  vendors: VendorItem[];
}> {
  const ranges: string[] = [];
  if (mapping.budgetTab) ranges.push(`${quoteSheetName(mapping.budgetTab)}!A1:J1000`);
  if (mapping.guestsTab) ranges.push(`${quoteSheetName(mapping.guestsTab)}!A1:K1000`);
  if (mapping.vendorsTab) ranges.push(`${quoteSheetName(mapping.vendorsTab)}!A1:L1000`);

  if (ranges.length === 0) {
    return { budget: [], guests: [], vendors: [] };
  }

  const query = ranges
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&');

  const response = await sheetsFetch<{
    valueRanges: Array<{ range: string; values?: unknown[][] }>;
  }>(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet?${query}`,
    accessToken
  );

  let idx = 0;
  const budget = mapping.budgetTab
    ? parseBudgetRows(response.valueRanges?.[idx++]?.values)
    : [];
  const guests = mapping.guestsTab
    ? parseGuestRows(response.valueRanges?.[idx++]?.values)
    : [];
  const vendors = mapping.vendorsTab
    ? parseVendorRows(response.valueRanges?.[idx++]?.values)
    : [];

  return { budget, guests, vendors };
}

export async function createWeddingSpreadsheet(
  accessToken: string,
  title: string,
  initialData: {
    budget: BudgetItem[];
    guests: GuestItem[];
    vendors: VendorItem[];
  }
): Promise<ConnectedSpreadsheet> {
  const created = await sheetsFetch<SpreadsheetMetadataResponse>(
    SHEETS_API_BASE,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        properties: { title: title.trim() || 'Wedding Planner Workbook' },
        sheets: [
          {
            properties: {
              title: 'Budget',
              index: 0,
              gridProperties: { frozenRowCount: 1 },
            },
          },
          {
            properties: {
              title: 'Guest List',
              index: 1,
              gridProperties: { frozenRowCount: 1 },
            },
          },
          {
            properties: {
              title: 'Vendors',
              index: 2,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        ],
      }),
    }
  );

  const tabIds: Record<string, number> = {};
  for (const s of created.sheets) {
    tabIds[s.properties.title] = s.properties.sheetId;
  }

  const budgetRows = budgetItemsToSheetRows(initialData.budget);
  const guestRows = guestItemsToSheetRows(initialData.guests);
  const vendorRows = vendorItemsToSheetRows(initialData.vendors);

  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(created.spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: "'Budget'!A1", values: budgetRows },
          { range: "'Guest List'!A1", values: guestRows },
          { range: "'Vendors'!A1", values: vendorRows },
        ],
      }),
    }
  );

  // Format header rows & currency columns nicely in Google Sheets
  const formatRequests = [
    ...[tabIds['Budget'], tabIds['Guest List'], tabIds['Vendors']].map((sheetId) => ({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.945, green: 0.96, blue: 0.976 },
            textFormat: { bold: true, fontSize: 10 },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    })),
    {
      repeatCell: {
        range: {
          sheetId: tabIds['Budget'],
          startRowIndex: 1,
          startColumnIndex: 3,
          endColumnIndex: 7,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'CURRENCY', pattern: '$#,##0' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: tabIds['Vendors'],
          startRowIndex: 1,
          startColumnIndex: 7,
          endColumnIndex: 10,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'CURRENCY', pattern: '$#,##0' },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
  ];

  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(created.spreadsheetId)}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ requests: formatRequests }),
    }
  );

  return {
    spreadsheetId: created.spreadsheetId,
    title: created.properties.title,
    spreadsheetUrl:
      created.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`,
    mapping: {
      budgetTab: 'Budget',
      guestsTab: 'Guest List',
      vendorsTab: 'Vendors',
      tabIds,
      allTabNames: ['Budget', 'Guest List', 'Vendors'],
    },
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function ensureWeddingTabs(
  accessToken: string,
  spreadsheet: ConnectedSpreadsheet,
  missingTabs: Array<'Budget' | 'Guest List' | 'Vendors'>
): Promise<ConnectedSpreadsheet> {
  if (missingTabs.length === 0) return spreadsheet;

  const requests = missingTabs.map((title) => ({
    addSheet: {
      properties: {
        title,
        gridProperties: { frozenRowCount: 1 },
      },
    },
  }));

  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheet.spreadsheetId)}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ requests }),
    }
  );

  return inspectSpreadsheet(accessToken, spreadsheet.spreadsheetId);
}

export async function syncWorkbookTabs(
  accessToken: string,
  spreadsheet: ConnectedSpreadsheet,
  payload: {
    budget?: BudgetItem[];
    guests?: GuestItem[];
    vendors?: VendorItem[];
  }
): Promise<void> {
  const rangesToClear: string[] = [];
  const dataToWrite: Array<{ range: string; values: (string | number)[][] }> = [];

  if (payload.budget && spreadsheet.mapping.budgetTab) {
    const tab = quoteSheetName(spreadsheet.mapping.budgetTab);
    rangesToClear.push(`${tab}!A1:J2000`);
    dataToWrite.push({
      range: `${tab}!A1`,
      values: budgetItemsToSheetRows(payload.budget),
    });
  }

  if (payload.guests && spreadsheet.mapping.guestsTab) {
    const tab = quoteSheetName(spreadsheet.mapping.guestsTab);
    rangesToClear.push(`${tab}!A1:K2000`);
    dataToWrite.push({
      range: `${tab}!A1`,
      values: guestItemsToSheetRows(payload.guests),
    });
  }

  if (payload.vendors && spreadsheet.mapping.vendorsTab) {
    const tab = quoteSheetName(spreadsheet.mapping.vendorsTab);
    rangesToClear.push(`${tab}!A1:L2000`);
    dataToWrite.push({
      range: `${tab}!A1`,
      values: vendorItemsToSheetRows(payload.vendors),
    });
  }

  if (rangesToClear.length === 0) return;

  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheet.spreadsheetId)}/values:batchClear`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ ranges: rangesToClear }),
    }
  );

  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheet.spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataToWrite,
      }),
    }
  );
}
