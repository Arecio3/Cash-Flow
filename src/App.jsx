import { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  DollarSign, 
  Tag, 
  Filter, 
  Sparkles,
  RefreshCw,
  Check,
  CreditCard as CreditCardIcon,
  X,
  Target,
  LogOut,
  Edit2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { format } from 'date-fns';

// Supabase integrations
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { useTransactions } from './hooks/useTransactions';
import { useCreditCards } from './hooks/useCreditCards';
import { useBills } from './hooks/useBills';
import { useInvestmentGoals } from './hooks/useInvestmentGoals';
import { hasLocalData, migrateLocalData } from './lib/migrate';
import { useToast } from './hooks/useToast';
import { OfflineBanner } from './components/OfflineBanner';
import { InstallPrompt } from './components/InstallPrompt';

import { ImportModal } from './components/ImportModal';
import { Dashboard } from './components/Dashboard';
import { CreditCardTracker } from './components/CreditCardTracker';
import { TransactionLog } from './components/TransactionLog';
import { useBudgets } from './hooks/useBudgets';
import { calculateMonthlyObligations } from './lib/calculations';

// Local storage key for persistent logs (e.g. recurring bill paid statuses)
const storage = {
  get: (key, fallback) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key} to storage:`, e);
    }
  }
};

const CATEGORY_EMOJIS = {
  Housing: '🏠',
  Food: '🍔',
  Transport: '🚗',
  Utilities: '⚡',
  Entertainment: '🎬',
  Healthcare: '🏥',
  'Credit Card': '💳',
  Income: '💰',
  Other: '📦'
};

const CATEGORIES = Object.keys(CATEGORY_EMOJIS);

const CATEGORY_COLORS = {
  Housing: '#3b82f6',
  Food: '#f59e0b',
  Transport: '#8b5cf6',
  Utilities: '#06b6d4',
  Entertainment: '#ec4899',
  Healthcare: '#14b8a6',
  'Credit Card': '#f43f5e',
  Income: '#10b981',
  Other: '#6b7280'
};

const getIssuerColor = (issuer) => {
  switch (issuer?.toLowerCase()) {
    case 'chase': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
    case 'amex': return { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4', border: 'rgba(6, 182, 212, 0.3)' };
    case 'apple': return { bg: 'rgba(243, 244, 246, 0.1)', text: '#f3f4f6', border: 'rgba(243, 244, 246, 0.2)' };
    case 'capital one': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
    case 'citi': return { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', border: 'rgba(249, 115, 22, 0.3)' };
    case 'discover': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
    default: return { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', border: 'rgba(107, 114, 128, 0.3)' };
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const getSampleData = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yyyymm = `${year}-${month}`;

  const defaultCards = [
    { id: 'cc1', name: 'Chase Freedom', issuer: 'Chase', balance: 0, limit: 5000, cashback: 1.5, statementClose: '15th', notes: 'groceries' },
    { id: 'cc2', name: 'Amex Gold', issuer: 'Amex', balance: 3000, limit: 10000, cashback: 2.0, statementClose: '20th', notes: 'dining' },
    { id: 'cc3', name: 'Capital One Venture', issuer: 'Capital One', balance: 6600, limit: 12000, cashback: 2.0, statementClose: '28th', notes: 'travel' }
  ];

  const defaultBills = [
    { id: 'b1', name: 'Apartment Rent', amount: 1200.00, category: 'Housing', date: `${yyyymm}-01`, paid: true, cardId: 'cc2', recurring: true },
    { id: 'b2', name: 'Electric Bill', amount: 110.00, category: 'Utilities', date: `${yyyymm}-10`, paid: false, cardId: 'cc1', recurring: true },
    { id: 'b3', name: 'Comcast Internet', amount: 75.00, category: 'Utilities', date: `${yyyymm}-12`, paid: false, cardId: 'cc1', recurring: true },
    { id: 'b4', name: 'Health Insurance', amount: 220.00, category: 'Healthcare', date: `${yyyymm}-15`, paid: false, cardId: 'cc3', recurring: true },
    { id: 'b5', name: 'Car Insurance', amount: 180.00, category: 'Transport', date: `${yyyymm}-20`, paid: true, cardId: 'cc2', recurring: true },
    { id: 'b6', name: 'Netflix Premium', amount: 22.99, category: 'Entertainment', date: `${yyyymm}-22`, paid: false, cardId: 'cc3', recurring: true }
  ];

  const defaultGoals = [
    { id: 'g1', name: 'Emergency Fund', target: 10000, contribution: 400, invested: 3200 }
  ];

  const defaultTransactions = [
    { id: 't1', description: 'Bi-weekly Paycheck', amount: 4000.00, type: 'income', category: 'Income', date: `${yyyymm}-01`, cardId: null },
    { id: 't2', description: 'Paid Bill: Apartment Rent', amount: 1200.00, type: 'expense', category: 'Housing', date: `${yyyymm}-01`, cardId: 'cc2' },
    { id: 't3', description: 'Whole Foods', amount: 165.50, type: 'expense', category: 'Food', date: `${yyyymm}-02`, cardId: 'cc2' },
    { id: 't4', description: 'Chevron Gas', amount: 45.20, type: 'expense', category: 'Transport', date: `${yyyymm}-03`, cardId: 'cc1' },
    { id: 't5', description: 'Coffee Shop', amount: 5.80, type: 'expense', category: 'Food', date: `${yyyymm}-04`, cardId: null },
    { id: 't6', description: 'Restaurant Dinner', amount: 95.00, type: 'expense', category: 'Food', date: `${yyyymm}-05`, cardId: 'cc2' },
    { id: 't7', description: 'Paid Bill: Electric Bill', amount: 110.00, type: 'expense', category: 'Utilities', date: `${yyyymm}-10`, cardId: 'cc1' },
    { id: 't8', description: 'Target Store', amount: 82.30, type: 'expense', category: 'Other', date: `${yyyymm}-14`, cardId: 'cc3' },
    { id: 't9', description: 'Paid Bill: Car Insurance', amount: 180.00, type: 'expense', category: 'Transport', date: `${yyyymm}-20`, cardId: 'cc2' },
    { id: 't10', description: 'Local Restaurant', amount: 68.00, type: 'expense', category: 'Food', date: `${yyyymm}-21`, cardId: 'cc2' }
  ];

  return { cards: defaultCards, bills: defaultBills, goals: defaultGoals, transactions: defaultTransactions };
};


function App() {
  // --- Auth state ---
  const { user, loading: authLoading, signOut } = useAuth();

  // --- Real-time Status ---
  const [realtimeStatus, setRealtimeStatus] = useState('connected');

  // --- Supabase custom hooks for data ---
  const { creditCards, update: updateCard, add: addCard, remove: removeCard, loading: cardLoading, availableCreditPerCard, totalAvailableCredit, totalOwed } = useCreditCards(user?.id, setRealtimeStatus);
  const { bills, update: updateBill, add: addBill, remove: removeBill, loading: billsLoading } = useBills(user?.id, setRealtimeStatus);
  const { investmentGoals, update: updateGoal, add: addGoal, remove: removeGoal, loading: goalsLoading } = useInvestmentGoals(user?.id, setRealtimeStatus);

  // --- App View States ---
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [showMobileTxForm, setShowMobileTxForm] = useState(false);
  
  // Mobile Navigation state (0: Dashboard, 1: Cards, 2: Calendar, 3: Goals, 4: Log/Import)
  const [activeTab, setActiveTab] = useState(0);

  // Viewport resize tracker for mobile charts
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Modals / Interaction States ---
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [payingCardId, setPayingCardId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

  // Collapsible / Inline Notes card state
  const [openCardNotes, setOpenCardNotes] = useState({});
  const [inlineEditingCardNotesId, setInlineEditingCardNotesId] = useState(null);
  const [inlineNotesValue, setInlineNotesValue] = useState('');

  // --- Add/Edit Card Form States ---
  const [newCardName, setNewCardName] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [newCardBalance, setNewCardBalance] = useState('');
  const [newCardIssuer, setNewCardIssuer] = useState('Chase');
  const [newCardCashback, setNewCardCashback] = useState('1.5');
  const [newCardCloseDay, setNewCardCloseDay] = useState('15th');
  const [newCardNotes, setNewCardNotes] = useState('');
  const [cardErrors, setCardErrors] = useState({});

  // --- Add Goal Form States ---
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalContribution, setNewGoalContribution] = useState('');
  const [newGoalInvested, setNewGoalInvested] = useState('');
  const [goalErrors, setGoalErrors] = useState({});

  // --- Add Bill Form States (within selected calendar day modal) ---
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillCategory, setNewBillCategory] = useState('Utilities');
  const [newBillCardId, setNewBillCardId] = useState('');
  const [newBillRecurring, setNewBillRecurring] = useState(true);
  const [billErrors, setBillErrors] = useState({});

  // --- Transaction Form States ---
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState('expense'); // 'income' or 'expense'
  const [txCategory, setTxCategory] = useState('Food');
  const [txCardId, setTxCardId] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txErrors, setTxErrors] = useState({});
  const [successFlash, setSuccessFlash] = useState(false);

  // --- Search & Filters State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');

  // Track manual paid status logs for specific dates (local state)
  const [paidBillsLog, setPaidBillsLog] = useState(() => {
    return storage.get('cashflow_paid_bills_log', {});
  });

  // Default assigned card selection for forms
  useEffect(() => {
    if (creditCards && creditCards.length > 0 && !newBillCardId) {
      setTimeout(() => {
        setNewBillCardId(creditCards[0].id);
      }, 0);
    }
  }, [creditCards, newBillCardId]);

  // Sync paid bills logs to local storage
  useEffect(() => {
    storage.set('cashflow_paid_bills_log', paidBillsLog);
  }, [paidBillsLog]);

  // Trigger migration banner if local data is detected on mount
  useEffect(() => {
    if (user) {
      setTimeout(() => {
        setShowMigrationBanner(hasLocalData());
      }, 0);
    }
  }, [user]);

  // --- Toast Manager Helper ---
  const addToast = (message, toastType = 'success') => {
    showToast(message, toastType === 'delete' ? 'error' : toastType);
  };

  // Pre-populate Edit Card form
  const handleOpenEditCard = (card) => {
    setEditingCard(card);
    setNewCardName(card.name);
    setNewCardIssuer(card.issuer);
    setNewCardLimit(card.limit.toString());
    setNewCardBalance(card.balance.toString());
    setNewCardCashback(card.cashback.toString());
    setNewCardCloseDay(card.statementClose);
    setNewCardNotes(card.notes || '');
    setCardErrors({});
    setShowAddCard(true);
  };

  // Close Add/Edit Card modal
  const handleCloseCardForm = () => {
    setEditingCard(null);
    setNewCardName('');
    setNewCardLimit('');
    setNewCardBalance('');
    setNewCardIssuer('Chase');
    setNewCardCashback('1.5');
    setNewCardCloseDay('15th');
    setNewCardNotes('');
    setCardErrors({});
    setShowAddCard(false);
  };

  // Inline notes edit activation
  const handleStartInlineNotesEdit = (card) => {
    setInlineEditingCardNotesId(card.id);
    setInlineNotesValue(card.notes || '');
  };

  // Inline notes save
  const handleSaveInlineNotes = async (cardId) => {
    try {
      await updateCard(cardId, { notes: inlineNotesValue });
      addToast('Notes updated!');
      setInlineEditingCardNotesId(null);
    } catch {
      addToast('Failed to update notes.', 'delete');
    }
  };

  // Toggle notes collapsible visibility
  const toggleNotesCollapse = (cardId) => {
    setOpenCardNotes(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // --- Auto-Charge Pending Bills on Load (Supabase integration) ---
  useEffect(() => {
    if (!user || bills.length === 0 || creditCards.length === 0) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();

    let changed = false;
    const cardsToUpdate = {};
    const txToInsert = [];
    const updatedLog = { ...paidBillsLog };

    bills.forEach((b) => {
      const bDateObj = new Date(b.date + 'T00:00:00');

      if (!b.recurring) {
        if (b.date <= todayStr && !b.paid) {
          b.paid = true;
          changed = true;
          
          if (b.cardId) {
            cardsToUpdate[b.cardId] = (cardsToUpdate[b.cardId] ?? 0) + b.amount;
            txToInsert.push({
              description: `Auto-charged Bill: ${b.name}`,
              amount: b.amount,
              type: 'expense',
              category: b.category,
              date: b.date,
              cardId: b.cardId
            });
            updateBill(b.id, { paid: true });
          }
        }
      } else {
        const startY = bDateObj.getFullYear();
        const startM = bDateObj.getMonth();
        let tempY = startY;
        let tempM = startM;

        while (tempY < todayYear || (tempY === todayYear && tempM <= todayMonth)) {
          const daysInMonth = new Date(tempY, tempM + 1, 0).getDate();
          const targetDay = Math.min(bDateObj.getDate(), daysInMonth);
          const dateStr = `${tempY}-${String(tempM + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;

          if (dateStr <= todayStr && !updatedLog[`${b.id}-${dateStr}`]) {
            updatedLog[`${b.id}-${dateStr}`] = true;
            changed = true;

            if (b.cardId) {
              cardsToUpdate[b.cardId] = (cardsToUpdate[b.cardId] ?? 0) + b.amount;
              txToInsert.push({
                description: `Auto-charged Bill: ${b.name}`,
                amount: b.amount,
                type: 'expense',
                category: b.category,
                date: dateStr,
                cardId: b.cardId
              });
            }
          }

          tempM++;
          if (tempM > 11) {
            tempM = 0;
            tempY++;
          }
        }
      }
    });

    if (changed) {
      setTimeout(async () => {
        try {
          for (const cardId of Object.keys(cardsToUpdate)) {
            const card = creditCards.find((c) => c.id === cardId);
            if (card) {
              await updateCard(cardId, { balance: card.balance + cardsToUpdate[cardId] });
            }
          }
          for (const tx of txToInsert) {
            await addTx(tx);
          }
          setPaidBillsLog(updatedLog);
          addToast('Auto-charged pending bills to credit cards!');
        } catch (e) {
          console.error('Failed to process auto-charge routing:', e);
        }
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bills, creditCards, user]);

  // --- Month Navigation Helpers ---
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // --- Map Bills for Navigated Month ---
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthlyBills = useMemo(() => {
    return bills.filter((b) => {
      const bDate = new Date(b.date + 'T00:00:00');
      const isSameMonth = bDate.getFullYear() === currentYear && bDate.getMonth() === currentMonth;
      if (isSameMonth) return true;

      if (b.recurring) {
        const isPrior = bDate.getFullYear() < currentYear || (bDate.getFullYear() === currentYear && bDate.getMonth() <= currentMonth);
        if (isPrior) return true;
      }
      return false;
    }).map((b) => {
      const bDate = new Date(b.date + 'T00:00:00');
      if (b.recurring && (bDate.getFullYear() !== currentYear || bDate.getMonth() !== currentMonth)) {
        const daysInTarget = new Date(currentYear, currentMonth + 1, 0).getDate();
        const targetDay = Math.min(bDate.getDate(), daysInTarget);
        const targetDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
        
        return {
          ...b,
          date: targetDateStr,
          paid: paidBillsLog[`${b.id}-${targetDateStr}`] || false
        };
      }
      return b;
    });
  }, [bills, paidBillsLog, currentYear, currentMonth]);

  // Total monthly bills due
  const monthlyBillsTotal = useMemo(() => {
    return monthlyBills.reduce((sum, b) => sum + b.amount, 0);
  }, [monthlyBills]);

  // Hook for Transactions with passed data
  const { 
    transactions, 
    add: addTx, 
    remove: removeTx, 
    loading: txLoading,
    cashExpensesTotal,
    creditExpensesTotal,
    cashIncomeTotal,
    availableCash,
    creditCardChargesThisMonth
  } = useTransactions(user?.id, setRealtimeStatus, creditCards, monthlyBills, currentYear, currentMonth);

  // Group planned payoffs by card id for the selected month
  const plannedPayoffsPerCard = useMemo(() => {
    const groups = {};
    transactions.forEach((tx) => {
      const txDateObj = new Date(tx.date + 'T00:00:00');
      if (txDateObj.getFullYear() === currentYear && txDateObj.getMonth() === currentMonth) {
        if (tx.type === 'expense' && tx.category === 'Credit Card' && tx.cardId) {
          groups[tx.cardId] = (groups[tx.cardId] || 0) + tx.amount;
        }
      }
    });
    return groups;
  }, [transactions, currentYear, currentMonth]);

  // Recalculate balances on load one time
  useEffect(() => {
    if (user && creditCards && creditCards.length > 0 && !cardLoading) {
      import('./lib/recalculate').then(({ checkAndRecalculateBalances }) => {
        checkAndRecalculateBalances(user.id, creditCards, addToast);
      });
    }
  }, [user, creditCards, cardLoading]);

  // --- Calculations for Summary & Waterfall ---
  const monthlySummary = useMemo(() => {
    return {
      income: cashIncomeTotal,
      expenses: cashExpensesTotal + creditExpensesTotal,
      net: availableCash
    };
  }, [cashIncomeTotal, cashExpensesTotal, creditExpensesTotal, availableCash]);

  // Sum of card payments (Credit Card category as expense)
  const monthlyCardPayoffsTotal = useMemo(() => {
    return Object.values(plannedPayoffsPerCard).reduce((sum, val) => sum + val, 0);
  }, [plannedPayoffsPerCard]);

  // Estimated total monthly rewards
  const estimatedTotalRewards = useMemo(() => {
    return creditCards.reduce((sum, card) => sum + (card.balance * ((parseFloat(card.cashback) || 0) / 100)), 0);
  }, [creditCards]);

  // Total monthly obligations
  const monthlyObligations = useMemo(() => {
    return calculateMonthlyObligations(creditCards, monthlyBills).total;
  }, [creditCards, monthlyBills]);

  // --- Investment Goals Completion Dates ---
  const getProjectedDateStr = (goal) => {
    if (goal.invested >= goal.target) return 'Completed!';
    if (!goal.contribution || goal.contribution <= 0) return 'N/A';
    const monthsNeeded = Math.ceil((goal.target - goal.invested) / goal.contribution);
    const dateObj = new Date();
    dateObj.setMonth(dateObj.getMonth() + monthsNeeded);
    return format(dateObj, 'MMM yyyy');
  };

  // --- Spend Envelope Tracker Calculations using custom hook ---
  const spendEnvelopeMetrics = useBudgets({
    transactions,
    creditCards,
    bills: monthlyBills,
    investmentGoals,
    cashAvailable: availableCash,
    currentYear,
    currentMonth
  });

  const daysLeftInMonth = useMemo(() => {
    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();

    if (currentYear < todayY || (currentYear === todayY && currentMonth < todayM)) {
      return 0; // Past month
    }
    const daysInM = new Date(currentYear, currentMonth + 1, 0).getDate();

    if (currentYear === todayY && currentMonth === todayM) {
      return Math.max(1, daysInM - todayD + 1); // Current month
    }
    return daysInM; // Future month
  }, [currentYear, currentMonth]);

  const dailySpendAllowance = useMemo(() => {
    if (daysLeftInMonth <= 0) return 0;
    return spendEnvelopeMetrics.remaining / daysLeftInMonth;
  }, [spendEnvelopeMetrics.remaining, daysLeftInMonth]);



  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayInstance = new Date(year, month, 1);
    const startDayOfWeek = firstDayInstance.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const list = [];

    // Leading days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      list.push({ day: d, isCurrentMonth: false, dateStr });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      list.push({ day: d, isCurrentMonth: true, dateStr });
    }

    // Trailing days from next month
    const totalCells = 42;
    const remaining = totalCells - list.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      list.push({ day: d, isCurrentMonth: false, dateStr });
    }

    return list;
  }, [currentDate]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || tx.category === filterCategory;
        const matchesType = filterType === 'All' || tx.type === filterType;
        return matchesSearch && matchesCategory && matchesType;
      })
      .sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));
  }, [transactions, searchTerm, filterCategory, filterType]);

  // --- Local storage migration handler ---
  const handleMigrateData = async () => {
    try {
      addToast('Migrating local database to Supabase...');
      await migrateLocalData(user.id);
      setShowMigrationBanner(false);
      addToast('Data migration successful!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      console.error(e);
      addToast('Migration failed. Please try again.', 'delete');
    }
  };

  const handleIgnoreMigration = () => {
    localStorage.clear();
    setShowMigrationBanner(false);
    addToast('Local storage cleared.', 'delete');
  };

  // --- Credit Card Action Handlers ---
  const handleAddCard = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!newCardName.trim()) errors.name = 'Card name is required';

    const parsedLimit = parseFloat(newCardLimit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) errors.limit = 'Limit must be positive';

    const parsedBalance = parseFloat(newCardBalance || 0);
    if (isNaN(parsedBalance) || parsedBalance < 0) errors.balance = 'Balance cannot be negative';

    const parsedCashback = parseFloat(newCardCashback);
    if (isNaN(parsedCashback) || parsedCashback < 0) errors.cashback = 'Cashback must be positive';

    if (Object.keys(errors).length > 0) {
      setCardErrors(errors);
      return;
    }

    try {
      const cardPayload = {
        name: newCardName.trim(),
        issuer: newCardIssuer,
        limit: parsedLimit,
        balance: parsedBalance,
        cashback: parsedCashback,
        statementClose: newCardCloseDay,
        notes: newCardNotes.trim()
      };

      if (editingCard) {
        // Edit flow
        await updateCard(editingCard.id, cardPayload);
        addToast(`Card "${cardPayload.name}" updated successfully!`);
      } else {
        // Add flow
        await addCard(cardPayload);
        addToast(`Card "${cardPayload.name}" added successfully!`);
      }

      handleCloseCardForm();
    } catch (err) {
      console.error('Failed to save credit card:', err);
      addToast('Failed to save credit card.', 'delete');
    }
  };

  const handleDeleteCard = async (id) => {
    try {
      const cardToDelete = creditCards.find((c) => c.id === id);
      await removeCard(id);
      addToast(`Deleted card "${cardToDelete?.name}"`, 'delete');
      if (payingCardId === id) setPayingCardId(null);
    } catch (err) {
      console.error('Failed to delete credit card:', err);
      addToast('Failed to delete credit card.', 'delete');
    }
  };

  const handlePayCard = async (e) => {
    e.preventDefault();
    const amountToPay = parseFloat(paymentAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      addToast('Please enter a positive payment amount.', 'delete');
      return;
    }

    const card = creditCards.find((c) => c.id === payingCardId);
    if (!card) return;

    if (amountToPay > card.balance) {
      addToast(`Payment amount exceeds the card balance of ${formatCurrency(card.balance)}`, 'delete');
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const newTx = {
        description: `CC Payoff: ${card.name}`,
        amount: amountToPay,
        type: 'expense',
        category: 'Credit Card',
        date: todayStr,
        cardId: card.id
      };

      await addTx(newTx);
      addToast(`Logged card payment of ${formatCurrency(amountToPay)}!`);

      setPayingCardId(null);
      setPaymentAmount('');
    } catch (err) {
      console.error('Failed to process card payment:', err);
      addToast('Failed to process card payment.', 'delete');
    }
  };

  // --- Investment Goal Action Handlers ---
  const handleAddGoal = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!newGoalName.trim()) errors.name = 'Goal name is required';

    const parsedTarget = parseFloat(newGoalTarget);
    if (isNaN(parsedTarget) || parsedTarget <= 0) errors.target = 'Target must be positive';

    const parsedContrib = parseFloat(newGoalContribution);
    if (isNaN(parsedContrib) || parsedContrib <= 0) errors.contribution = 'Monthly contribution must be positive';

    const parsedInvested = parseFloat(newGoalInvested || 0);
    if (isNaN(parsedInvested) || parsedInvested < 0) errors.invested = 'Invested amount cannot be negative';

    if (Object.keys(errors).length > 0) {
      setGoalErrors(errors);
      return;
    }

    try {
      const newGoal = {
        name: newGoalName.trim(),
        target: parsedTarget,
        contribution: parsedContrib,
        invested: parsedInvested
      };

      await addGoal(newGoal);
      addToast(`Investment Goal "${newGoal.name}" saved!`);

      setNewGoalName('');
      setNewGoalTarget('');
      setNewGoalContribution('');
      setNewGoalInvested('');
      setGoalErrors({});
      setShowAddGoal(false);
    } catch (err) {
      console.error('Failed to create investment goal:', err);
      addToast('Failed to create investment goal.', 'delete');
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      const goalToDelete = investmentGoals.find((g) => g.id === id);
      await removeGoal(id);
      addToast(`Deleted goal "${goalToDelete?.name}"`, 'delete');
    } catch (err) {
      console.error('Failed to delete goal:', err);
      addToast('Failed to delete goal.', 'delete');
    }
  };

  const handleQuickInvest = async (goalId) => {
    const goal = investmentGoals.find((g) => g.id === goalId);
    if (!goal) return;

    try {
      await updateGoal(goalId, { invested: goal.invested + goal.contribution });

      const todayStr = new Date().toISOString().split('T')[0];
      const newTx = {
        description: `Invest Contribution: ${goal.name}`,
        amount: goal.contribution,
        type: 'expense',
        category: 'Other',
        date: todayStr,
        cardId: null
      };

      await addTx(newTx);
      addToast(`Logged investment of ${formatCurrency(goal.contribution)} into ${goal.name}!`);
    } catch (err) {
      console.error('Failed to log quick investment:', err);
      addToast('Failed to log investment.', 'delete');
    }
  };

  // --- Bill Action Handlers ---
  const handleAddBill = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!newBillName.trim()) errors.name = 'Bill name is required';

    const parsedAmt = parseFloat(newBillAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) errors.amount = 'Amount must be positive';

    if (Object.keys(errors).length > 0) {
      setBillErrors(errors);
      return;
    }

    try {
      const newBill = {
        name: newBillName.trim(),
        amount: parsedAmt,
        category: newBillCategory,
        cardId: newBillCardId || null,
        date: selectedCalendarDay,
        recurring: newBillRecurring,
        paid: false
      };

      await addBill(newBill);
      addToast(`Bill "${newBill.name}" scheduled!`);

      setNewBillName('');
      setNewBillAmount('');
      setNewBillCategory('Utilities');
      setNewBillCardId(creditCards[0]?.id || '');
      setNewBillRecurring(true);
      setBillErrors({});
    } catch (err) {
      console.error('Failed to add bill:', err);
      addToast('Failed to schedule bill.', 'delete');
    }
  };

  const handleDeleteBill = async (id) => {
    try {
      const billToDelete = bills.find((b) => b.id === id);
      await removeBill(id);
      addToast(`Deleted bill "${billToDelete?.name}"`, 'delete');
    } catch (err) {
      console.error('Failed to delete bill:', err);
      addToast('Failed to delete bill.', 'delete');
    }
  };

  const handleToggleBillPaid = async (billId, dateStr) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    if (bill.recurring) {
      const logKey = `${billId}-${dateStr}`;
      const isCurrentlyPaid = paidBillsLog[logKey] || false;
      const nextPaidState = !isCurrentlyPaid;

      try {
        setPaidBillsLog((prev) => ({ ...prev, [logKey]: nextPaidState }));

        if (nextPaidState) {
          if (bill.cardId) {
            const card = creditCards.find((c) => c.id === bill.cardId);
            if (card) {
              await updateCard(bill.cardId, { balance: card.balance + bill.amount });
            }
          }
          const newTx = {
            description: `Paid Bill: ${bill.name}`,
            amount: bill.amount,
            type: 'expense',
            category: bill.category,
            date: dateStr,
            cardId: bill.cardId
          };
          await addTx(newTx);
          addToast(`Marked ${bill.name} as paid!`);
        } else {
          // Revert payoff logic
          if (bill.cardId) {
            const card = creditCards.find((c) => c.id === bill.cardId);
            if (card) {
              await updateCard(bill.cardId, { balance: Math.max(0, card.balance - bill.amount) });
            }
          }
          const matchingTx = transactions.find(
            (t) => t.date === dateStr && t.description === `Paid Bill: ${bill.name}`
          );
          if (matchingTx) {
            await removeTx(matchingTx.id);
          }
          addToast(`Marked ${bill.name} as unpaid.`, 'delete');
        }
      } catch (err) {
        console.error('Failed to update recurring bill status:', err);
        addToast('Failed to update bill.', 'delete');
      }
    } else {
      // Non-recurring bill
      const nextPaidState = !bill.paid;
      try {
        await updateBill(billId, { paid: nextPaidState });

        if (nextPaidState) {
          if (bill.cardId) {
            const card = creditCards.find((c) => c.id === bill.cardId);
            if (card) {
              await updateCard(bill.cardId, { balance: card.balance + bill.amount });
            }
          }
          const newTx = {
            description: `Paid Bill: ${bill.name}`,
            amount: bill.amount,
            type: 'expense',
            category: bill.category,
            date: dateStr,
            cardId: bill.cardId
          };
          await addTx(newTx);
          addToast(`Marked ${bill.name} as paid!`);
        } else {
          if (bill.cardId) {
            const card = creditCards.find((c) => c.id === bill.cardId);
            if (card) {
              await updateCard(bill.cardId, { balance: Math.max(0, card.balance - bill.amount) });
            }
          }
          const matchingTx = transactions.find(
            (t) => t.date === dateStr && t.description === `Paid Bill: ${bill.name}`
          );
          if (matchingTx) {
            await removeTx(matchingTx.id);
          }
          addToast(`Marked ${bill.name} as unpaid.`, 'delete');
        }
      } catch (err) {
        console.error('Failed to update bill status:', err);
        addToast('Failed to update bill.', 'delete');
      }
    }
  };

  // --- Transaction Action Handlers ---
  const handleTypeChange = (type) => {
    setTxType(type);
    if (type === 'income') {
      setTxCategory('Income');
      setTxCardId('');
    } else {
      setTxCategory('Food');
    }
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!txDesc.trim()) errors.description = 'Description is required';

    const parsedAmt = parseFloat(txAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) errors.amount = 'Amount must be positive';
    if (!txDate) errors.date = 'Date is required';

    if (Object.keys(errors).length > 0) {
      setTxErrors(errors);
      return;
    }

    try {
      const newTx = {
        description: txDesc.trim(),
        amount: parsedAmt,
        type: txType,
        category: txCategory,
        date: txDate,
        cardId: txType === 'expense' ? (txCardId || null) : null
      };

      // Perform utilization warning check
      if (txType === 'expense' && txCardId) {
        const card = creditCards.find((c) => c.id === txCardId);
        if (card) {
          const newBalance = card.balance + parsedAmt;
          const utilRatio = card.limit > 0 ? (newBalance / card.limit) * 100 : 0;
          if (utilRatio > 30) {
            addToast(`${card.name} is now at ${utilRatio.toFixed(0)}% utilization`, 'warning');
          }
        }
      }

      await addTx(newTx);
      setSuccessFlash(true);
      setTimeout(() => setSuccessFlash(false), 800);
      addToast('Transaction logged successfully!');

      setTxDesc('');
      setTxAmount('');
      setTxCardId('');
      setTxErrors({});
      setShowMobileTxForm(false);
    } catch (err) {
      console.error('Failed to log transaction:', err);
      addToast('Failed to log transaction.', 'delete');
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await removeTx(id);
      addToast('Transaction record deleted.', 'delete');
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      addToast('Failed to delete transaction.', 'delete');
    }
  };

  // Bulk confirmation insertions from statement parser
  const handleBulkImportTransactions = async (selectedRows) => {
    try {
      for (const row of selectedRows) {
        const newTx = {
          description: row.description,
          amount: row.amount,
          type: row.type,
          category: row.category,
          date: row.date,
          cardId: row.cardId || null
        };

        await addTx(newTx);
      }
    } catch (err) {
      console.error('Bulk insert failed:', err);
      throw err;
    }
  };

  // Preset resetting
  const handleResetAllData = async () => {
    if (window.confirm('WARNING: This will purge your Supabase tables and restore preset sample records. Continue?')) {
      try {
        addToast('Resetting database preset...');
        
        await supabase.from('transactions').delete().eq('user_id', user.id);
        await supabase.from('bills').delete().eq('user_id', user.id);
        await supabase.from('credit_cards').delete().eq('user_id', user.id);
        await supabase.from('investment_goals').delete().eq('user_id', user.id);

        const sample = getSampleData();
        const cardMap = {};

        for (const c of sample.cards) {
          const newCardId = crypto.randomUUID();
          cardMap[c.id] = newCardId;
          await supabase.from('credit_cards').insert({
            id: newCardId,
            user_id: user.id,
            name: c.name,
            issuer: c.issuer,
            credit_limit: c.limit,
            current_balance: c.balance,
            statement_due_date: c.statementClose,
            cashback_rate: c.cashback,
            notes: c.notes
          });
        }

        const billsToInsert = sample.bills.map((b) => ({
          user_id: user.id,
          name: b.name,
          amount: b.amount,
          category: b.category,
          assigned_card_id: cardMap[b.cardId] || null,
          due_date: b.date,
          is_recurring: b.recurring,
          is_paid: b.paid
        }));
        await supabase.from('bills').insert(billsToInsert);

        const txToInsert = sample.transactions.map((t) => ({
          user_id: user.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category,
          date: t.date,
          linked_card_id: cardMap[t.cardId] || null
        }));
        await supabase.from('transactions').insert(txToInsert);

        const goalsToInsert = sample.goals.map((g) => ({
          user_id: user.id,
          name: g.name,
          target_amount: g.target,
          monthly_target: g.contribution,
          current_amount: g.invested
        }));
        await supabase.from('investment_goals').insert(goalsToInsert);

        setPaidBillsLog({});
        addToast('Reset to original sample dataset.');
        window.location.reload();
      } catch (e) {
        console.error('Error resetting presets:', e);
        addToast('Failed to reset presets.', 'delete');
      }
    }
  };

  // --- Auth Loader Render ---
  if (authLoading) {
    return (
      <div className="auth-overlay">
        <div className="loading-container text-center">
          <RefreshCw size={36} className="spinner-icon text-teal" />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Verifying credentials...</p>
        </div>
      </div>
    );
  }

  // --- Redirect to Auth screen if no session ---
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="dashboard-container">
      {/* Slim Top Bar (52px) */}
      <div className="slim-top-bar">
        <div className="month-selector-wrapper">
          <button onClick={handlePrevMonth} className="summary-nav-btn" aria-label="Previous Month" type="button">
            <ChevronLeft size={16} />
          </button>
          <div className="summary-month-label">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={handleNextMonth} className="summary-nav-btn" aria-label="Next Month" type="button">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="slim-top-bar-center"></div>
        <div className="slim-top-bar-right">
          <button 
            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} 
            className="avatar-circle-btn"
            type="button"
          >
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'U'}
          </button>
        </div>
      </div>

      {/* Offline Banner & PWA Install Sheet */}
      <OfflineBanner />
      <InstallPrompt />

      {/* Migration Banner */}
      {showMigrationBanner && (
        <div className="migration-banner glass-card">
          <div className="migration-banner-content">
            <Sparkles size={18} className="glow-icon text-teal" style={{ marginRight: '8px' }} />
            <span>We found local cache budget data on this device. Import it to your cloud account?</span>
          </div>
          <div className="migration-banner-actions">
            <button onClick={handleMigrateData} className="migrate-confirm-btn">Import Data</button>
            <button onClick={handleIgnoreMigration} className="migrate-ignore-btn">Dismiss</button>
          </div>
        </div>
      )}

      {/* Redesigned Nav Header */}
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={24} />
          </div>
          <div className="brand-text">
            <div className="brand-logo-area" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1>CASH FLOW</h1>
              <span className={`logo-live-dot ${realtimeStatus === 'connected' ? 'live' : 'reconnecting'}`} title={realtimeStatus === 'connected' ? 'Connected to live sync' : 'Reconnecting...'}></span>
            </div>
            <p>CLOUD FINANCE ENGINE</p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="desktop-nav-tabs">
          <button 
            onClick={() => { setActiveTab(0); setShowSettingsDropdown(false); }} 
            className={`desktop-nav-btn ${activeTab === 0 ? 'active' : ''}`}
            type="button"
          >
            <TrendingUp size={16} />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => { setActiveTab(1); setShowSettingsDropdown(false); }} 
            className={`desktop-nav-btn ${activeTab === 1 ? 'active' : ''}`}
            type="button"
          >
            <CreditCardIcon size={16} />
            <span>Credit Cards</span>
          </button>
          <button 
            onClick={() => { setActiveTab(2); setShowSettingsDropdown(false); }} 
            className={`desktop-nav-btn ${activeTab === 2 ? 'active' : ''}`}
            type="button"
          >
            <Calendar size={16} />
            <span>Bills</span>
          </button>
          <button 
            onClick={() => { setActiveTab(3); setShowSettingsDropdown(false); }} 
            className={`desktop-nav-btn ${activeTab === 3 ? 'active' : ''}`}
            type="button"
          >
            <Target size={16} />
            <span>Goals</span>
          </button>
          <button 
            onClick={() => { setActiveTab(4); setShowSettingsDropdown(false); }} 
            className={`desktop-nav-btn ${activeTab === 4 ? 'active' : ''}`}
            type="button"
          >
            <Wallet size={16} />
            <span>Log & Import</span>
          </button>
        </div>

        <div className="header-actions">
          <button 
            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} 
            className="avatar-circle-btn avatar-mobile-circle"
            type="button"
          >
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'U'}
          </button>
        </div>
      </header>

      {/* Settings Dropdown Panel */}
      {showSettingsDropdown && (
        <div className="settings-dropdown-menu glass-card">
          <div className="dropdown-user-info">
            <span className="dropdown-email">{user?.email || 'Logged in user'}</span>
          </div>
          <div className="dropdown-divider"></div>
          <div className="dropdown-item rewards-item">
            <Sparkles size={14} className="text-teal" />
            <span>Rewards: {formatCurrency(estimatedTotalRewards)}</span>
          </div>
          <div className="dropdown-divider"></div>
          <button 
            onClick={async () => {
              setShowSettingsDropdown(false);
              await handleResetAllData();
            }} 
            className="dropdown-btn"
            type="button"
          >
            <RefreshCw size={14} />
            <span>Reset Preset</span>
          </button>
          <button 
            onClick={() => {
              setShowSettingsDropdown(false);
              signOut();
            }} 
            className="dropdown-btn logout"
            type="button"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* --- DASHBOARD VIEW (Tab 0 or Desktop) --- */}
      <div className={`tab-section ${activeTab === 0 ? 'active' : ''}`}>
        <Dashboard 
          transactions={transactions}
          creditCards={creditCards}
          monthlySummary={monthlySummary}
          monthlyBillsTotal={monthlyBillsTotal}
          monthlyCardPayoffsTotal={monthlyCardPayoffsTotal}
          spendEnvelopeMetrics={spendEnvelopeMetrics}
          daysLeftInMonth={daysLeftInMonth}
          dailySpendAllowance={dailySpendAllowance}
          formatCurrency={formatCurrency}
          txLoading={txLoading}
          cardLoading={cardLoading}
          billsLoading={billsLoading}
          goalsLoading={goalsLoading}
          currentDate={currentDate}
          windowWidth={windowWidth}
          cashAvailable={availableCash}
          totalAvailableCredit={totalAvailableCredit}
          totalOwed={totalOwed}
          monthlyObligations={monthlyObligations}
          cashExpensesTotal={cashExpensesTotal}
          creditExpensesTotal={creditExpensesTotal}
          creditCardChargesThisMonth={creditCardChargesThisMonth}
          investmentGoals={investmentGoals}
        />
      </div>

      {/* --- CARDS VIEW (Tab 1 or Desktop) --- */}
      <div className={`tab-section ${activeTab === 1 ? 'active' : ''}`}>
        <CreditCardTracker
          creditCards={creditCards}
          cardLoading={cardLoading}
          creditCardChargesThisMonth={creditCardChargesThisMonth}
          plannedPayoffsPerCard={plannedPayoffsPerCard}
          formatCurrency={formatCurrency}
          getIssuerColor={getIssuerColor}
          openCardNotes={openCardNotes}
          toggleNotesCollapse={toggleNotesCollapse}
          inlineEditingCardNotesId={inlineEditingCardNotesId}
          inlineNotesValue={inlineNotesValue}
          setInlineNotesValue={setInlineNotesValue}
          handleSaveInlineNotes={handleSaveInlineNotes}
          handleStartInlineNotesEdit={handleStartInlineNotesEdit}
          setPayingCardId={setPayingCardId}
          handleOpenEditCard={handleOpenEditCard}
          handleDeleteCard={handleDeleteCard}
          setShowAddCard={setShowAddCard}
          setInlineEditingCardNotesId={setInlineEditingCardNotesId}
        />
      </div>

      {/* --- CALENDAR VIEW (Tab 2 or Desktop) --- */}
      <div className={`tab-section ${activeTab === 2 ? 'active' : ''}`}>
        <div className="glass-card bill-calendar-card full-card">
          <div className="card-title-bar">
            <h2>
              <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
              Bill Calendar
            </h2>
            <div className="calendar-indicator-row">
              <div className="indicator-pill unpaid">Unpaid</div>
              <div className="indicator-pill paid">Paid</div>
            </div>
          </div>

          <div className="calendar-week-headers">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="calendar-header-cell">{d}</div>
            ))}
          </div>

          <div className="calendar-days-grid">
            {billsLoading ? (
              <div className="loading-placeholder" style={{ gridColumn: 'span 7', height: '200px' }}>
                <RefreshCw size={24} className="spinner-icon text-teal" />
                <span>Syncing calendar...</span>
              </div>
            ) : (
              calendarDays.map((cell, idx) => {
                const dayBills = monthlyBills.filter((b) => b.date === cell.dateStr);
                const hasBills = dayBills.length > 0;
                const allPaid = hasBills && dayBills.every((b) => b.paid);
                
                let statusClass = '';
                if (hasBills) {
                  statusClass = allPaid ? 'day-bills-paid' : 'day-bills-unpaid';
                }

                return (
                  <div 
                    key={idx} 
                    className={`calendar-day-cell ${cell.isCurrentMonth ? '' : 'outside-month'} ${statusClass}`}
                    onClick={() => setSelectedCalendarDay(cell.dateStr)}
                  >
                    <span className="day-number">{cell.day}</span>
                    {hasBills && (
                      <div className="bill-indicator-dot"></div>
                    )}

                    {/* Tooltip on Hover */}
                    {hasBills && (
                      <div className="calendar-tooltip">
                        <div className="tooltip-title">Bills ({cell.dateStr}):</div>
                        <ul className="tooltip-list">
                          {dayBills.map((b) => {
                            const card = creditCards.find((c) => c.id === b.cardId);
                            return (
                              <li key={b.id} className={b.paid ? 'paid' : 'unpaid'}>
                                {b.name} ({formatCurrency(b.amount)})
                                <span className="tooltip-card-route"> → {card ? card.name : 'Cash'}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* --- GOALS VIEW (Tab 3 or Desktop) --- */}
      <div className={`tab-section ${activeTab === 3 ? 'active' : ''}`}>
        <div className="glass-card investment-tracker-card full-card">
          <div className="card-title-bar">
            <h2>
              <Target size={18} style={{ color: 'var(--accent-blue)' }} />
              Investment Goals
            </h2>
            <button onClick={() => setShowAddGoal(true)} className="add-btn">
              <Plus size={14} /> Add Goal
            </button>
          </div>

          <div className="goals-grid">
            {goalsLoading ? (
              <div className="skeleton-list">
                {[1].map(i => <div key={i} className="skeleton-card pulse"></div>)}
              </div>
            ) : investmentGoals.length > 0 ? (
              investmentGoals.map((goal) => {
                const progressRatio = goal.target > 0 ? (goal.invested / goal.target) * 100 : 0;
                const projDate = getProjectedDateStr(goal);

                return (
                  <div key={goal.id} className="goal-card teal-theme">
                    <div className="goal-card-header">
                      <div className="goal-title-wrap">
                        <Target size={18} className="goal-icon" />
                        <span className="goal-name">{goal.name}</span>
                      </div>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="goal-delete-btn" title="Delete investment goal">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="goal-metrics">
                      <div className="goal-metric">
                        <span className="goal-lbl">Target</span>
                        <span className="goal-val">{formatCurrency(goal.target)}</span>
                      </div>
                      <div className="goal-metric text-right">
                        <span className="goal-lbl">Invested</span>
                        <span className="goal-val text-teal">{formatCurrency(goal.invested)}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="goal-progress-wrap">
                      <div className="goal-progress-bar">
                        <div 
                          className="goal-progress-fill"
                          style={{ width: `${Math.min(100, progressRatio)}%` }}
                        ></div>
                      </div>
                      
                      <div className="goal-footer">
                        <span>{progressRatio.toFixed(0)}% Completed</span>
                        <span>Monthly: <strong>{formatCurrency(goal.contribution)}</strong></span>
                      </div>
                    </div>

                    <div className="goal-projection-box">
                      <div className="proj-detail">
                        <span>Projected Date:</span>
                        <strong className="text-teal">{projDate}</strong>
                      </div>
                      <button onClick={() => handleQuickInvest(goal.id)} className="quick-invest-btn">
                        Invest {formatCurrency(goal.contribution)}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <Target size={40} className="empty-icon text-muted" />
                <p>No investment goals set.</p>
                <button onClick={() => setShowAddGoal(true)} className="add-btn mt-button">Add Goal</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- TRANSACTIONS LOG & FORMS VIEW (Tab 4 or Desktop) --- */}
      <div className={`tab-section ${activeTab === 4 ? 'active' : ''}`}>
        <section className="workspace-grid full-grid-mobile">
          <TransactionLog
            creditCards={creditCards}
            txLoading={txLoading}
            txDesc={txDesc}
            setTxDesc={setTxDesc}
            txAmount={txAmount}
            setTxAmount={setTxAmount}
            txType={txType}
            txCategory={txCategory}
            setTxCategory={setTxCategory}
            txDate={txDate}
            setTxDate={setTxDate}
            txCardId={txCardId}
            setTxCardId={setTxCardId}
            txErrors={txErrors}
            handleSubmitTransaction={handleSubmitTransaction}
            handleDeleteTransaction={handleDeleteTransaction}
            handleTypeChange={handleTypeChange}
            successFlash={successFlash}
            showMobileTxForm={showMobileTxForm}
            setShowMobileTxForm={setShowMobileTxForm}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            filteredTransactions={filteredTransactions}
            CATEGORIES={CATEGORIES}
            CATEGORY_EMOJIS={CATEGORY_EMOJIS}
            CATEGORY_COLORS={CATEGORY_COLORS}
            formatCurrency={formatCurrency}
            setShowImportModal={setShowImportModal}
          />
        </section>
      </div>

      {/* --- ADD / EDIT CARD MODAL DIALOG --- */}
      {showAddCard && (
        <div className="modal-overlay">
          <div className="modal-box glass-card">
            <div className="modal-header">
              <h3>{editingCard ? 'Edit Credit Card' : 'Add Credit Card'}</h3>
              <button onClick={handleCloseCardForm} className="close-btn" aria-label="Close card form">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddCard} className="modal-form">
              <div className="form-group">
                <label>Card Name</label>
                <input 
                  type="text" 
                  className={`form-input ${cardErrors.name ? 'error' : ''}`}
                  placeholder="e.g. Sapphire Preferred" 
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  style={{ paddingLeft: '16px' }}
                />
                {cardErrors.name && <span className="error-text">{cardErrors.name}</span>}
              </div>

              <div className="form-group">
                <label>Issuer</label>
                <select 
                  className="form-select"
                  value={newCardIssuer}
                  onChange={(e) => setNewCardIssuer(e.target.value)}
                  style={{ paddingLeft: '16px' }}
                >
                  <option value="Chase">Chase</option>
                  <option value="Amex">Amex</option>
                  <option value="Apple">Apple</option>
                  <option value="Capital One">Capital One</option>
                  <option value="Citi">Citi</option>
                  <option value="Discover">Discover</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Credit Limit ($)</label>
                <input 
                  type="number" 
                  className={`form-input ${cardErrors.limit ? 'error' : ''}`}
                  placeholder="e.g. 10000" 
                  value={newCardLimit}
                  onChange={(e) => setNewCardLimit(e.target.value)}
                  style={{ paddingLeft: '16px' }}
                />
                {cardErrors.limit && <span className="error-text">{cardErrors.limit}</span>}
              </div>

              <div className="form-group">
                <label>Current Balance ($)</label>
                <input 
                  type="number" 
                  className={`form-input ${cardErrors.balance ? 'error' : ''}`}
                  placeholder="e.g. 0.00" 
                  value={newCardBalance}
                  onChange={(e) => setNewCardBalance(e.target.value)}
                  style={{ paddingLeft: '16px' }}
                />
                {cardErrors.balance && <span className="error-text">{cardErrors.balance}</span>}
              </div>

              <div className="form-group">
                <label>Cashback Rate (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className={`form-input ${cardErrors.cashback ? 'error' : ''}`}
                  placeholder="e.g. 1.5" 
                  value={newCardCashback}
                  onChange={(e) => setNewCardCashback(e.target.value)}
                  style={{ paddingLeft: '16px' }}
                />
                {cardErrors.cashback && <span className="error-text">{cardErrors.cashback}</span>}
              </div>

              <div className="form-group">
                <label>Statement Close Day</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. 15th" 
                  value={newCardCloseDay}
                  onChange={(e) => setNewCardCloseDay(e.target.value)}
                  style={{ paddingLeft: '16px' }}
                />
              </div>

              {/* Notes Textarea Field */}
              <div className="form-group">
                <label>Notes</label>
                <textarea 
                  className="form-input notes-textarea"
                  placeholder="e.g. Groceries only / 0% APR until March 2026..." 
                  value={newCardNotes}
                  onChange={(e) => setNewCardNotes(e.target.value)}
                  style={{ paddingLeft: '16px', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="submit-btn" style={{ marginTop: '12px' }}>
                <Plus size={16} /> {editingCard ? 'Update Credit Card' : 'Save Credit Card'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD GOAL MODAL DIALOG --- */}
      {showAddGoal && (
        <div className="modal-overlay">
          <div className="modal-box glass-card">
            <div className="modal-header">
              <h3>Add Investment Goal</h3>
              <button onClick={() => setShowAddGoal(false)} className="close-btn" aria-label="Close goal form">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddGoal} className="modal-form">
              <div className="form-group">
                <label>Goal Name</label>
                <input 
                  type="text" 
                  className={`form-input ${goalErrors.name ? 'error' : ''}`}
                  placeholder="e.g. Emergency Fund" 
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  style={{ paddingLeft: '16px' }}
                />
                {goalErrors.name && <span className="error-text">{goalErrors.name}</span>}
              </div>

              <div className="form-group">
                <label>Target Amount ($)</label>
                <input 
                  type="number" 
                  className={`form-input ${goalErrors.target ? 'error' : ''}`}
                  placeholder="e.g. 10000" 
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  style={{ paddingLeft: '16px' }}
                />
                {goalErrors.target && <span className="error-text">{goalErrors.target}</span>}
              </div>

              <div className="form-group">
                <label>Monthly Contribution ($)</label>
                <input 
                  type="number" 
                  className={`form-input ${goalErrors.contribution ? 'error' : ''}`}
                  placeholder="e.g. 400" 
                  value={newGoalContribution}
                  onChange={(e) => setNewGoalContribution(e.target.value)}
                  style={{ paddingLeft: '16px' }}
                />
                {goalErrors.contribution && <span className="error-text">{goalErrors.contribution}</span>}
              </div>

              <div className="form-group">
                <label>Amount Already Saved ($)</label>
                <input 
                  type="number" 
                  className={`form-input ${goalErrors.invested ? 'error' : ''}`}
                  placeholder="e.g. 0" 
                  value={newGoalInvested}
                  onChange={(e) => setNewGoalInvested(e.target.value)}
                  style={{ paddingLeft: '16px' }}
                />
                {goalErrors.invested && <span className="error-text">{goalErrors.invested}</span>}
              </div>

              <button type="submit" className="submit-btn" style={{ marginTop: '12px' }}>
                <Plus size={16} /> Save Goal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MAKE PAYMENT MODAL DIALOG --- */}
      {payingCardId && (
        <div className="modal-overlay">
          <div className="modal-box glass-card">
            <div className="modal-header">
              <h3>Make Card Payment</h3>
              <button onClick={() => setPayingCardId(null)} className="close-btn" aria-label="Close payment modal">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handlePayCard} className="modal-form">
              <div className="modal-card-summary">
                <p>Card: <strong>{creditCards.find((c) => c.id === payingCardId)?.name}</strong></p>
                <p>Balance Owed: <strong>{formatCurrency(creditCards.find((c) => c.id === payingCardId)?.balance || 0)}</strong></p>
              </div>

              <div className="form-group">
                <label>Payment Amount ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-input"
                  placeholder="0.00" 
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  style={{ paddingLeft: '16px' }}
                />
              </div>

              <button type="submit" className="submit-btn" style={{ marginTop: '12px' }}>
                <Check size={16} /> Log Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- CALENDAR DAY DETAILS DIALOG --- */}
      {selectedCalendarDay && (
        <div className="modal-overlay">
          <div className="modal-box glass-card calendar-modal">
            <div className="modal-header">
              <h3>Day Details: {selectedCalendarDay}</h3>
              <button onClick={() => setSelectedCalendarDay(null)} className="close-btn" aria-label="Close day modal">
                <X size={20} />
              </button>
            </div>
            
            <div className="calendar-modal-split">
              {/* Left pane: Scheduled bills */}
              <div className="modal-pane-left">
                <h4>Bills Scheduled</h4>
                <div className="modal-bills-list">
                  {monthlyBills.filter((b) => b.date === selectedCalendarDay).length > 0 ? (
                    monthlyBills.filter((b) => b.date === selectedCalendarDay).map((bill) => {
                      const card = creditCards.find((c) => c.id === bill.cardId);
                      return (
                        <div key={bill.id} className={`modal-bill-item ${bill.paid ? 'paid' : ''}`}>
                          <div className="bill-item-details">
                            <span className="bill-name-lbl">{bill.name}</span>
                            <span className="bill-amt-lbl">
                              {formatCurrency(bill.amount)} routed to <strong>{card ? card.name : 'Cash'}</strong>
                              {bill.recurring && <span className="bill-recur-badge"> (Recur)</span>}
                            </span>
                          </div>
                          <div className="bill-actions">
                            <button 
                              onClick={() => handleToggleBillPaid(bill.id, bill.date)} 
                              className={`bill-toggle-paid-btn ${bill.paid ? 'is-paid' : 'is-unpaid'}`}
                              title={bill.paid ? 'Mark unpaid' : 'Mark paid & charge card'}
                              disabled={billsLoading}
                            >
                              {bill.paid ? <Check size={14} /> : 'Pay'}
                            </button>
                            <button 
                              onClick={() => handleDeleteBill(bill.id)} 
                              className="bill-item-delete-btn"
                              title="Delete bill"
                              disabled={billsLoading}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-modal-state">
                      <p>No bills scheduled on this day.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right pane: Add bill */}
              <div className="modal-pane-right">
                <h4>Add Bill for Day</h4>
                <form onSubmit={handleAddBill} className="modal-form">
                  <div className="form-group">
                    <label>Bill Title</label>
                    <input 
                      type="text" 
                      className={`form-input ${billErrors.name ? 'error' : ''}`}
                      placeholder="e.g. Internet Bill" 
                      value={newBillName}
                      onChange={(e) => setNewBillName(e.target.value)}
                      style={{ paddingLeft: '16px' }}
                    />
                    {billErrors.name && <span className="error-text">{billErrors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label>Amount ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className={`form-input ${billErrors.amount ? 'error' : ''}`}
                      placeholder="0.00" 
                      value={newBillAmount}
                      onChange={(e) => setNewBillAmount(e.target.value)}
                      style={{ paddingLeft: '16px' }}
                    />
                    {billErrors.amount && <span className="error-text">{billErrors.amount}</span>}
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select 
                      className="form-select"
                      value={newBillCategory}
                      onChange={(e) => setNewBillCategory(e.target.value)}
                      style={{ paddingLeft: '16px' }}
                    >
                      {CATEGORIES.filter((c) => c !== 'Income').map((cat) => (
                        <option key={cat} value={cat}>{CATEGORY_EMOJIS[cat]} {cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Route to Card</label>
                    <select 
                      className="form-select"
                      value={newBillCardId}
                      onChange={(e) => setNewBillCardId(e.target.value)}
                      style={{ paddingLeft: '16px' }}
                    >
                      <option value="">None / Cash</option>
                      {creditCards.map((card) => (
                        <option key={card.id} value={card.id}>{card.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group toggle-row" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="recur-bill"
                      checked={newBillRecurring}
                      onChange={(e) => setNewBillRecurring(e.target.checked)}
                    />
                    <label htmlFor="recur-bill" style={{ textTransform: 'none', letterSpacing: 'normal', cursor: 'pointer', marginBottom: 0 }}>
                      Recurring Monthly Bill
                    </label>
                  </div>

                  <button type="submit" className="submit-btn" style={{ marginTop: '8px' }} disabled={billsLoading}>
                    <Plus size={14} /> Add Bill Day
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FINANCIAL STATEMENT IMPORT MODAL --- */}
      {showImportModal && (
        <ImportModal 
          onClose={() => setShowImportModal(false)}
          onImportConfirm={handleBulkImportTransactions}
          creditCards={creditCards}
          existingTransactions={transactions}
          addToast={addToast}
        />
      )}

      {/* Mobile sheet backdrop and bottom menu overlay */}
      {showMobileTxForm && (
        <div className="mobile-sheet-backdrop" onClick={() => setShowMobileTxForm(false)} />
      )}

      {/* Mobile Bottom Navigation with Active Indicator Bar */}
      <div className="mobile-bottom-nav">
        <button onClick={() => setActiveTab(0)} className={`mobile-nav-btn ${activeTab === 0 ? 'active' : ''}`} title="Dashboard" type="button">
          <span className="tab-indicator-line"></span>
          <TrendingUp size={20} />
        </button>
        <button onClick={() => setActiveTab(1)} className={`mobile-nav-btn ${activeTab === 1 ? 'active' : ''}`} title="Cards" type="button">
          <span className="tab-indicator-line"></span>
          <CreditCardIcon size={20} />
        </button>
        <button onClick={() => setActiveTab(2)} className={`mobile-nav-btn ${activeTab === 2 ? 'active' : ''}`} title="Calendar" type="button">
          <span className="tab-indicator-line"></span>
          <Calendar size={20} />
        </button>
        <button onClick={() => setActiveTab(3)} className={`mobile-nav-btn ${activeTab === 3 ? 'active' : ''}`} title="Goals" type="button">
          <span className="tab-indicator-line"></span>
          <Target size={20} />
        </button>
        <button onClick={() => setActiveTab(4)} className={`mobile-nav-btn ${activeTab === 4 ? 'active' : ''}`} title="Log & Imports" type="button">
          <span className="tab-indicator-line"></span>
          <Wallet size={20} />
        </button>
      </div>

    </div>
  );
}

export default App;
