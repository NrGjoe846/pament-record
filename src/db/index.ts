import Dexie, { Table } from 'dexie';
import { Payment, Customer, AppSettings } from '../types';
import { getLocalDateString } from '../utils/formatters';

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
  userName: 'User',
  targetAmount: 0,
  currency: '₹',
  voiceLang: 'en-IN',
  appLang: 'en',
  theme: 'light',
  isPinProtected: true,
  appPin: '1234'
};

let isSeeding = false;

export async function seedInitialDataIfNeeded() {
  if (isSeeding) return;
  isSeeding = true;

  try {
    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await db.settings.put({ key, value });
      }
    }
  } catch (err) {
    console.error('Error initializing settings:', err);
  } finally {
    isSeeding = false;
  }
}
