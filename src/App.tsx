import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialDataIfNeeded, DEFAULT_SETTINGS } from './db';
import { Payment, Customer, TimeFilter, AppSettings } from './types';
import { SummaryCard } from './components/SummaryCard';
import { ActionRow } from './components/ActionRow';
import { BottomSheet } from './components/BottomSheet';
import { AddPaymentModal } from './components/AddPaymentModal';
import { VoiceCommandModal } from './components/VoiceCommandModal';
import { CustomersModal } from './components/CustomersModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { AuthModal } from './components/AuthModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { 
  saveCustomerToSupabase, 
  savePaymentToSupabase, 
  syncFromSupabase, 
  subscribeToSupabaseChanges, 
  checkSupabaseHealth 
} from './services/supabaseService';
import { getInitialSession, signOutSupabase } from './services/authService';
import { supabase } from './lib/supabase';

export const App: React.FC = () => {
  // 1. Database Queries
  const allPayments = useLiveQuery(() => db.payments.orderBy('createdAt').reverse().toArray()) || [];
  const allCustomers = useLiveQuery(() => db.members.toArray()) || [];
  const settingsRows = useLiveQuery(() => db.settings.toArray()) || [];

  // Parse settings into object
  const settings: AppSettings = useMemo(() => {
    const sMap: Record<string, any> = {};
    settingsRows.forEach((r) => {
      sMap[r.key] = r.value;
    });
    return {
      userName: sMap.userName || DEFAULT_SETTINGS.userName,
      targetAmount: sMap.targetAmount !== undefined ? sMap.targetAmount : DEFAULT_SETTINGS.targetAmount,
      currency: sMap.currency || DEFAULT_SETTINGS.currency,
      voiceLang: sMap.voiceLang || DEFAULT_SETTINGS.voiceLang,
      theme: 'light',
      isPinProtected: false,
      appPin: '1234',
    };
  }, [settingsRows]);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // UI state
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isCustomersModalOpen, setIsCustomersModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Check Supabase Auth on Mount
  useEffect(() => {
    getInitialSession().then(({ session, isOffline }) => {
      setIsAuthenticated(Boolean(session) || isOffline);
      setCurrentUserEmail(session?.user?.email || (isOffline ? 'Offline Field Agent' : null));
    });

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const isOffline = localStorage.getItem('payment_tracker_offline_auth') === 'true';
        setIsAuthenticated(Boolean(session) || isOffline);
        setCurrentUserEmail(session?.user?.email || (isOffline ? 'Offline Field Agent' : null));
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Initialize DB and sync with Supabase backend on mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function init() {
      // 1. Seed initial local offline database
      await seedInitialDataIfNeeded();

      // 2. Check Supabase backend health
      const health = await checkSupabaseHealth();
      setIsBackendConnected(health.isConnected);

      // 3. Bidirectional sync with Supabase
      if (health.isConnected) {
        await syncFromSupabase();
        
        // 4. Subscribe to live Supabase Postgres realtime events
        unsubscribe = subscribeToSupabaseChanges(() => {
          console.log('Realtime update received from Supabase');
        });
      }
    }

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filter payments based on selected time filter (Day / Month / Year)
  const filteredPayments = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return allPayments.filter((p) => {
      const pDate = new Date(p.date);
      if (timeFilter === 'day') {
        return p.date === todayStr;
      }
      if (timeFilter === 'month') {
        return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
      }
      if (timeFilter === 'year') {
        return pDate.getFullYear() === currentYear;
      }
      return true;
    });
  }, [allPayments, timeFilter]);

  // Calculate Paid This Month for Summary Card
  const paidThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return allPayments
      .filter((p) => {
        const pDate = new Date(p.date);
        return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  // Recent unique names for quick contact avatars
  const recentNames = useMemo(() => {
    const names = new Set<string>();
    allCustomers.forEach(c => names.add(c.name));
    allPayments.forEach((p) => {
      if (p.name) names.add(p.name);
    });
    return Array.from(names);
  }, [allPayments, allCustomers]);

  // Actions
  const handleSaveSettings = async (newSettings: AppSettings) => {
    for (const [key, value] of Object.entries(newSettings)) {
      await db.settings.put({ key, value });
    }
  };

  const handleResetData = async () => {
    if (window.confirm('Reset all payments and restore initial customer data?')) {
      await db.payments.clear();
      await db.members.clear();
      await db.settings.clear();
      await seedInitialDataIfNeeded();
      setIsSettingsModalOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOutSupabase();
    setIsAuthenticated(false);
    setCurrentUserEmail(null);
    setIsSettingsModalOpen(false);
  };

  const handleOpenAdd = () => {
    setEditingPayment(null);
    setIsAddModalOpen(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setIsAddModalOpen(true);
  };

  const handleDeletePayment = async (id: number) => {
    await db.payments.delete(id);
  };

  const handleSavePayment = async (paymentData: Omit<Payment, 'id'>) => {
    if (editingPayment && editingPayment.id) {
      await db.payments.update(editingPayment.id, { ...paymentData, type: 'offline' });
    } else {
      await savePaymentToSupabase(paymentData);
    }
  };

  const handleAddCustomer = async (newCustomer: Omit<Customer, 'id'>) => {
    await saveCustomerToSupabase(newCustomer);
  };

  const handleOpenManualWithDraft = (draft: { name: string; amount: number }) => {
    setEditingPayment({
      name: draft.name,
      amount: draft.amount,
      type: 'offline',
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now()
    });
    setIsAddModalOpen(true);
  };

  const handleRecordCashForCustomer = (customerName: string, amount: number) => {
    setEditingPayment({
      name: customerName,
      amount: amount,
      type: 'offline',
      date: new Date().toISOString().split('T')[0],
      note: 'Monthly cash installment',
      createdAt: Date.now()
    });
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F5F4FA] text-neutral-900 flex flex-col justify-between transition-colors duration-300">
      
      <main className="w-full flex-1 flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden max-w-6xl mx-auto">
        
        {/* Left Pane on Tablet Landscape (40%) / Top on Phone & Tablet Portrait */}
        <section className="w-full lg:w-[40%] flex flex-col lg:h-full lg:border-r border-black/5 lg:overflow-y-auto">
          
          {/* Top Summary Card (Lavender) */}
          <SummaryCard
            userName={settings.userName}
            paidThisMonth={paidThisMonth}
            totalToPay={settings.targetAmount}
            currency={settings.currency}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
            isBackendConnected={isBackendConnected}
          />

          {/* Action Row: Record Cash | 🎤 Mic | 👥 Customers */}
          <ActionRow
            onAddCash={handleOpenAdd}
            onOpenVoice={() => setIsVoiceModalOpen(true)}
            onOpenCustomers={() => setIsCustomersModalOpen(true)}
          />

          {/* Quick Tablet Landscape Tips/Status */}
          <div className="hidden lg:block px-6 py-4 text-xs text-neutral-500">
            <div className="bg-white/80 border border-black/5 rounded-2xl p-4 shadow-xs">
              <span className="font-bold text-neutral-800 block mb-1">
                Customer Payment Tracker
              </span>
              <p className="leading-relaxed text-neutral-600">
                Click on "Customers" in the action row to view addresses, monthly dues, balance remaining, and register new members.
              </p>
            </div>
          </div>
        </section>

        {/* Right Pane on Tablet Landscape (60%) / Bottom Sheet on Phone & Tablet Portrait */}
        <section className="w-full lg:w-[60%] flex-1 flex flex-col lg:h-full lg:overflow-y-auto mt-2 lg:mt-0">
          <BottomSheet
            payments={filteredPayments}
            currency={settings.currency}
            timeFilter={timeFilter}
            onFilterChange={setTimeFilter}
            onDeletePayment={handleDeletePayment}
            onSelectPayment={handleEditPayment}
          />
        </section>

      </main>

      {/* MODALS */}
      <AddPaymentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSavePayment}
        currency={settings.currency}
        existingPayment={editingPayment}
        recentNames={recentNames}
      />

      <VoiceCommandModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSavePayment={handleSavePayment}
        currency={settings.currency}
        defaultLang={settings.voiceLang}
        onOpenManualWithDraft={handleOpenManualWithDraft}
        recentNames={recentNames}
      />

      {/* Customers Management Modal (Replaced Daily Close) */}
      <CustomersModal
        isOpen={isCustomersModalOpen}
        onClose={() => setIsCustomersModalOpen(false)}
        customers={allCustomers}
        currency={settings.currency}
        onSelectCustomer={(c) => setSelectedCustomer(c)}
        onAddCustomer={handleAddCustomer}
        onOpenAddCustomerModal={() => setIsAddCustomerOpen(true)}
      />

      {/* Customer Details Drawer */}
      <CustomerDetailModal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
        currency={settings.currency}
        onRecordCashForCustomer={handleRecordCashForCustomer}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetData={handleResetData}
        userEmail={currentUserEmail}
        onSignOut={handleSignOut}
      />

      {/* Dedicated Add Customer Modal with AI Voice Auto-Type */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSaveCustomer={handleAddCustomer}
        currency={settings.currency}
      />

      {/* Supabase Backend Authentication Modal (auth.users) */}
      <AuthModal
        isOpen={!isAuthenticated}
        onAuthenticated={() => {
          setIsAuthenticated(true);
          getInitialSession().then(({ session, isOffline }) => {
            setCurrentUserEmail(session?.user?.email || (isOffline ? 'Offline Field Agent' : null));
          });
        }}
      />

      {/* PWA Install Prompt & Update Toast */}
      <PWAInstallBanner />

    </div>
  );
};
