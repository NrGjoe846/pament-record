import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialDataIfNeeded, DEFAULT_SETTINGS } from './db';
import { Payment, Customer, TimeFilter, AppSettings, AppLanguage } from './types';
import { SummaryCard } from './components/SummaryCard';
import { ActionRow } from './components/ActionRow';
import { BottomSheet } from './components/BottomSheet';
import { AuthModal } from './components/AuthModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';

const AddPaymentModal = lazy(() => import('./components/AddPaymentModal').then(m => ({ default: m.AddPaymentModal })));
const VoiceCommandModal = lazy(() => import('./components/VoiceCommandModal').then(m => ({ default: m.VoiceCommandModal })));
const CustomersModal = lazy(() => import('./components/CustomersModal').then(m => ({ default: m.CustomersModal })));
const CustomerDetailModal = lazy(() => import('./components/CustomerDetailModal').then(m => ({ default: m.CustomerDetailModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const AddCustomerModal = lazy(() => import('./components/AddCustomerModal').then(m => ({ default: m.AddCustomerModal })));
import { 
  saveCustomerToSupabase, 
  savePaymentToSupabase, 
  syncFromSupabase, 
  subscribeToSupabaseChanges, 
  checkSupabaseHealth 
} from './services/supabaseService';
import { getInitialSession, signOutSupabase, updateSupabaseUserName } from './services/authService';
import { supabase } from './lib/supabase';
import { getLocalDateString, parseLocalDate } from './utils/formatters';

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
      appLang: (sMap.appLang as AppLanguage) || DEFAULT_SETTINGS.appLang || 'en',
      theme: 'light',
      isPinProtected: false,
      appPin: '1234',
    };
  }, [settingsRows]);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
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

  // Lock background page scrolling whenever any modal/popup card is open
  const isAnyModalOpen =
    isAddModalOpen ||
    isVoiceModalOpen ||
    isCustomersModalOpen ||
    isSettingsModalOpen ||
    isAddCustomerOpen ||
    Boolean(selectedCustomer) ||
    !isAuthenticated;

  useEffect(() => {
    if (isAnyModalOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [isAnyModalOpen]);

  // Check Supabase Auth on Mount
  useEffect(() => {
    const syncUserSession = async (session: any) => {
      const userId = session?.user?.id;
      if (userId) {
        const prevUserId = localStorage.getItem('payment_tracker_user_id');
        if (prevUserId && prevUserId !== userId) {
          await db.payments.clear();
          await db.members.clear();
          await db.settings.clear();
        }
        localStorage.setItem('payment_tracker_user_id', userId);
      }

      const metaName =
        session?.user?.user_metadata?.full_name ||
        session?.user?.user_metadata?.name;
      if (metaName) {
        const current = await db.settings.get('userName');
        if (!current || current.value === 'Ben' || current.value === DEFAULT_SETTINGS.userName) {
          await db.settings.put({ key: 'userName', value: String(metaName) });
        }
      }
    };

    const hasOAuthCallback =
      window.location.search.includes('code=') ||
      window.location.hash.includes('access_token=');

    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    if (hasOAuthCallback) {
      fallbackTimer = setTimeout(() => setIsAuthChecking(false), 4000);
    }

    getInitialSession().then(({ session }) => {
      if (session) {
        setIsAuthenticated(true);
        setCurrentUserEmail(session.user?.email || null);
        syncUserSession(session);
        setIsAuthChecking(false);
      } else if (!hasOAuthCallback) {
        setIsAuthenticated(false);
        setCurrentUserEmail(null);
        setIsAuthChecking(false);
      }
    });

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION' && !session && hasOAuthCallback) {
          return;
        }
        if (fallbackTimer) clearTimeout(fallbackTimer);
        setIsAuthenticated(Boolean(session));
        setCurrentUserEmail(session?.user?.email || null);
        if (session) {
          syncUserSession(session);
          if (hasOAuthCallback) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
        setIsAuthChecking(false);
      });

      return () => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        subscription.unsubscribe();
      };
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  // Initialize DB and sync with Supabase backend once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let isCancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function init() {
      // 1. Seed initial local offline database
      await seedInitialDataIfNeeded();
      if (isCancelled) return;

      // 2. Check Supabase backend health
      const health = await checkSupabaseHealth();
      if (isCancelled) return;
      setIsBackendConnected(health.isConnected);

      // 3. Bidirectional sync with Supabase
      if (health.isConnected) {
        await syncFromSupabase();
        if (isCancelled) return;

        // 4. Subscribe to live Supabase Postgres realtime events
        unsubscribe = subscribeToSupabaseChanges(() => {
          console.log('Realtime update received from Supabase');
        });
      }
    }

    init();

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [isAuthenticated]);

  // Filter payments based on selected time filter (Day / Month / Year)
  const filteredPayments = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return allPayments.filter((p) => {
      const pDate = parseLocalDate(p.date);
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
        const pDate = parseLocalDate(p.date);
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
    if (newSettings.userName) {
      await updateSupabaseUserName(newSettings.userName);
    }
  };

  const handleResetData = async () => {
    await db.payments.clear();
    await db.members.clear();
    await db.settings.clear();
    await seedInitialDataIfNeeded();
    setIsSettingsModalOpen(false);
  };

  const handleSignOut = async () => {
    await signOutSupabase();
    await db.payments.clear();
    await db.members.clear();
    await db.settings.clear();
    localStorage.removeItem('payment_tracker_user_id');
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
      date: getLocalDateString(),
      createdAt: Date.now()
    });
    setIsAddModalOpen(true);
  };

  const handleRecordCashForCustomer = (customerName: string, amount: number) => {
    setEditingPayment({
      name: customerName,
      amount: amount,
      type: 'offline',
      date: getLocalDateString(),
      note: 'Monthly cash installment',
      createdAt: Date.now()
    });
    setIsAddModalOpen(true);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F5F4FA] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthModal
        isOpen={true}
        onAuthenticated={() => {
          setIsAuthenticated(true);
          getInitialSession().then(({ session }) => {
            setCurrentUserEmail(session?.user?.email || null);
          });
        }}
      />
    );
  }

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
            lang={settings.appLang}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
            isBackendConnected={isBackendConnected}
          />

          {/* Action Row: Record Cash | Mic | Customers */}
          <ActionRow
            lang={settings.appLang}
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
            lang={settings.appLang}
            timeFilter={timeFilter}
            onFilterChange={setTimeFilter}
            onDeletePayment={handleDeletePayment}
            onSelectPayment={handleEditPayment}
          />
        </section>

      </main>

      {/* MODALS */}
      <Suspense fallback={null}>
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
        appLang={settings.appLang}
        onOpenManualWithDraft={handleOpenManualWithDraft}
        recentNames={recentNames}
        customers={allCustomers}
      />

      {/* Customers Management Modal (Replaced Daily Close) */}
      <CustomersModal
        isOpen={isCustomersModalOpen}
        onClose={() => setIsCustomersModalOpen(false)}
        customers={allCustomers}
        payments={allPayments}
        currency={settings.currency}
        lang={settings.appLang}
        onSelectCustomer={(c) => setSelectedCustomer(c)}
        onAddCustomer={handleAddCustomer}
        onOpenAddCustomerModal={() => setIsAddCustomerOpen(true)}
      />

      {/* Customer Details Drawer */}
      <CustomerDetailModal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
        payments={allPayments}
        currency={settings.currency}
        lang={settings.appLang}
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
        lang={settings.appLang}
      />
      </Suspense>

      {/* Google Authentication Modal */}
      <AuthModal
        isOpen={!isAuthChecking && !isAuthenticated}
        onAuthenticated={() => {
          setIsAuthenticated(true);
          getInitialSession().then(({ session }) => {
            setCurrentUserEmail(session?.user?.email || null);
          });
        }}
      />

      {/* PWA Install Prompt & Update Toast */}
      <PWAInstallBanner />

    </div>
  );
};
