export type WeddingCategory =
  | 'Venue & Catering'
  | 'Photography & Video'
  | 'Florals & Decor'
  | 'Attire & Beauty'
  | 'Music & Entertainment'
  | 'Stationery & Favors'
  | 'Officiant & Ceremony'
  | 'Transportation'
  | 'Planner & Misc';

export type PaymentStatus = 'Unpaid' | 'Deposit Paid' | 'Paid in Full' | 'Overdue';

export interface BudgetItem {
  id: string;
  item: string;
  category: WeddingCategory | string;
  vendor: string;
  estimated: number;
  actual: number;
  paid: number;
  paymentStatus: PaymentStatus | string;
  dueDate: string;
  notes: string;
}

export type RsvpStatus = 'Pending' | 'Attending' | 'Declined';
export type GuestSide = 'Partner A' | 'Partner B' | 'Mutual';
export type MealChoice = 'Undecided' | 'Herb Chicken' | 'Filet Mignon' | 'Wild Salmon' | 'Vegetarian' | 'Kids Meal';

export interface GuestItem {
  id: string;
  fullName: string;
  household: string;
  side: GuestSide | string;
  email: string;
  phone: string;
  rsvpStatus: RsvpStatus | string;
  plusOne: 'Yes' | 'No' | string;
  mealChoice: MealChoice | string;
  dietaryNotes: string;
  tableNumber: string;
  thankYouSent: 'Sent' | 'Pending' | string;
}

export type ContractStatus = 'Researching' | 'Inquiry Sent' | 'Proposal Review' | 'Booked' | 'Paid in Full';

export interface VendorItem {
  id: string;
  businessName: string;
  category: WeddingCategory | string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  contractStatus: ContractStatus | string;
  totalFee: number;
  depositPaid: number;
  serviceDate: string;
  notes: string;
}

export type SheetTabKey = 'overview' | 'budget' | 'guests' | 'vendors';

export interface SheetTabMapping {
  budgetTab: string | null;
  guestsTab: string | null;
  vendorsTab: string | null;
  tabIds: Record<string, number>;
  allTabNames: string[];
}

export interface ConnectedSpreadsheet {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  mapping: SheetTabMapping;
  lastSyncedAt: string | null;
}

export interface SavedSpreadsheetRef {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  lastOpenedAt: string;
}

export interface ConfirmationAction {
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  variant: 'primary' | 'danger';
  onConfirm: () => Promise<void>;
}
