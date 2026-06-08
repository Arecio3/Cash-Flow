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
  ChevronLeft,
  ChevronRight,
  CreditCard as CreditCardIcon,
  X,
  Target,
  Bookmark,
  LogOut
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell
} from 'recharts';

// Supabase integrations
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { useTransactions } from './hooks/useTransactions';
import { useCreditCards } from './hooks/useCreditCards';
import { useBills } from './hooks/useBills';
import { useInvestmentGoals } from './hooks/useInvestmentGoals';
import { hasLocalData, migrateLocalData } from './lib/migrate';

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

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getSampleData = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yyyymm = `${year}-${month}`;

  const defaultCards = [
    { id: 'cc1', name: 'Chase Freedom', issuer: 'Chase', balance: 0, limit: 5000, cashback: 1.5, statementClose: '15th' },
    { id: 'cc2', name: 'Amex Gold', issuer: 'Amex', balance: 3000, limit: 10000, cashback: 2.0, statementClose: '20th' },
    { id: 'cc3', name: 'Capital One Venture', issuer: 'Capital One', balance: 6600, limit: 12000, cashback: 2.0, statementClose: '28th' }
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

const CustomWaterfallTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-recharts-tooltip">
        <p className="custom-tooltip-label">{data.name}</p>
        <p className="custom-tooltip-value" style={{ color: data.color }}>
          Value: ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

function App() {
  // --- Auth state ---
  const { user, loading: authLoading, signOut } = useAuth();

  // --- Supabase custom hooks for data ---
  const { transactions, add: addTx, remove: removeTx, loading: txLoading } = useTransactions(user?.id);
  const { creditCards, update: updateCard, add: addCard, remove: removeCard, loading: cardLoading } = useCreditCards(user?.id);
  const { bills, update: updateBill, add: addBill, remove: removeBill, loading: billsLoading } = useBills(user?.id);
  const { investmentGoals, update: updateGoal, add: addGoal, remove: removeGoal, loading: goalsLoading } = useInvestmentGoals(user?.id);

  // --- App View States ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [toasts, setToasts] = useState([]);
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);

  // --- Modals / Interaction States ---
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [payingCardId, setPayingCardId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // --- Add Card Form States ---
  const [newCardName, setNewCardName] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [newCardBalance, setNewCardBalance] = useState('');
  const [newCardIssuer, setNewCardIssuer] = useState('Chase');
  const [newCardCashback, setNewCardCashback] = useState('1.5');
  const [newCardCloseDay, setNewCardCloseDay] = useState('15th');
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
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type: toastType }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
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
            // Update single bill paid state locally
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
          // Perform card balance updates
          for (const cardId of Object.keys(cardsToUpdate)) {
            const card = creditCards.find((c) => c.id === cardId);
            if (card) {
              await updateCard(cardId, { balance: card.balance + cardsToUpdate[cardId] });
            }
          }
          // Insert transactions
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

  // --- Calculations for Summary & Waterfall ---
  const monthlySummary = useMemo(() => {
    let income = 0;
    let expenses = 0;

    transactions.forEach((tx) => {
      const txDateObj = new Date(tx.date + 'T00:00:00');
      if (txDateObj.getFullYear() === currentYear && txDateObj.getMonth() === currentMonth) {
        const amt = parseFloat(tx.amount) || 0;
        if (tx.type === 'income') {
          income += amt;
        } else {
          expenses += amt;
        }
      }
    });

    return {
      income,
      expenses,
      net: income - expenses
    };
  }, [transactions, currentYear, currentMonth]);

  // Sum of card payments (Credit Card category as expense)
  const monthlyCardPayoffsTotal = useMemo(() => {
    return transactions.reduce((sum, tx) => {
      const txDateObj = new Date(tx.date + 'T00:00:00');
      if (txDateObj.getFullYear() === currentYear && txDateObj.getMonth() === currentMonth) {
        if (tx.type === 'expense' && tx.category === 'Credit Card') {
          return sum + (parseFloat(tx.amount) || 0);
        }
      }
      return sum;
    }, 0);
  }, [transactions, currentYear, currentMonth]);

  // Estimated total monthly rewards
  const estimatedTotalRewards = useMemo(() => {
    return creditCards.reduce((sum, card) => sum + (card.balance * ((parseFloat(card.cashback) || 0) / 100)), 0);
  }, [creditCards]);

  // --- 1. Waterfall Chart Data Calculations ---
  const waterfallData = useMemo(() => {
    const income = monthlySummary.income;
    const billsVal = monthlyBillsTotal;
    const payoffs = monthlyCardPayoffsTotal;
    
    const freeCash = Math.max(0, income - billsVal - payoffs);
    const investTotal = investmentGoals.reduce((sum, g) => sum + (parseFloat(g.contribution) || 0), 0);
    const investClamped = Math.min(freeCash, investTotal);
    const spendVal = Math.max(0, freeCash - investClamped);

    return [
      { name: '1. Paycheck (Income)', range: [0, income], value: income, color: '#10b981' },
      { name: '2. Bills (Charged)', range: [Math.max(0, income - billsVal), income], value: billsVal, color: '#ef4444' },
      { name: '3. CC Payoffs', range: [Math.max(0, income - billsVal - payoffs), Math.max(0, income - billsVal)], value: payoffs, color: '#f43f5e' },
      { name: '4. Free Cash', range: [0, freeCash], value: freeCash, color: '#a855f7' },
      { name: '5. Invest Target', range: [Math.max(0, freeCash - investClamped), freeCash], value: investClamped, color: '#14b8a6' },
      { name: '6. Spend Envelope', range: [0, spendVal], value: spendVal, color: '#3b82f6' }
    ];
  }, [monthlySummary, monthlyBillsTotal, monthlyCardPayoffsTotal, investmentGoals]);

  // --- 4. Investment Goals Completion Dates ---
  const getProjectedDateStr = (goal) => {
    if (goal.invested >= goal.target) return 'Completed!';
    if (!goal.contribution || goal.contribution <= 0) return 'N/A';
    const monthsNeeded = Math.ceil((goal.target - goal.invested) / goal.contribution);
    const dateObj = new Date();
    dateObj.setMonth(dateObj.getMonth() + monthsNeeded);
    return dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // --- 5. Spend Envelope Tracker Calculations ---
  const spendEnvelopeMetrics = useMemo(() => {
    const monthlyBillsVal = monthlyBillsTotal;
    const investTotal = investmentGoals.reduce((sum, g) => sum + (parseFloat(g.contribution) || 0), 0);
    const totalBudget = Math.max(0, monthlySummary.income - monthlyBillsVal - investTotal);

    // Discretionary spent: Expense transactions not card payoffs & not bills
    const spentDiscretionary = transactions.reduce((sum, tx) => {
      const txDateObj = new Date(tx.date + 'T00:00:00');
      if (txDateObj.getFullYear() === currentYear && txDateObj.getMonth() === currentMonth) {
        if (tx.type === 'expense' && tx.category !== 'Credit Card' && !tx.description.startsWith('Paid Bill:') && !tx.description.startsWith('Auto-charged Bill:')) {
          return sum + (parseFloat(tx.amount) || 0);
        }
      }
      return sum;
    }, 0);

    const remaining = Math.max(0, totalBudget - spentDiscretionary);
    const percent = totalBudget > 0 ? (remaining / totalBudget) * 100 : 0;

    return {
      total: totalBudget,
      spent: spentDiscretionary,
      remaining,
      percent
    };
  }, [transactions, monthlySummary, monthlyBillsTotal, investmentGoals, currentYear, currentMonth]);

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

  // Envelope Color indicator
  const spendColorClass = useMemo(() => {
    if (spendEnvelopeMetrics.percent > 50) return 'util-green';
    if (spendEnvelopeMetrics.percent >= 15) return 'util-amber';
    return 'util-red';
  }, [spendEnvelopeMetrics.percent]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayInstance = new Date(year, month, 1);
    const startDayOfWeek = firstDayInstance.getDay(); // 0 (Sun) to 6 (Sat)
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
      const newCard = {
        name: newCardName.trim(),
        issuer: newCardIssuer,
        limit: parsedLimit,
        balance: parsedBalance,
        cashback: parsedCashback,
        statementClose: newCardCloseDay
      };

      await addCard(newCard);
      addToast(`Card "${newCard.name}" added successfully!`);

      // Reset Form
      setNewCardName('');
      setNewCardLimit('');
      setNewCardBalance('');
      setNewCardIssuer('Chase');
      setNewCardCashback('1.5');
      setNewCardCloseDay('15th');
      setCardErrors({});
      setShowAddCard(false);
    } catch (err) {
      console.error('Failed to add credit card:', err);
      addToast('Failed to add credit card.', 'delete');
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
      addToast(`Payment amount exceeds the card balance of $${card.balance.toFixed(2)}`, 'delete');
      return;
    }

    try {
      // Reduce Card Balance
      await updateCard(payingCardId, { balance: Math.max(0, card.balance - amountToPay) });

      // Create Expense Transaction
      const todayStr = new Date().toISOString().split('T')[0];
      const newTx = {
        description: `CC Payoff: ${card.name}`,
        amount: amountToPay,
        type: 'expense',
        category: 'Credit Card',
        date: todayStr,
        cardId: null
      };

      await addTx(newTx);
      addToast(`Logged card payment of $${amountToPay.toFixed(2)}!`);

      // Reset payment states
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

      // Reset Form
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
      addToast(`Deleted investment goal "${goalToDelete?.name}"`, 'delete');
    } catch (err) {
      console.error('Failed to delete goal:', err);
      addToast('Failed to delete goal.', 'delete');
    }
  };

  const handleQuickInvest = async (goalId) => {
    const goal = investmentGoals.find((g) => g.id === goalId);
    if (!goal) return;

    const investAmt = goal.contribution;

    try {
      await updateGoal(goalId, { invested: Math.min(goal.target, goal.invested + investAmt) });

      // Create Expense Transaction
      const todayStr = new Date().toISOString().split('T')[0];
      const newTx = {
        description: `Invested to ${goal.name}`,
        amount: investAmt,
        type: 'expense',
        category: 'Other',
        date: todayStr,
        cardId: null
      };

      await addTx(newTx);
      addToast(`Invested $${investAmt.toFixed(2)} to "${goal.name}"!`);
    } catch (err) {
      console.error('Failed to log quick investment:', err);
      addToast('Failed to log quick investment.', 'delete');
    }
  };

  // --- Bill Action Handlers ---
  const handleAddBill = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!newBillName.trim()) errors.name = 'Bill name is required';

    const amt = parseFloat(newBillAmount);
    if (isNaN(amt) || amt <= 0) errors.amount = 'Amount must be positive';

    if (Object.keys(errors).length > 0) {
      setBillErrors(errors);
      return;
    }

    try {
      const newBill = {
        name: newBillName.trim(),
        amount: amt,
        category: newBillCategory,
        date: selectedCalendarDay,
        paid: false,
        cardId: newBillCardId || null,
        recurring: newBillRecurring
      };

      await addBill(newBill);
      addToast(`Added bill: "${newBill.name}" for ${selectedCalendarDay}!`);

      // Reset Form
      setNewBillName('');
      setNewBillAmount('');
      setBillErrors({});
    } catch (err) {
      console.error('Failed to add bill schedule:', err);
      addToast('Failed to add bill schedule.', 'delete');
    }
  };

  const handleToggleBillPaid = async (billId, instanceDate) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    const key = `${bill.id}-${instanceDate}`;
    const isCurrentlyPaid = bill.recurring ? paidBillsLog[key] : bill.paid;
    const newPaidStatus = !isCurrentlyPaid;

    try {
      if (bill.recurring) {
        setPaidBillsLog((prev) => ({ ...prev, [key]: newPaidStatus }));
      } else {
        await updateBill(billId, { paid: newPaidStatus });
      }

      if (newPaidStatus) {
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
          date: instanceDate,
          cardId: bill.cardId || null
        };

        await addTx(newTx);
        addToast(`Bill "${bill.name}" marked paid & charged!`);
      } else {
        if (bill.cardId) {
          const card = creditCards.find((c) => c.id === bill.cardId);
          if (card) {
            await updateCard(bill.cardId, { balance: Math.max(0, card.balance - bill.amount) });
          }
        }

        const txToDelete = transactions.find((t) => t.description === `Paid Bill: ${bill.name}` && t.amount === bill.amount && t.date === instanceDate);
        if (txToDelete) {
          await removeTx(txToDelete.id);
        }
        addToast(`Bill "${bill.name}" marked unpaid.`);
      }
    } catch (err) {
      console.error('Error toggling bill status:', err);
      addToast('Error toggling bill status.', 'delete');
    }
  };

  const handleDeleteBill = async (billId) => {
    try {
      const billToDelete = bills.find((b) => b.id === billId);
      await removeBill(billId);
      addToast(`Deleted bill "${billToDelete?.name}"`, 'delete');
    } catch (err) {
      console.error('Failed to delete scheduled bill:', err);
      addToast('Failed to delete scheduled bill.', 'delete');
    }
  };

  // --- Transaction Log Action Handlers ---
  const handleTypeChange = (newType) => {
    setTxType(newType);
    setTxCategory(newType === 'income' ? 'Income' : 'Food');
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

    const assignedCardId = txType === 'expense' && txCardId ? txCardId : null;

    try {
      const newTx = {
        description: txDesc.trim(),
        amount: parsedAmt,
        type: txType,
        category: txType === 'income' ? 'Income' : txCategory,
        date: txDate,
        cardId: assignedCardId
      };

      if (assignedCardId) {
        const card = creditCards.find((c) => c.id === assignedCardId);
        if (card) {
          await updateCard(assignedCardId, { balance: card.balance + parsedAmt });
        }
      }

      await addTx(newTx);
      addToast('Transaction recorded successfully!');

      setTxDesc('');
      setTxAmount('');
      setTxErrors({});
      setSuccessFlash(true);
      setTimeout(() => setSuccessFlash(false), 800);
    } catch (err) {
      console.error('Failed to save transaction:', err);
      addToast('Failed to save transaction.', 'delete');
    }
  };

  const handleDeleteTransaction = async (id) => {
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    try {
      if (txToDelete.type === 'expense' && txToDelete.cardId) {
        const card = creditCards.find((c) => c.id === txToDelete.cardId);
        if (card) {
          await updateCard(txToDelete.cardId, { balance: Math.max(0, card.balance - txToDelete.amount) });
        }
      }

      await removeTx(id);
      addToast(`Deleted "${txToDelete.description}"`, 'delete');
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      addToast('Failed to delete transaction.', 'delete');
    }
  };

  // --- Reset Preset Data on Supabase ---
  const handleResetAllData = async () => {
    if (window.confirm('Are you sure you want to reset all data back to original sample presets?')) {
      try {
        // Clear User Records
        await supabase.from('transactions').delete().eq('user_id', user.id);
        await supabase.from('bills').delete().eq('user_id', user.id);
        await supabase.from('credit_cards').delete().eq('user_id', user.id);
        await supabase.from('investment_goals').delete().eq('user_id', user.id);

        // Map and Insert Sample Data
        const sample = getSampleData();
        const cardMap = {};

        const cardsToInsert = sample.cards.map((c) => {
          const newId = crypto.randomUUID();
          cardMap[c.id] = newId;
          return {
            id: newId,
            user_id: user.id,
            name: c.name,
            issuer: c.issuer,
            credit_limit: c.limit,
            current_balance: c.balance,
            statement_due_date: c.statementClose,
            apr: 0,
            cashback_rate: c.cashback
          };
        });
        await supabase.from('credit_cards').insert(cardsToInsert);

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
      {/* Toast Notification */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === 'delete' ? 'delete' : ''}`}>
            {t.type === 'delete' ? <Trash2 size={16} /> : <Sparkles size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

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

      {/* Top Header */}
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={24} />
          </div>
          <div className="brand-text">
            <h1>CASH FLOW</h1>
            <p>CLOUD FINANCE ENGINE</p>
          </div>
        </div>
        
        {/* Month Navigation */}
        <div className="month-navigator">
          <button onClick={handlePrevMonth} className="nav-btn" title="Previous Month">
            <ChevronLeft size={20} />
          </button>
          <div className="current-month-display">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={handleNextMonth} className="nav-btn" title="Next Month">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="header-actions">
          {/* Rewards Badge */}
          <div className="rewards-nav-badge" title="Estimated monthly cashback rewards owed across cards">
            <Sparkles size={14} className="glow-icon" />
            <span>Rewards: {formatCurrency(estimatedTotalRewards)}</span>
          </div>

          <button onClick={handleResetAllData} className="reset-data-btn" title="Reset all data back to default preset samples">
            <RefreshCw size={14} />
            <span>Reset Preset</span>
          </button>

          {/* Sign Out Button */}
          <button onClick={signOut} className="sign-out-btn" title="Sign out of your account">
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Hero: Waterfall Chart */}
      <section className="glass-card waterfall-card">
        <div className="card-title-bar">
          <h2>
            <TrendingUp size={18} style={{ color: 'var(--accent-blue)' }} />
            Waterfall Capital Flow
          </h2>
          <span className="chart-legend-text">INCOME → BILLS → CARD PAYOFFS → FREE CASH → INVEST & SPEND</span>
        </div>
        
        <div className="chart-container waterfall-chart-container">
          {txLoading || cardLoading || billsLoading || goalsLoading ? (
            <div className="loading-placeholder">
              <RefreshCw size={24} className="spinner-icon text-teal" />
              <span>Fetching cloud charts...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                layout="vertical" 
                data={waterfallData}
                margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                <XAxis 
                  type="number"
                  stroke="var(--text-muted)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `$${val}`}
                />
                <YAxis 
                  dataKey="name"
                  type="category"
                  stroke="var(--text-muted)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  width={130}
                />
                <Tooltip content={<CustomWaterfallTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="range" radius={[4, 4, 4, 4]}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Row 2: Credit Card Tracker (Left) & Bill Calendar (Right) */}
      <section className="charts-grid tracker-layout">
        
        {/* Credit Card Tracker */}
        <div className="glass-card cc-tracker-card">
          <div className="card-title-bar">
            <h2>
              <CreditCardIcon size={18} style={{ color: 'var(--accent-blue)' }} />
              Cards & Routing
            </h2>
            <button onClick={() => setShowAddCard(true)} className="add-btn">
              <Plus size={14} /> Add Card
            </button>
          </div>

          <div className="cc-list">
            {cardLoading ? (
              <div className="loading-placeholder">
                <RefreshCw size={20} className="spinner-icon text-teal" />
                <span>Syncing cards...</span>
              </div>
            ) : creditCards.length > 0 ? (
              creditCards.map((card) => {
                const utilRatio = card.limit > 0 ? (card.balance / card.limit) * 100 : 0;
                let utilColorClass = 'util-green';
                if (utilRatio >= 30 && utilRatio <= 60) utilColorClass = 'util-amber';
                else if (utilRatio > 60) utilColorClass = 'util-red';

                const isPaidOff = card.balance === 0;
                const issuerInfo = getIssuerColor(card.issuer);
                const cardRewards = card.balance * ((parseFloat(card.cashback) || 0) / 100);

                return (
                  <div key={card.id} className="cc-card">
                    <div className="cc-header">
                      <div className="cc-title-info">
                        <span className="cc-name">{card.name}</span>
                        <span 
                          className="cc-issuer-badge"
                          style={{
                            backgroundColor: issuerInfo.bg,
                            color: issuerInfo.text,
                            borderColor: issuerInfo.border
                          }}
                        >
                          {card.issuer}
                        </span>
                      </div>
                      <button onClick={() => handleDeleteCard(card.id)} className="cc-delete-btn" title="Delete credit card">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="cc-details-row">
                      <span className="cc-sub-lbl">Statement Close: <strong>{card.statementClose}</strong></span>
                      <span className="cc-sub-lbl">Cashback: <strong>{card.cashback}%</strong></span>
                    </div>

                    <div className="cc-balances">
                      <div>
                        <span className="cc-balance-label">Balance</span>
                        <p className="cc-balance-val">{formatCurrency(card.balance)}</p>
                      </div>
                      <div className="text-right">
                        <span className="cc-balance-label">Limit</span>
                        <p className="cc-limit-val">{formatCurrency(card.limit)}</p>
                      </div>
                    </div>

                    {/* Progress utilization bar */}
                    <div className="cc-util-container">
                      <div className="cc-util-bar">
                        <div 
                          className={`cc-util-fill ${utilColorClass}`}
                          style={{ width: `${Math.min(100, utilRatio)}%` }}
                        ></div>
                      </div>
                      
                      <div className="cc-status-row">
                        {isPaidOff ? (
                          <span className="status-badge paid-off">
                            <Check size={12} /> Paid off
                          </span>
                        ) : (
                          <span className="status-badge utilization">
                            {utilRatio.toFixed(0)}% Utilization
                          </span>
                        )}
                        <span className="cc-rewards-est">
                          Est. Reward: <strong>{formatCurrency(cardRewards)}</strong>
                        </span>
                        <button onClick={() => setPayingCardId(card.id)} className="pay-card-btn">
                          Make Payment
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <p>No credit cards configured.</p>
              </div>
            )}
          </div>
        </div>

        {/* Bill Calendar */}
        <div className="glass-card bill-calendar-card">
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
      </section>

      {/* Row 3: Goals and Envelopes */}
      <section className="charts-grid tracker-layout">
        
        {/* Investment Goal Tracker */}
        <div className="glass-card investment-tracker-card">
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
              <div className="loading-placeholder">
                <RefreshCw size={20} className="spinner-icon text-teal" />
                <span>Syncing goals...</span>
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
                <p>No investment goals set.</p>
              </div>
            )}
          </div>
        </div>

        {/* Spend Envelope */}
        <div className="glass-card spend-envelope-card">
          <div className="card-title-bar">
            <h2>
              <Bookmark size={18} style={{ color: 'var(--accent-blue)' }} />
              Spend Envelope
            </h2>
          </div>

          <div className="envelope-display-container">
            <div className="envelope-progress-section">
              <div className="envelope-header-row">
                <span className="env-title">Envelope Budget</span>
                <span className={`env-status-percent ${spendColorClass}`}>
                  {spendEnvelopeMetrics.percent.toFixed(0)}% Left
                </span>
              </div>

              {/* Progress bar */}
              <div className="cc-util-bar envelope-bar-wrap">
                <div 
                  className={`cc-util-fill ${spendColorClass}`}
                  style={{ width: `${Math.min(100, spendEnvelopeMetrics.percent)}%` }}
                ></div>
              </div>

              <div className="envelope-amounts-row">
                <div>
                  <span className="env-sub-label">Discretionary Remaining</span>
                  <p className="env-big-amount">{formatCurrency(spendEnvelopeMetrics.remaining)}</p>
                </div>
                <div className="text-right">
                  <span className="env-sub-label">Total Allocated</span>
                  <p className="env-small-amount">{formatCurrency(spendEnvelopeMetrics.total)}</p>
                </div>
              </div>
            </div>

            <div className="envelope-details-box">
              <div className="envelope-detail-column">
                <span className="env-card-lbl">Days Remaining</span>
                <p className="env-card-val">{daysLeftInMonth} Days</p>
              </div>
              <div className="envelope-detail-column text-right">
                <span className="env-card-lbl">Daily Allowance</span>
                <p className="env-card-val text-purple">{formatCurrency(dailySpendAllowance)}/day</p>
              </div>
            </div>
            
            <p className="envelope-desc-footer">
              Envelope budget subtracts monthly bills and investment contributions from your monthly income. As you log discretionary purchases, this budget shrinks.
            </p>
          </div>
        </div>
      </section>

      {/* Row 4: Forms & Logs */}
      <section className="workspace-grid">
        
        {/* Transaction Input Form */}
        <div className={`glass-card ${successFlash ? 'form-success-flash' : ''}`}>
          <div className="card-title-bar">
            <h2>
              <Plus size={18} style={{ color: 'var(--accent-blue)' }} />
              Log Transaction
            </h2>
          </div>

          <form onSubmit={handleSubmitTransaction} className="transaction-form">
            <div className="form-group">
              <label>Transaction Type</label>
              <div className="type-toggle-container">
                <button
                  type="button"
                  className={`type-toggle-btn expense ${txType === 'expense' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('expense')}
                >
                  <TrendingDown size={14} />
                  Expense
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn income ${txType === 'income' ? 'active' : ''}`}
                  onClick={() => handleTypeChange('income')}
                >
                  <TrendingUp size={14} />
                  Income
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tx-desc">Description</label>
              <div className="input-container">
                <Tag className="input-icon" size={16} />
                <input
                  id="tx-desc"
                  type="text"
                  placeholder="e.g. Target Grocery"
                  className={`form-input ${txErrors.description ? 'error' : ''}`}
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                />
              </div>
              {txErrors.description && <span className="error-text">{txErrors.description}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="tx-amount">Amount ($)</label>
              <div className="input-container">
                <DollarSign className="input-icon" size={16} />
                <input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className={`form-input ${txErrors.amount ? 'error' : ''}`}
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                />
              </div>
              {txErrors.amount && <span className="error-text">{txErrors.amount}</span>}
            </div>

            {txType === 'expense' ? (
              <div className="form-group">
                <label htmlFor="tx-category">Category</label>
                <div className="input-container">
                  <Tag className="input-icon" size={16} />
                  <select
                    id="tx-category"
                    className="form-select"
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                  >
                    {CATEGORIES.filter((c) => c !== 'Income').map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_EMOJIS[cat]} {cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Category</label>
                <div className="input-container">
                  <Tag className="input-icon" size={16} />
                  <input
                    type="text"
                    className="form-input"
                    value="💰 Income"
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                </div>
              </div>
            )}

            {txType === 'expense' && (
              <div className="form-group">
                <label htmlFor="tx-card-id">Charge to Card</label>
                <div className="input-container">
                  <CreditCardIcon className="input-icon" size={16} />
                  <select
                    id="tx-card-id"
                    className="form-select"
                    value={txCardId}
                    onChange={(e) => setTxCardId(e.target.value)}
                  >
                    <option value="">None / Paid in Cash</option>
                    {creditCards.map((card) => (
                      <option key={card.id} value={card.id}>{card.name} (Close: {card.statementClose})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="tx-date">Date</label>
              <div className="input-container">
                <Calendar className="input-icon" size={16} />
                <input
                  id="tx-date"
                  type="date"
                  className={`form-input ${txErrors.date ? 'error' : ''}`}
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                />
              </div>
              {txErrors.date && <span className="error-text">{txErrors.date}</span>}
            </div>

            <button type="submit" className="submit-btn" disabled={txLoading}>
              <Plus size={16} />
              Submit Transaction
            </button>
          </form>
        </div>

        {/* Transaction History Log */}
        <div className="glass-card scrollable-log-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title-bar">
            <h2>
              <Filter size={18} style={{ color: 'var(--accent-blue)' }} />
              Transaction Log
            </h2>
          </div>

          <div className="log-filters">
            <div className="search-input-wrapper">
              <Search className="input-icon" size={16} style={{ top: '12px' }} />
              <input
                type="text"
                placeholder="Search description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>

            <select
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_EMOJIS[cat]} {cat}</option>
              ))}
            </select>
          </div>

          <div className="transaction-list-container">
            {txLoading ? (
              <div className="loading-placeholder" style={{ height: '200px' }}>
                <RefreshCw size={24} className="spinner-icon text-teal" />
                <span>Syncing transactions...</span>
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="transaction-list">
                {filteredTransactions.map((tx) => {
                  const card = creditCards.find((c) => c.id === tx.cardId);
                  return (
                    <div key={tx.id} className="transaction-item">
                      <div className="item-left">
                        <div 
                          className="category-icon-indicator"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[tx.category]}1a`,
                            color: CATEGORY_COLORS[tx.category],
                            border: `1px solid ${CATEGORY_COLORS[tx.category]}26`,
                            fontSize: '1.2rem'
                          }}
                        >
                          {CATEGORY_EMOJIS[tx.category] || '📦'}
                        </div>
                        
                        <div className="item-details">
                          <h4>{tx.description}</h4>
                          <div className="item-meta">
                            <span>{tx.date}</span>
                            <span>•</span>
                            <span 
                              className="badge"
                              style={{
                                backgroundColor: `${CATEGORY_COLORS[tx.category]}22`,
                                color: CATEGORY_COLORS[tx.category],
                                border: `1px solid ${CATEGORY_COLORS[tx.category]}33`
                              }}
                            >
                              {tx.category}
                            </span>
                            {card && (
                              <>
                                <span>•</span>
                                <span className="transaction-card-badge">
                                  💳 {card.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="item-right">
                        <span className={`item-amount ${tx.type}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                        <button 
                          className="delete-btn" 
                          onClick={() => handleDeleteTransaction(tx.id)}
                          title="Delete record"
                          disabled={txLoading}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>No matching transactions found.</p>
                {(searchTerm || filterCategory !== 'All' || filterType !== 'All') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterCategory('All');
                      setFilterType('All');
                    }}
                    className="clear-filters-link"
                  >
                    Clear active filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- ADD CARD MODAL DIALOG --- */}
      {showAddCard && (
        <div className="modal-overlay">
          <div className="modal-box glass-card">
            <div className="modal-header">
              <h3>Add Credit Card</h3>
              <button onClick={() => setShowAddCard(false)} className="close-btn">
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

              <button type="submit" className="submit-btn" style={{ marginTop: '12px' }}>
                <Plus size={16} /> Save Credit Card
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
              <button onClick={() => setShowAddGoal(false)} className="close-btn">
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
              <button onClick={() => setPayingCardId(null)} className="close-btn">
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
              <button onClick={() => setSelectedCalendarDay(null)} className="close-btn">
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

    </div>
  );
}

export default App;
