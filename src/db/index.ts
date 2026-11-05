import Dexie, { Table } from 'dexie';
import { Payment, Customer, AppSettings } from '../types';

export class PaymentTrackerDB extends Dexie {
  payments!: Table<Payment, number>;
  members!: Table<Customer, number>;
  settings!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('PaymentTrackerDB');
    this.version(2).stores({
      payments: '++id, name, amount, type, date, createdAt',
      members: '++id, name, phone, monthlyDue, totalPaid, balanceDue',
      settings: 'key'
    });
  }
}

export const db = new PaymentTrackerDB();

// Default initial settings
export const DEFAULT_SETTINGS: AppSettings = {
  userName: 'Ben',
  targetAmount: 25000,
  currency: '₹',
  voiceLang: 'en-IN',
  theme: 'light',
  isPinProtected: true,
  appPin: '1234'
};

let isSeeding = false;

// Initial Customers / Members with exact requested details
export const INITIAL_CUSTOMERS: Omit<Customer, 'id'>[] = [
  {
    name: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    homeAddress: 'No. 14, Gandhi Street, T. Nagar, Chennai - 600017',
    monthlyDue: 5000,
    totalTarget: 100000,
    totalPaid: 35000,
    balanceDue: 65000,
    startDate: '2026-01-01',
    endingMonth: 'August 2027',
    status: 'active'
  },
  {
    name: 'Suresh Perumal',
    phone: '+91 98765 43211',
    homeAddress: 'Plot 42, Anna Nagar 2nd Avenue, Chennai - 600040',
    monthlyDue: 5000,
    totalTarget: 100000,
    totalPaid: 45000,
    balanceDue: 55000,
    startDate: '2026-01-01',
    endingMonth: 'August 2027',
    status: 'active'
  },
  {
    name: 'Priya Sharma',
    phone: '+91 98765 43212',
    homeAddress: '7A, Lake View Road, West Mambalam, Chennai - 600033',
    monthlyDue: 5000,
    totalTarget: 100000,
    totalPaid: 20000,
    balanceDue: 80000,
    startDate: '2026-01-01',
    endingMonth: 'August 2027',
    status: 'active'
  },
  {
    name: 'Murugan K.',
    phone: '+91 98765 43213',
    homeAddress: '23/4, Bazaar Road, Mylapore, Chennai - 600004',
    monthlyDue: 5000,
    totalTarget: 100000,
    totalPaid: 15000,
    balanceDue: 85000,
    startDate: '2026-01-01',
    endingMonth: 'August 2027',
    status: 'defaulter'
  },
  {
    name: 'Hannah Jones',
    phone: '+91 98765 43214',
    homeAddress: 'Flat 302, Green Park Apts, Velachery, Chennai - 600042',
    monthlyDue: 5000,
    totalTarget: 100000,
    totalPaid: 50000,
    balanceDue: 50000,
    startDate: '2026-01-01',
    endingMonth: 'August 2027',
    status: 'active'
  }
];

export async function seedInitialDataIfNeeded() {
  if (isSeeding) return;
  isSeeding = true;

  try {
    const memberCount = await db.members.count();
    if (memberCount === 0) {
      await db.members.bulkAdd(INITIAL_CUSTOMERS);
    }

    const count = await db.payments.count();
    if (count === 0) {
      const today = new Date();
      const formatDate = (daysAgo: number) => {
        const d = new Date();
        d.setDate(today.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
      };

      const initialPayments: Omit<Payment, 'id'>[] = [
        {
          name: 'Hannah Jones',
          amount: 5000,
          type: 'offline',
          date: formatDate(0),
          note: 'Monthly cash installment',
          createdAt: Date.now() - 3600000 * 2
        },
        {
          name: 'Ravi Kumar',
          amount: 5000,
          type: 'offline',
          date: formatDate(0),
          note: 'Direct cash collection',
          createdAt: Date.now() - 3600000 * 5
        },
        {
          name: 'Samantha Jones',
          amount: 5000,
          type: 'offline',
          date: formatDate(1),
          note: 'Hand-to-hand settlement',
          createdAt: Date.now() - 86400000 * 1
        }
      ];

      await db.payments.bulkAdd(initialPayments);

      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await db.settings.put({ key, value });
      }
    }
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    isSeeding = false;
  }
}
