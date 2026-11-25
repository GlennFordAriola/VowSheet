import {
  BudgetItem,
  GuestItem,
  VendorItem,
  WeddingCategory,
} from '../types/wedding';

export const WEDDING_CATEGORIES: WeddingCategory[] = [
  'Venue & Catering',
  'Photography & Video',
  'Florals & Decor',
  'Attire & Beauty',
  'Music & Entertainment',
  'Stationery & Favors',
  'Officiant & Ceremony',
  'Transportation',
  'Planner & Misc',
];

export const PAYMENT_STATUSES = [
  'Unpaid',
  'Deposit Paid',
  'Paid in Full',
  'Overdue',
] as const;

export const RSVP_STATUSES = ['Pending', 'Attending', 'Declined'] as const;

export const GUEST_SIDES = ['Partner A', 'Partner B', 'Mutual'] as const;

export const MEAL_CHOICES = [
  'Undecided',
  'Herb Chicken',
  'Filet Mignon',
  'Wild Salmon',
  'Vegetarian',
  'Kids Meal',
] as const;

export const CONTRACT_STATUSES = [
  'Researching',
  'Inquiry Sent',
  'Proposal Review',
  'Booked',
  'Paid in Full',
] as const;

export function createStarterTemplate(): {
  budget: BudgetItem[];
  guests: GuestItem[];
  vendors: VendorItem[];
} {
  return {
    budget: [
      {
        id: crypto.randomUUID(),
        item: 'Estate Reception Venue & Tasting Menu',
        category: 'Venue & Catering',
        vendor: 'Briarwood Conservatory',
        estimated: 14500,
        actual: 14850,
        paid: 7425,
        paymentStatus: 'Deposit Paid',
        dueDate: '2027-04-15',
        notes: 'Includes 120-guest plated dinner, linens, and tables',
      },
      {
        id: crypto.randomUUID(),
        item: 'Full-Day Editorial Photography (10 hrs)',
        category: 'Photography & Video',
        vendor: 'Clara Vance Studio',
        estimated: 4800,
        actual: 4800,
        paid: 2400,
        paymentStatus: 'Deposit Paid',
        dueDate: '2027-05-01',
        notes: 'Second shooter included; gallery delivered in 6 weeks',
      },
      {
        id: crypto.randomUUID(),
        item: 'Ceremony Arch, Bouquets & Centerpieces',
        category: 'Florals & Decor',
        vendor: 'Alder & Moss Botanicals',
        estimated: 3600,
        actual: 3450,
        paid: 1000,
        paymentStatus: 'Deposit Paid',
        dueDate: '2027-05-10',
        notes: 'White garden roses, ranunculus, eucalyptus garlands',
      },
      {
        id: crypto.randomUUID(),
        item: 'Live String Quartet + Reception DJ',
        category: 'Music & Entertainment',
        vendor: 'Harbor Ensemble Collective',
        estimated: 2900,
        actual: 2900,
        paid: 2900,
        paymentStatus: 'Paid in Full',
        dueDate: '2027-03-01',
        notes: 'Ceremony strings + 4-hour reception set',
      },
      {
        id: crypto.randomUUID(),
        item: 'Three-Tier Almond & Berry Cake',
        category: 'Venue & Catering',
        vendor: 'Sable Patisserie',
        estimated: 950,
        actual: 0,
        paid: 0,
        paymentStatus: 'Unpaid',
        dueDate: '2027-04-20',
        notes: 'Tasting scheduled for next month',
      },
      {
        id: crypto.randomUUID(),
        item: 'Letterpress Invitations & Day-Of Menus',
        category: 'Stationery & Favors',
        vendor: 'Press & Cedar Paperie',
        estimated: 1400,
        actual: 1320,
        paid: 1320,
        paymentStatus: 'Paid in Full',
        dueDate: '2027-02-15',
        notes: '100 suite sets mailed',
      },
      {
        id: crypto.randomUUID(),
        item: 'Guest Shuttle Coach (Hotel ↔ Venue)',
        category: 'Transportation',
        vendor: 'Northstar Charter',
        estimated: 1150,
        actual: 0,
        paid: 0,
        paymentStatus: 'Unpaid',
        dueDate: '2027-05-15',
        notes: '2 round-trip loops at 4:00 PM and 10:30 PM',
      },
    ],
    guests: [
      {
        id: crypto.randomUUID(),
        fullName: 'Evelyn Mercer',
        household: 'Mercer Family',
        side: 'Partner A',
        email: 'evelyn.mercer@example.com',
        phone: '(415) 555-0142',
        rsvpStatus: 'Attending',
        plusOne: 'Yes',
        mealChoice: 'Wild Salmon',
        dietaryNotes: 'Gluten-free',
        tableNumber: '1',
        thankYouSent: 'Pending',
      },
      {
        id: crypto.randomUUID(),
        fullName: 'Daniel Mercer',
        household: 'Mercer Family',
        side: 'Partner A',
        email: 'daniel.mercer@example.com',
        phone: '(415) 555-0143',
        rsvpStatus: 'Attending',
        plusOne: 'No',
        mealChoice: 'Filet Mignon',
        dietaryNotes: 'None',
        tableNumber: '1',
        thankYouSent: 'Pending',
      },
      {
        id: crypto.randomUUID(),
        fullName: 'Priya Nair',
        household: 'Nair Household',
        side: 'Mutual',
        email: 'priya.nair@example.com',
        phone: '(206) 555-0198',
        rsvpStatus: 'Attending',
        plusOne: 'Yes',
        mealChoice: 'Vegetarian',
        dietaryNotes: 'No dairy',
        tableNumber: '3',
        thankYouSent: 'Pending',
      },
      {
        id: crypto.randomUUID(),
        fullName: 'Lucas Holloway',
        household: 'Holloway Household',
        side: 'Partner B',
        email: 'lucas.holloway@example.com',
        phone: '(312) 555-0174',
        rsvpStatus: 'Pending',
        plusOne: 'No',
        mealChoice: 'Undecided',
        dietaryNotes: '',
        tableNumber: '',
        thankYouSent: 'Pending',
      },
      {
        id: crypto.randomUUID(),
        fullName: 'Hannah Sato',
        household: 'Sato-Kim Household',
        side: 'Partner B',
        email: 'hannah.sato@example.com',
        phone: '(646) 555-0126',
        rsvpStatus: 'Attending',
        plusOne: 'No',
        mealChoice: 'Herb Chicken',
        dietaryNotes: 'Tree nut allergy',
        tableNumber: '2',
        thankYouSent: 'Pending',
      },
      {
        id: crypto.randomUUID(),
        fullName: 'Arthur Bennett',
        household: 'Bennett Family',
        side: 'Partner A',
        email: 'arthur.bennett@example.com',
        phone: '(503) 555-0161',
        rsvpStatus: 'Declined',
        plusOne: 'No',
        mealChoice: 'Undecided',
        dietaryNotes: 'Sending gift',
        tableNumber: '',
        thankYouSent: 'Sent',
      },
    ],
    vendors: [
      {
        id: crypto.randomUUID(),
        businessName: 'Briarwood Conservatory',
        category: 'Venue & Catering',
        contactPerson: 'Maya Lin-Park',
        email: 'events@briarwoodvenue.example',
        phone: '(415) 555-0210',
        website: 'briarwoodvenue.example',
        contractStatus: 'Booked',
        totalFee: 14850,
        depositPaid: 7425,
        serviceDate: '2027-06-12',
        notes: 'Venue walkthrough confirmed 30 days prior',
      },
      {
        id: crypto.randomUUID(),
        businessName: 'Clara Vance Studio',
        category: 'Photography & Video',
        contactPerson: 'Clara Vance',
        email: 'clara@claravancestudio.example',
        phone: '(415) 555-0284',
        website: 'claravancestudio.example',
        contractStatus: 'Booked',
        totalFee: 4800,
        depositPaid: 2400,
        serviceDate: '2027-06-12',
        notes: 'Golden hour portraits at 6:45 PM',
      },
      {
        id: crypto.randomUUID(),
        businessName: 'Alder & Moss Botanicals',
        category: 'Florals & Decor',
        contactPerson: 'Rowan Hale',
        email: 'studio@alderandmoss.example',
        phone: '(510) 555-0239',
        website: 'alderandmoss.example',
        contractStatus: 'Booked',
        totalFee: 3450,
        depositPaid: 1000,
        serviceDate: '2027-06-12',
        notes: 'Setup window starts at 11:00 AM',
      },
      {
        id: crypto.randomUUID(),
        businessName: 'Harbor Ensemble Collective',
        category: 'Music & Entertainment',
        contactPerson: 'Julian Reed',
        email: 'bookings@harborensemble.example',
        phone: '(415) 555-0299',
        website: 'harborensemble.example',
        contractStatus: 'Paid in Full',
        totalFee: 2900,
        depositPaid: 2900,
        serviceDate: '2027-06-12',
        notes: 'Must-play & do-not-play playlist finalized',
      },
      {
        id: crypto.randomUUID(),
        businessName: 'Sable Patisserie',
        category: 'Venue & Catering',
        contactPerson: 'Nadia Laurent',
        email: 'orders@sablepatisserie.example',
        phone: '(415) 555-0267',
        website: 'sablepatisserie.example',
        contractStatus: 'Proposal Review',
        totalFee: 950,
        depositPaid: 0,
        serviceDate: '2027-06-12',
        notes: 'Confirming cake stand rental dimensions',
      },
    ],
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function effectiveItemCost(item: BudgetItem): number {
  return item.actual > 0 ? item.actual : item.estimated;
}

export function exportRowsToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
