export type PaymentType = 'offline';

export interface Customer {
  id?: string | number;
  name: string;
  phone: string;
  homeAddress: string;
  monthlyDue: number;     // How much to pay per month (e.g. 5000)
  totalTarget: number;    // Total scheme value (e.g. 100000)
  totalPaid: number;      // Currently completed amount (e.g. 35000)
  balanceDue: number;     // Balance remaining to pay (e.g. 65000)
  startDate: string;      // Start Date
  endingMonth: string;    // Ending Month / completion date
  status?: 'active' | 'completed' | 'defaulter';
}

export interface Payment {
  id?: number;
  name: string;
  amount: number;
  type: PaymentType;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
}

export interface AppSettings {
  userName: string;
  targetAmount: number;
  currency: string;
  voiceLang: string;
  theme: 'system' | 'light' | 'dark';
  isPinProtected: boolean; // Password / PIN protection for production
  appPin: string;          // 4-digit security PIN (default '1234')
}

export type TimeFilter = 'day' | 'month' | 'year';

export interface VoiceParsedResult {
  name: string;
  amount: number;
  type: PaymentType;
  rawTranscript: string;
  confidence: number;
}
