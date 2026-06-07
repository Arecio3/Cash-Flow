import React, { useState, useMemo, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const INITIAL_TRANSACTIONS = [
  { id: '1', description: 'Tech Corp Salary', amount: 3500.00, category: 'Income', type: 'income', date: '2026-06-01' },
  { id: '2', description: 'Monthly Rent Payment', amount: 1200.00, category: 'Housing', type: 'expense', date: '2026-06-01' },
  { id: '3', description: 'Whole Foods Market', amount: 165.50, category: 'Food', type: 'expense', date: '2026-06-02' },
  { id: '4', description: 'Shell Gas Station', amount: 45.20, category: 'Transport', type: 'expense', date: '2026-06-02' },
  { id: '5', description: 'Downtown Dinner Out', amount: 95.00, category: 'Food', type: 'expense', date: '2026-06-03' },
  { id: '6', description: 'Concert Tickets', amount: 120.00, category: 'Entertainment', type: 'expense', date: '2026-06-04' },
  { id: '7', description: 'Freelance Design Project', amount: 850.00, category: 'Income', type: 'income', date: '2026-06-05' },
  { id: '8', description: 'Aetna Health Premium', amount: 210.00, category: 'Healthcare', type: 'expense', date: '2026-06-05' },
  { id: '9', description: 'Netflix & Spotify Subs', amount: 29.98, category: 'Entertainment', type: 'expense', date: '2026-06-06' },
  { id: '10', description: 'Uber Ride City Center', amount: 24.50, category: 'Transport', type: 'expense', date: '2026-06-06' }
];

const CATEGORIES = ['Housing', 'Food', 'Transport', 'Entertainment', 'Healthcare', 'Other'];

const CATEGORY_COLORS = {
  Housing: '#3b82f6',
  Food: '#f59e0b',
  Transport: '#8b5cf6',
  Entertainment: '#ec4899',
  Healthcare: '#14b8a6',
  Other: '#6b7280',
  Income: '#10b981'
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

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-recharts-tooltip">
        <p className="custom-tooltip-label">{data.name}</p>
        <p className="custom-tooltip-value expense">
          Total: ${data.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="custom-tooltip-label" style={{ marginTop: 4 }}>
          Share: {data.percentage}%
        </p>
      </div>
    );
  }
  return null;
};

function App() {
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  
  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense'); // 'income' or 'expense'
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Form Validation State
  const [errors, setErrors] = useState({});
  const [successFlash, setSuccessFlash] = useState(false);

  // Toast System State
  const [toasts, setToasts] = useState([]);

  // Search/Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');

  // Dynamic Time
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update default category based on type selection
  useEffect(() => {
    if (type === 'income') {
      setCategory('Income');
    } else {
      setCategory('Food');
    }
  }, [type]);

  const addToast = (message, toastType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type: toastType }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Calculations for dashboard
  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    transactions.forEach((tx) => {
      const amt = parseFloat(tx.amount) || 0;
      if (tx.type === 'income') {
        income += amt;
      } else {
        expenses += amt;
      }
    });
    return {
      income,
      expenses,
      net: income - expenses
    };
  }, [transactions]);

  // Cashflow over time Chart Data
  const chartData = useMemo(() => {
    const dateMap = {};
    
    transactions.forEach((tx) => {
      const dateStr = tx.date;
      const amt = parseFloat(tx.amount) || 0;
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { income: 0, expense: 0 };
      }
      if (tx.type === 'income') {
        dateMap[dateStr].income += amt;
      } else {
        dateMap[dateStr].expense += amt;
      }
    });

    return Object.keys(dateMap)
      .sort()
      .map((dStr) => {
        // Format date string for displaying (e.g. "Jun 02")
        const dateObj = new Date(dStr + 'T00:00:00');
        const display = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        return {
          dateStr: dStr,
          displayDate: display,
          Income: dateMap[dStr].income,
          Expenses: dateMap[dStr].expense
        };
      });
  }, [transactions]);

  // Category breakdown for Pie Chart
  const pieData = useMemo(() => {
    const catMap = {};
    let totalExpense = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'expense') {
        const amt = parseFloat(tx.amount) || 0;
        const cat = tx.category;
        catMap[cat] = (catMap[cat] || 0) + amt;
        totalExpense += amt;
      }
    });

    return Object.keys(catMap).map((catName) => {
      const value = catMap[catName];
      const percentage = totalExpense > 0 ? ((value / totalExpense) * 100).toFixed(1) : 0;
      return {
        name: catName,
        value,
        percentage,
        color: CATEGORY_COLORS[catName] || CATEGORY_COLORS.Other
      };
    });
  }, [transactions]);

  // Filtered transactions for the list view
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || tx.category === filterCategory;
        const matchesType = filterType === 'All' || tx.type === filterType;
        return matchesSearch && matchesCategory && matchesType;
      })
      .sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00')); // Sorted newest first
  }, [transactions, searchTerm, filterCategory, filterType]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }

    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const newTx = {
      id: Math.random().toString(36).substr(2, 9),
      description: description.trim(),
      amount: parsedAmount,
      type,
      category: type === 'income' ? 'Income' : category,
      date
    };

    setTransactions((prev) => [newTx, ...prev]);
    addToast('Transaction recorded successfully!');
    
    // Clear inputs & trigger visual success animation
    setDescription('');
    setAmount('');
    setSuccessFlash(true);
    setTimeout(() => setSuccessFlash(false), 800);
  };

  const handleDelete = (id) => {
    const txToDelete = transactions.find((t) => t.id === id);
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    addToast(`Deleted "${txToDelete.description}"`, 'delete');
  };

  const handleResetSampleData = () => {
    setTransactions(INITIAL_TRANSACTIONS);
    addToast('Reset to original sample dataset.');
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amt);
  };

  return (
    <div className="dashboard-container">
      
      {/* Toast System */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === 'delete' ? 'delete' : ''}`}>
            <Sparkles size={16} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={24} />
          </div>
          <div className="brand-text">
            <h1>AETHER LEDGER</h1>
            <p>INTELLIGENT WEALTH MONITOR</p>
          </div>
        </div>
        <div className="header-meta">
          <div>{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <span>{currentTime.toLocaleTimeString('en-US', { hour12: false })}</span>
            <div className="live-badge">
              <div className="pulse-dot"></div>
              <span>LIVE FEED</span>
            </div>
          </div>
        </div>
      </header>

      {/* Metric summary grid */}
      <section className="metrics-grid">
        
        {/* Total Income Card */}
        <div className="glass-card metric-card income">
          <div className="metric-info">
            <h3>Total Inflow</h3>
            <div className="metric-value" style={{ color: 'var(--income-green)' }}>
              {formatCurrency(totals.income)}
            </div>
            <div className="metric-subtext">
              <TrendingUp size={14} style={{ color: 'var(--income-green)' }} />
              <span>Earnings and positive credits</span>
            </div>
          </div>
          <div className="metric-icon-wrapper">
            <ArrowUpRight size={28} />
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="glass-card metric-card expense">
          <div className="metric-info">
            <h3>Total Outflow</h3>
            <div className="metric-value" style={{ color: 'var(--expense-red)' }}>
              {formatCurrency(totals.expenses)}
            </div>
            <div className="metric-subtext">
              <TrendingDown size={14} style={{ color: 'var(--expense-red)' }} />
              <span>Expenditure and outgoing debits</span>
            </div>
          </div>
          <div className="metric-icon-wrapper">
            <ArrowDownRight size={28} />
          </div>
        </div>

        {/* Net Cashflow Card */}
        <div className={`glass-card metric-card ${totals.net >= 0 ? 'cashflow-positive' : 'cashflow-negative'}`}>
          <div className="metric-info">
            <h3>Net Position</h3>
            <div className="metric-value" style={{ color: totals.net >= 0 ? 'var(--income-green)' : 'var(--expense-red)' }}>
              {formatCurrency(totals.net)}
            </div>
            <div className="metric-subtext" style={{ color: 'var(--text-secondary)' }}>
              <span>Liquidity ratio details</span>
            </div>
          </div>
          <div className="metric-icon-wrapper">
            <Wallet size={28} />
          </div>
        </div>

      </section>

      {/* Middle Row Charts */}
      <section className="charts-grid">
        
        {/* Cashflow timeline chart */}
        <div className="glass-card">
          <div className="card-title-bar">
            <h2>
              <TrendingUp size={18} style={{ color: 'var(--accent-blue)' }} />
              Cashflow Timeline
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DAILY SEGMENTS</span>
          </div>
          <div className="chart-container">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--income-green)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="var(--income-green)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--expense-red)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="var(--expense-red)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="displayDate" 
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
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="Income" 
                    stroke="var(--income-green)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Expenses" 
                    stroke="var(--expense-red)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorExpense)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <p>No cashflow records. Try logging some transactions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Expenses category breakdown */}
        <div className="glass-card">
          <div className="card-title-bar">
            <h2>
              <Tag size={18} style={{ color: 'var(--accent-blue)' }} />
              Category Allocations
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EXPENSES ONLY</span>
          </div>
          <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {pieData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <div style={{ width: '50%', height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '10px' }}>
                  {pieData.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color }}></div>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{entry.name}</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>{entry.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No expense data available for categorization.</p>
              </div>
            )}
          </div>
        </div>

      </section>

      {/* Main Workspace (Form on Left, List on Right) */}
      <section className="workspace-grid">
        
        {/* Transaction Input Form */}
        <div className={`glass-card ${successFlash ? 'form-success-flash' : ''}`}>
          <div className="card-title-bar">
            <h2>
              <Plus size={18} style={{ color: 'var(--accent-blue)' }} />
              Log Transaction
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="transaction-form">
            
            {/* Toggle Switch */}
            <div className="form-group">
              <label>Transaction Type</label>
              <div className="type-toggle-container">
                <button
                  type="button"
                  className={`type-toggle-btn expense ${type === 'expense' ? 'active' : ''}`}
                  onClick={() => setType('expense')}
                >
                  <TrendingDown size={14} />
                  Expense
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn income ${type === 'income' ? 'active' : ''}`}
                  onClick={() => setType('income')}
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
                <DollarSign className="input-icon" size={16} />
                <input
                  id="tx-desc"
                  type="text"
                  placeholder="e.g. Amazon Web Services"
                  className={`form-input ${errors.description ? 'error' : ''}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              {errors.description && <span className="error-text">{errors.description}</span>}
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
                  className={`form-input ${errors.amount ? 'error' : ''}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              {errors.amount && <span className="error-text">{errors.amount}</span>}
            </div>

            {/* Category */}
            {type === 'expense' ? (
              <div className="form-group">
                <label htmlFor="tx-category">Category</label>
                <div className="input-container">
                  <Tag className="input-icon" size={16} />
                  <select
                    id="tx-category"
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
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
                    value="Income"
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
                  className={`form-input ${errors.date ? 'error' : ''}`}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              {errors.date && <span className="error-text">{errors.date}</span>}
            </div>

            <button type="submit" className="submit-btn">
              <Plus size={16} />
              Submit Transaction
            </button>

          </form>
        </div>

        {/* Transaction History Log */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title-bar">
            <h2>
              <Filter size={18} style={{ color: 'var(--accent-blue)' }} />
              Transaction Log
            </h2>
            <button 
              onClick={handleResetSampleData}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              className="reset-btn"
            >
              <RefreshCw size={12} />
              Reset Samples
            </button>
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
              <option value="income">Inflow Only</option>
              <option value="expense">Outflow Only</option>
            </select>

            <select
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Income">Income</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
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
                          backgroundColor: `${CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.Other}1a`,
                          color: CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.Other,
                          border: `1px solid ${CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.Other}26`
                        }}
                      >
                        {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      
                      <div className="item-details">
                        <h4>{tx.description}</h4>
                        <div className="item-meta">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span className={`badge ${tx.category.toLowerCase()}-badge ${tx.category.toLowerCase()}`}>
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
                        onClick={() => handleDelete(tx.id)}
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
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      marginTop: '4px'
                    }}
                  >
                    Clear active filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </section>

    </div>
  );
}

export default App;
