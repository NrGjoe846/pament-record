import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Customer, Payment } from '../types';
import { db } from '../db';

/**
 * Safely format endingMonth into ISO YYYY-MM-DD for Postgres DATE column
 */
export function formatDateForDb(input?: string): string {
  if (!input || input.trim() === '') {
    const d = new Date();
    d.setMonth(d.getMonth() + 20);
    return d.toISOString().split('T')[0];
  }
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    return input.trim();
  }
  // Try parsing natural month/year e.g. "August 2027" or "Aug 2027"
  const parsed = new Date(input.trim() + ' 1');
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }
  // Fallback
  return new Date().toISOString().split('T')[0];
}

/**
 * Health check to verify Supabase connection status
 */
export async function checkSupabaseHealth(): Promise<{ isConnected: boolean; latencyMs: number; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { isConnected: false, latencyMs: 0, error: 'Supabase credentials not configured' };
  }

  const start = performance.now();
  try {
    const { error } = await supabase.from('members').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);
    if (error) {
      return { isConnected: false, latencyMs, error: error.message };
    }
    return { isConnected: true, latencyMs };
  } catch (err: any) {
    return { isConnected: false, latencyMs: 0, error: err?.message || 'Connection error' };
  }
}

/**
 * Saves a customer to local Dexie and syncs to Supabase.
 */
export async function saveCustomerToSupabase(customer: Omit<Customer, 'id'>): Promise<Customer> {
  // 1. Save locally to Dexie first (offline resilience)
  const localId = await db.members.add(customer as Customer);
  const savedCustomer: Customer = { ...customer, id: localId };

  // 2. Sync to Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const dbDate = formatDateForDb(customer.endingMonth);
      const { data, error } = await supabase
        .from('members')
        .insert({
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          home_address: customer.homeAddress || 'Not specified',
          monthly_due: customer.monthlyDue,
          total_target: customer.totalTarget,
          total_paid: customer.totalPaid || 0,
          ending_month: dbDate,
          status: customer.status || 'active'
        })
        .select()
        .single();

      if (error) {
        console.warn('Supabase customer insert warning:', error.message);
      } else if (data) {
        console.log('Customer synced to Supabase successfully:', data.id);
      }
    } catch (err) {
      console.warn('Could not reach Supabase (working offline):', err);
    }
  }

  return savedCustomer;
}

/**
 * Saves a cash payment to Dexie and syncs to Supabase.
 */
export async function savePaymentToSupabase(payment: Omit<Payment, 'id'>): Promise<number> {
  // 1. Save locally to Dexie
  const paymentId = await db.payments.add({ ...payment, type: 'offline' } as Payment);

  // 2. Update local member total paid & balance due
  const localMembers = await db.members.toArray();
  const matched = localMembers.find(m => m.name.toLowerCase() === payment.name.trim().toLowerCase());
  if (matched && matched.id) {
    const newPaid = (matched.totalPaid || 0) + payment.amount;
    const newBalance = Math.max(0, (matched.totalTarget || 100000) - newPaid);
    await db.members.update(Number(matched.id), {
      totalPaid: newPaid,
      balanceDue: newBalance
    });
  }

  // 3. Sync to Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      // Find matching member in Supabase
      let { data: memberData } = await supabase
        .from('members')
        .select('id')
        .ilike('name', payment.name.trim())
        .limit(1)
        .maybeSingle();

      let memberId = memberData?.id;

      // If customer does not exist in Supabase yet, auto-create them so foreign key never fails
      if (!memberId) {
        const dbDate = formatDateForDb(matched?.endingMonth);
        const { data: newMember, error: createErr } = await supabase
          .from('members')
          .insert({
            name: payment.name.trim(),
            phone: matched?.phone || '+91 98000 00000',
            home_address: matched?.homeAddress || 'Local Customer',
            monthly_due: matched?.monthlyDue || 5000,
            total_target: matched?.totalTarget || 100000,
            total_paid: 0,
            ending_month: dbDate,
            status: 'active'
          })
          .select('id')
          .single();

        if (newMember) {
          memberId = newMember.id;
        } else if (createErr) {
          console.warn('Auto-create member note:', createErr.message);
        }
      }

      if (memberId) {
        const receiptNo = `RCT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const { error: pErr } = await supabase.from('payments').insert({
          receipt_number: receiptNo,
          member_id: memberId,
          amount: payment.amount,
          payment_date: payment.date || new Date().toISOString().split('T')[0],
          payment_mode: 'cash',
          notes: payment.note || 'Cash payment'
        });

        if (pErr) {
          console.error('Supabase payment sync warning:', pErr.message);
        } else {
          console.log('Cash payment synced to Supabase successfully:', receiptNo);
        }
      }
    } catch (err) {
      console.warn('Could not sync payment to Supabase (offline mode):', err);
    }
  }

  return paymentId;
}

/**
 * Full two-way sync from Supabase into local Dexie store (Members + Payments)
 */
export async function syncFromSupabase(): Promise<{ membersSynced: number; paymentsSynced: number }> {
  if (!isSupabaseConfigured || !supabase) {
    return { membersSynced: 0, paymentsSynced: 0 };
  }

  let membersSynced = 0;
  let paymentsSynced = 0;

  try {
    // 1. Fetch remote members
    const { data: remoteMembers, error: mErr } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: true });

    if (!mErr && remoteMembers && remoteMembers.length > 0) {
      for (const rm of remoteMembers) {
        const existing = await db.members.where('name').equals(rm.name).first();
        const customerData: Omit<Customer, 'id'> = {
          name: rm.name,
          phone: rm.phone || '',
          homeAddress: rm.home_address || '',
          monthlyDue: parseFloat(rm.monthly_due) || 5000,
          totalTarget: parseFloat(rm.total_target) || 100000,
          totalPaid: parseFloat(rm.total_paid) || 0,
          balanceDue: parseFloat(rm.balance_due) || 0,
          startDate: rm.start_date || new Date().toISOString().split('T')[0],
          endingMonth: rm.ending_month || 'August 2027',
          status: rm.status || 'active'
        };

        if (existing && existing.id) {
          await db.members.update(Number(existing.id), customerData);
        } else {
          await db.members.add(customerData as Customer);
        }
        membersSynced++;
      }
    }

    // 2. Fetch remote payments with customer name
    const { data: remotePayments, error: pErr } = await supabase
      .from('payments')
      .select('id, receipt_number, amount, payment_date, notes, created_at, members(name)')
      .order('created_at', { ascending: false });

    if (!pErr && remotePayments && remotePayments.length > 0) {
      for (const rp of remotePayments) {
        const memberName = (rp as any).members?.name || 'Customer';
        const pDate = rp.payment_date || new Date().toISOString().split('T')[0];
        const pCreatedAt = new Date(rp.created_at).getTime();

        // Check if exists locally by note matching receipt or date/name/amount
        const existing = await db.payments
          .filter(p => p.name === memberName && p.amount === parseFloat(rp.amount) && p.date === pDate)
          .first();

        if (!existing) {
          await db.payments.add({
            name: memberName,
            amount: parseFloat(rp.amount),
            type: 'offline',
            date: pDate,
            note: rp.notes || `Receipt: ${rp.receipt_number}`,
            createdAt: pCreatedAt
          });
          paymentsSynced++;
        }
      }
    }

    console.log(`Supabase Sync complete: ${membersSynced} customers, ${paymentsSynced} payments synced`);
  } catch (err) {
    console.warn('Initial Supabase fetch skipped (offline or network):', err);
  }

  return { membersSynced, paymentsSynced };
}

/**
 * Real-time listener for remote changes from Supabase
 */
export function subscribeToSupabaseChanges(onUpdate: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel('realtime:app-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
      syncFromSupabase().then(onUpdate);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
      syncFromSupabase().then(onUpdate);
    })
    .subscribe();

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}
