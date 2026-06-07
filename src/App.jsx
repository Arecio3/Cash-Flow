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
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard as CreditCardIcon,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';

// Persistence wrapper
const storage = {
  get: (key, fallback) => {
    try {
      const api = typeof window.storage !== 'undefined' ? window.storage : window.localStorage;
      const data = api.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  },
  set: (key, value) => {
    try {
      const api = typeof window.storage !== 'undefined' ? window.storage : window.localStorage;
      api.setItem(key, JSON.stringify(value));
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

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getSampleData = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yyyymm = `${year}-${month}`;

  const defaultCards = [
    { id: 'cc1', name: 'Chase Freedom', issuer: 'Chase', balance: 0, limit: 5000 },
    { id: 'cc2', name: 'Amex Gold', issuer: 'Amex', balance: 4500, limit: 15000 },
    { id: 'cc3', name: 'Apple Card', issuer: 'Apple', balance: 2100, limit: 6000 }
  ];

  const defaultBills = [
    { id: 'b1', name: 'Apartment Rent', amount: 1400.00, category: 'Housing', date: `${yyyymm}-01`, paid: true },
    { id: 'b2', name: 'Electric Bill', amount: 120.00, category: 'Utilities', date: `${yyyymm}-10`, paid: false },
    { id: 'b3', name: 'Internet (Comcast)', amount: 75.00, category: 'Utilities', date: `${yyyymm}-12`, paid: false },
    { id: 'b4', name: 'Health Insurance', amount: 220.00, category: 'Healthcare', date: `${yyyymm}-15`, paid: false },
    { id: 'b5', name: 'Car Insurance', amount: 180.00, category: 'Transport', date: `${yyyymm}-20`, paid: true },
    { id: 'b6', name: 'Netflix Premium', amount: 22.99, category: 'Entertainment', date: `${yyyymm}-22`, paid: false }
  ];

  const defaultTransactions = [
    { id: 't1', description: 'Bi-weekly Paycheck', amount: 3200.00, type: 'income', category: 'Income', date: `${yyyymm}-01` },
    { id: 't2', description: 'Apartment Rent', amount: 1400.00, type: 'expense', category: 'Housing', date: `${yyyymm}-01` },
    { id: 't3', description: 'Whole Foods', amount: 154.20, type: 'expense', category: 'Food', date: `${yyyymm}-02` },
    { id: 't4', description: 'Chevron Gas', amount: 48.50, type: 'expense', category: 'Transport', date: `${yyyymm}-03` },
    { id: 't5', description: 'Restaurant Dinner', amount: 95.00, type: 'expense', category: 'Food', date: `${yyyymm}-04` },
    { id: 't6', description: 'Electric Bill', amount: 120.00, type: 'expense', category: 'Utilities', date: `${yyyymm}-10` },
    { id: 't7', description: 'AMC Theater', amount: 32.50, type: 'expense', category: 'Entertainment', date: `${yyyymm}-12` },
    { id: 't8', description: 'Amex Card Payment', amount: 500.00, type: 'expense', category: 'Credit Card', date: `${yyyymm}-15` },
    { id: 't9', description: 'Car Insurance', amount: 180.00, type: 'expense', category: 'Transport', date: `${yyyymm}-20` },
    { id: 't10', description: 'Coffee Shop', amount: 6.75, type: 'expense', category: 'Food', date: `${yyyymm}-21` }
  ];

  return { cards: defaultCards, bills: defaultBills, transactions: defaultTransactions };
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-recharts-tooltip">
        <p className="custom-tooltip-label">{label}</p>
        {payload.map((pld, index) => (
          <p key={index} className={`custom-tooltip-value ${pld.name.toLowerCase()}`}>
            {pld.name}: ${pld.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function App() {
  // --- Persistent States ---
  const [transactions, setTransactions] = useState(() => {
    const saved = storage.get('cashflow_transactions', null);
    return saved || getSampleData().transactions;
  });

  const [creditCards, setCreditCards] = useState(() => {
    const saved = storage.get('cashflow_credit_cards', null);
    return saved || getSampleData().cards;
  });

  const [bills, setBills] = useState(() => {
    const saved = storage.get('cashflow_bills', null);
    return saved || getSampleData().bills;
  });

  // --- App View States ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [toasts, setToasts] = useState([]);

  // --- Modals / Interaction States ---
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [payingCardId, setPayingCardId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // --- Add Card Form States ---
  const [newCardName, setNewCardName] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [newCardBalance, setNewCardBalance] = useState('');
  const [newCardIssuer, setNewCardIssuer] = useState('Chase');
  const [cardErrors, setCardErrors] = useState({});

  // --- Add Bill Form States (within selected calendar day modal) ---
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillCategory, setNewBillCategory] = useState('Utilities');
  const [billErrors, setBillErrors] = useState({});

  // --- Transaction Form States ---
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState('expense'); // 'income' or 'expense'
  const [txCategory, setTxCategory] = useState('Food');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txErrors, setTxErrors] = useState({});
  const [successFlash, setSuccessFlash] = useState(false);

  // --- Search & Filters State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');

  // --- Save to Storage Hooks ---
  useEffect(() => {
    storage.set('cashflow_transactions', transactions);
  }, [transactions]);

  useEffect(() => {
    storage.set('cashflow_credit_cards', creditCards);
  }, [creditCards]);

  useEffect(() => {
    storage.set('cashflow_bills', bills);
  }, [bills]);

  // --- Toast Manager Helper ---
  const addToast = (message, toastType = 'success') => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type: toastType }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // --- Month Navigation Helpers ---
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // --- Calculations for Top Row Summary Cards ---
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

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

  // --- Credit Card Handlers ---
  const handleAddCard = (e) => {
    e.preventDefault();
    const errors = {};
    if (!newCardName.trim()) errors.name = 'Card name is required';
    
    const parsedLimit = parseFloat(newCardLimit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) errors.limit = 'Limit must be positive';
    
    const parsedBalance = parseFloat(newCardBalance || 0);
    if (isNaN(parsedBalance) || parsedBalance < 0) errors.balance = 'Balance cannot be negative';
    if (parsedBalance > parsedLimit) errors.balance = 'Balance cannot exceed limit';

    if (Object.keys(errors).length > 0) {
      setCardErrors(errors);
      return;
    }

    const newCard = {
      id: generateId(),
      name: newCardName.trim(),
      issuer: newCardIssuer,
      limit: parsedLimit,
      balance: parsedBalance
    };

    setCreditCards((prev) => [...prev, newCard]);
    addToast(`Card "${newCard.name}" added successfully!`);

    // Reset Form
    setNewCardName('');
    setNewCardLimit('');
    setNewCardBalance('');
    setNewCardIssuer('Chase');
    setCardErrors({});
    setShowAddCard(false);
  };

  const handleDeleteCard = (id) => {
    const cardToDelete = creditCards.find((c) => c.id === id);
    setCreditCards((prev) => prev.filter((c) => c.id !== id));
    addToast(`Deleted card "${cardToDelete.name}"`, 'delete');
    if (payingCardId === id) setPayingCardId(null);
  };

  const handlePayCard = (e) => {
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

    // Reduce Card Balance
    setCreditCards((prev) => 
      prev.map((c) => (c.id === payingCardId ? { ...c, balance: Math.max(0, c.balance - amountToPay) } : c))
    );

    // Create Expense Transaction
    const todayStr = new Date().toISOString().split('T')[0];
    const newTx = {
      id: generateId(),
      description: `Payment to ${card.name}`,
      amount: amountToPay,
      type: 'expense',
      category: 'Credit Card',
      date: todayStr
    };

    setTransactions((prev) => [newTx, ...prev]);
    addToast(`Logged card payment of $${amountToPay.toFixed(2)}!`);

    // Reset payment states
    setPayingCardId(null);
    setPaymentAmount('');
  };

  // --- Bill Calendar Handlers ---
  const handleAddBill = (e) => {
    e.preventDefault();
    const errors = {};
    if (!newBillName.trim()) errors.name = 'Bill name is required';

    const amt = parseFloat(newBillAmount);
    if (isNaN(amt) || amt <= 0) errors.amount = 'Amount must be positive';

    if (Object.keys(errors).length > 0) {
      setBillErrors(errors);
      return;
    }

    const newBill = {
      id: generateId(),
      name: newBillName.trim(),
      amount: amt,
      category: newBillCategory,
      date: selectedCalendarDay,
      paid: false
    };

    setBills((prev) => [...prev, newBill]);
    addToast(`Added bill: "${newBill.name}" for ${selectedCalendarDay}!`);

    // Reset Form
    setNewBillName('');
    setNewBillAmount('');
    setNewBillCategory('Utilities');
    setBillErrors({});
  };

  const handleToggleBillPaid = (billId) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    const newPaidStatus = !bill.paid;

    setBills((prev) => 
      prev.map((b) => (b.id === billId ? { ...b, paid: newPaidStatus } : b))
    );

    if (newPaidStatus) {
      // Create corresponding expense transaction automatically
      const newTx = {
        id: generateId(),
        description: `Paid Bill: ${bill.name}`,
        amount: bill.amount,
        type: 'expense',
        category: bill.category,
        date: bill.date
      };
      setTransactions((prev) => [newTx, ...prev]);
      addToast(`Bill "${bill.name}" marked paid & logged!`);
    } else {
      // Find and delete the corresponding transaction to keep synced
      setTransactions((prev) => 
        prev.filter((t) => !(t.description === `Paid Bill: ${bill.name}` && t.amount === bill.amount && t.date === bill.date))
      );
      addToast(`Bill "${bill.name}" marked unpaid.`);
    }
  };

  const handleDeleteBill = (billId) => {
    const billToDelete = bills.find((b) => b.id === billId);
    setBills((prev) => prev.filter((b) => b.id !== billId));
    addToast(`Deleted bill "${billToDelete.name}"`, 'delete');
  };

  // --- Calendar Cell Grid Generator ---
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

    // Trailing days from next month (fill up to standard 42 days grid)
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

  // --- Last 6 Months Cashflow Bar Chart Data ---
  const barChartData = useMemo(() => {
    const months = [];
    const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    tempDate.setMonth(tempDate.getMonth() - 5);

    for (let i = 0; i < 6; i++) {
      months.push({
        year: tempDate.getFullYear(),
        month: tempDate.getMonth(),
        label: tempDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        key: `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}`
      });
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    return months.map(({ label, year, month }) => {
      let income = 0;
      let expenses = 0;

      transactions.forEach((tx) => {
        const txDateObj = new Date(tx.date + 'T00:00:00');
        if (txDateObj.getFullYear() === year && txDateObj.getMonth() === month) {
          const amt = parseFloat(tx.amount) || 0;
          if (tx.type === 'income') {
            income += amt;
          } else {
            expenses += amt;
          }
        }
      });

      return {
        name: label,
        Income: income,
        Expenses: expenses
      };
    });
  }, [transactions, currentDate]);

  // --- Transaction Form Handler ---
  const handleTypeChange = (newType) => {
    setTxType(newType);
    setTxCategory(newType === 'income' ? 'Income' : 'Food');
  };

  const handleSubmitTransaction = (e) => {
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

    const newTx = {
      id: generateId(),
      description: txDesc.trim(),
      amount: parsedAmt,
      type: txType,
      category: txType === 'income' ? 'Income' : txCategory,
      date: txDate
    };

    setTransactions((prev) => [newTx, ...prev]);
    addToast('Transaction recorded successfully!');

    // Reset Form & flash effect
    setTxDesc('');
    setTxAmount('');
    setTxErrors({});
    setSuccessFlash(true);
    setTimeout(() => setSuccessFlash(false), 800);
  };

  const handleDeleteTransaction = (id) => {
    const txToDelete = transactions.find((t) => t.id === id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    addToast(`Deleted "${txToDelete.description}"`, 'delete');
  };

  const handleResetAllData = () => {
    if (window.confirm('Are you sure you want to reset all data back to original sample presets?')) {
      const sample = getSampleData();
      setTransactions(sample.transactions);
      setCreditCards(sample.cards);
      setBills(sample.bills);
      addToast('Reset to original sample dataset.');
    }
  };

  // --- Filtered Transaction Logs ---
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

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amt);
  };

  return (
    <div className="dashboard-container">
      {/* Toast Notification HUD */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === 'delete' ? 'delete' : ''}`}>
            {t.type === 'delete' ? <Trash2 size={16} /> : <Sparkles size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Top Header / Navigation */}
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={24} />
          </div>
          <div className="brand-text">
            <h1>CASH FLOW</h1>
            <p>PERSONAL WEALTH COMPASS</p>
          </div>
        </div>
        
        {/* Month Selector navigation */}
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

        <button onClick={handleResetAllData} className="reset-data-btn" title="Reset all data back to default preset samples">
          <RefreshCw size={14} />
          <span>Reset Preset</span>
        </button>
      </header>

      {/* 1. Summary Cards (Top Row) */}
      <section className="metrics-grid">
        <div className="glass-card metric-card income">
          <div className="metric-info">
            <h3>Monthly Income</h3>
            <div className="metric-value green">
              {formatCurrency(monthlySummary.income)}
            </div>
            <div className="metric-subtext">
              <TrendingUp size={14} />
              <span>Earnings for {currentDate.toLocaleDateString('en-US', { month: 'short' })}</span>
            </div>
          </div>
          <div className="metric-icon-wrapper">
            <ArrowUpRight size={28} />
          </div>
        </div>

        <div className="glass-card metric-card expense">
          <div className="metric-info">
            <h3>Monthly Expenses</h3>
            <div className="metric-value red">
              {formatCurrency(monthlySummary.expenses)}
            </div>
            <div className="metric-subtext">
              <TrendingDown size={14} />
              <span>Debits logged in {currentDate.toLocaleDateString('en-US', { month: 'short' })}</span>
            </div>
          </div>
          <div className="metric-icon-wrapper">
            <ArrowDownRight size={28} />
          </div>
        </div>

        <div className={`glass-card metric-card ${monthlySummary.net >= 0 ? 'cashflow-positive' : 'cashflow-negative'}`}>
          <div className="metric-info">
            <h3>Net Cashflow</h3>
            <div className={`metric-value ${monthlySummary.net >= 0 ? 'green' : 'red'}`}>
              {formatCurrency(monthlySummary.net)}
            </div>
            <div className="metric-subtext">
              <Wallet size={14} />
              <span>Liquidity ratio for select period</span>
            </div>
          </div>
          <div className="metric-icon-wrapper">
            <Wallet size={28} />
          </div>
        </div>
      </section>

      {/* Middle Grid Row: Credit Card Tracker (Left) & Bill Calendar (Right) */}
      <section className="charts-grid tracker-layout">
        
        {/* 2. Credit Card Tracker */}
        <div className="glass-card cc-tracker-card">
          <div className="card-title-bar">
            <h2>
              <CreditCardIcon size={18} style={{ color: 'var(--accent-blue)' }} />
              Credit Card Tracker
            </h2>
            <button onClick={() => setShowAddCard(true)} className="add-btn">
              <Plus size={14} /> Add Card
            </button>
          </div>

          <div className="cc-list">
            {creditCards.length > 0 ? (
              creditCards.map((card) => {
                const utilRatio = card.limit > 0 ? (card.balance / card.limit) * 100 : 0;
                let utilColorClass = 'util-green';
                if (utilRatio >= 30 && utilRatio <= 60) utilColorClass = 'util-amber';
                else if (utilRatio > 60) utilColorClass = 'util-red';

                const isPaidOff = card.balance === 0;
                const issuerInfo = getIssuerColor(card.issuer);

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
                        <button onClick={() => setPayingCardId(card.id)} className="pay-card-btn">
                          Log Payment
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <p>No cards active. Click Add Card to track balances.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Bill Calendar */}
        <div className="glass-card bill-calendar-card">
          <div className="card-title-bar">
            <h2>
              <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
              Bill Calendar
            </h2>
            <div className="calendar-indicator-row">
              <div className="indicator-pill unpaid">Upcoming</div>
              <div className="indicator-pill paid">Paid</div>
            </div>
          </div>

          {/* Calendar Weekday headers */}
          <div className="calendar-week-headers">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="calendar-header-cell">{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="calendar-days-grid">
            {calendarDays.map((cell, idx) => {
              const dayBills = bills.filter((b) => b.date === cell.dateStr);
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
                      <div className="tooltip-title">Bills for {cell.dateStr}:</div>
                      <ul className="tooltip-list">
                        {dayBills.map((b) => (
                          <li key={b.id} className={b.paid ? 'paid' : 'unpaid'}>
                            {b.name} ({formatCurrency(b.amount)}) - {b.paid ? 'Paid' : 'Due'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. 6-Month Cashflow Chart Section */}
      <section className="glass-card cashflow-chart-section">
        <div className="card-title-bar">
          <h2>
            <TrendingUp size={18} style={{ color: 'var(--accent-blue)' }} />
            6-Month Cashflow Comparison
          </h2>
          <span className="chart-legend-text">INFLOW VS OUTFLOW SIDE BY SIDE</span>
        </div>
        
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={barChartData} 
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              barGap={5}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="var(--text-muted)" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="var(--text-muted)" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 5. Bottom Workspace Section: Log Transaction (Left) & Transaction Log List (Right) */}
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
            {/* Toggle Switch */}
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

            {/* Description */}
            <div className="form-group">
              <label htmlFor="tx-desc">Description</label>
              <div className="input-container">
                <Tag className="input-icon" size={16} />
                <input
                  id="tx-desc"
                  type="text"
                  placeholder="e.g. Shell Gas Station"
                  className={`form-input ${txErrors.description ? 'error' : ''}`}
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                />
              </div>
              {txErrors.description && <span className="error-text">{txErrors.description}</span>}
            </div>

            {/* Amount */}
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

            {/* Category selection */}
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

            {/* Date */}
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

            <button type="submit" className="submit-btn">
              <Plus size={16} />
              Submit Transaction
            </button>
          </form>
        </div>

        {/* Transaction History Log list view */}
        <div className="glass-card scrollable-log-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title-bar">
            <h2>
              <Filter size={18} style={{ color: 'var(--accent-blue)' }} />
              Transaction Log
            </h2>
          </div>

          {/* Filters Bar */}
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

          {/* List Section */}
          <div className="transaction-list-container">
            {filteredTransactions.length > 0 ? (
              <div className="transaction-list">
                {filteredTransactions.map((tx) => (
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
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
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

              <button type="submit" className="submit-btn" style={{ marginTop: '12px' }}>
                <Plus size={16} /> Save Credit Card
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- LOG CARD PAYMENT MODAL DIALOG --- */}
      {payingCardId && (
        <div className="modal-overlay">
          <div className="modal-box glass-card">
            <div className="modal-header">
              <h3>Log Card Payment</h3>
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

      {/* --- CALENDAR DAY DETAIL & ADD BILL MODAL DIALOG --- */}
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
              {/* Left pane: Existing Bills list */}
              <div className="modal-pane-left">
                <h4>Bills Scheduled</h4>
                <div className="modal-bills-list">
                  {bills.filter((b) => b.date === selectedCalendarDay).length > 0 ? (
                    bills.filter((b) => b.date === selectedCalendarDay).map((bill) => (
                      <div key={bill.id} className={`modal-bill-item ${bill.paid ? 'paid' : ''}`}>
                        <div className="bill-item-details">
                          <span className="bill-name-lbl">{bill.name}</span>
                          <span className="bill-amt-lbl">{formatCurrency(bill.amount)}</span>
                        </div>
                        <div className="bill-actions">
                          <button 
                            onClick={() => handleToggleBillPaid(bill.id)} 
                            className={`bill-toggle-paid-btn ${bill.paid ? 'is-paid' : 'is-unpaid'}`}
                            title={bill.paid ? 'Mark unpaid' : 'Mark paid & log transaction'}
                          >
                            {bill.paid ? <Check size={14} /> : 'Pay'}
                          </button>
                          <button 
                            onClick={() => handleDeleteBill(bill.id)} 
                            className="bill-item-delete-btn"
                            title="Delete bill"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-modal-state">
                      <p>No bills set for this day.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right pane: Add Bill form */}
              <div className="modal-pane-right">
                <h4>Add Bill for Day</h4>
                <form onSubmit={handleAddBill} className="modal-form">
                  <div className="form-group">
                    <label>Bill Title</label>
                    <input 
                      type="text" 
                      className={`form-input ${billErrors.name ? 'error' : ''}`}
                      placeholder="e.g. Electric Bill" 
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

                  <button type="submit" className="submit-btn" style={{ marginTop: '8px' }}>
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
