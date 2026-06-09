import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell, 
  ReferenceLine,
  Tooltip
} from 'recharts';

// --- Count-up Animation Component ---
function AnimatedNumber({ value, format }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 600;
    const startValue = 0;
    const endValue = value;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress * (2 - progress); // Ease out quad
      setDisplayValue(startValue + easeProgress * (endValue - startValue));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{format(displayValue)}</span>;
}

// Category list breakdown mapping
const CATEGORIES = ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Credit Card', 'Income', 'Other'];

export function Dashboard({
  transactions,
  monthlySummary,
  monthlyBillsTotal,
  monthlyCardPayoffsTotal,
  spendEnvelopeMetrics,
  daysLeftInMonth,
  dailySpendAllowance,
  formatCurrency,
  txLoading,
  cardLoading,
  billsLoading,
  goalsLoading,
  currentDate,
  windowWidth
}) {
  const [mounted, setMounted] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const isMobile = windowWidth < 768;

  // --- Dynamic Previous Month Income Calculation ---
  const prevMonthIncome = useMemo(() => {
    const prevMonthDate = new Date(currentDate);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();
    return transactions.reduce((sum, tx) => {
      const txDate = new Date(tx.date + 'T00:00:00');
      if (tx.type === 'income' && txDate.getFullYear() === prevYear && txDate.getMonth() === prevMonth) {
        return sum + tx.amount;
      }
      return sum;
    }, 0);
  }, [transactions, currentDate]);

  const incomeDiff = monthlySummary.income - prevMonthIncome;

  // --- 7-Day Spend Data for Mini Chart ---
  const dailySpendData = useMemo(() => {
    const data = [];
    const today = new Date();
    // Return 5 days on mobile, 7 days on desktop
    const daysCount = isMobile ? 5 : 7;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1);
      
      const totalSpend = transactions.reduce((sum, tx) => {
        if (tx.type === 'expense' && tx.date === dateStr) {
          return sum + tx.amount;
        }
        return sum;
      }, 0);
      
      data.push({
        day: dayLabel,
        spend: totalSpend,
        dateStr
      });
    }
    return data;
  }, [transactions, isMobile]);

  // --- Circular Progress Circle Specs ---
  const totalDaysInMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  }, [currentDate]);

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (daysLeftInMonth / totalDaysInMonth));

  // --- Cascade Money Flow Math ---
  const income = monthlySummary.income;
  const billsVal = monthlyBillsTotal;
  const payoffs = monthlyCardPayoffsTotal;
  const freeCash = Math.max(0, income - billsVal - payoffs);
  
  // Calculate total investment contributions
  const investTotal = spendEnvelopeMetrics.total - spendEnvelopeMetrics.remaining - billsVal;
  const investClamped = Math.min(freeCash, Math.max(0, investTotal));
  const availableToSpend = spendEnvelopeMetrics.remaining;

  const flowRows = [
    { label: 'Income', amount: income, type: 'positive' },
    { label: 'Bills charged to cards', amount: billsVal, type: 'negative' },
    { label: 'Card payoffs', amount: payoffs, type: 'negative' },
    { label: 'Free cash', amount: freeCash, type: 'positive' },
    { label: 'Invest target', amount: investClamped, type: 'purple' },
    { label: 'Available to spend', amount: availableToSpend, type: 'blue-white' }
  ];

  const maxVal = Math.max(income, 1);

  const categoryBudgets = useMemo(() => {
    // Map current active month transactions to categories
    const categoriesMap = {};
    CATEGORIES.forEach(cat => {
      categoriesMap[cat] = { spent: 0, budget: cat === 'Income' ? 0 : 250 }; // Default sample budgets
    });

    // Custom adjustments based on presets
    categoriesMap['Housing'].budget = 1200;
    categoriesMap['Food'].budget = 500;
    categoriesMap['Transport'].budget = 300;
    categoriesMap['Utilities'].budget = 350;
    categoriesMap['Entertainment'].budget = 200;

    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    transactions.forEach(tx => {
      const txDateObj = new Date(tx.date + 'T00:00:00');
      if (txDateObj.getFullYear() === currentYear && txDateObj.getMonth() === currentMonth) {
        if (tx.type === 'expense') {
          const cat = tx.category || 'Other';
          if (!categoriesMap[cat]) {
            categoriesMap[cat] = { spent: 0, budget: 150 };
          }
          categoriesMap[cat].spent += tx.amount;
        }
      }
    });

    return Object.entries(categoriesMap)
      .map(([name, data]) => {
        const remaining = Math.max(0, data.budget - data.spent);
        const percent = data.budget > 0 ? (remaining / data.budget) * 100 : 0;
        return { name, spent: data.spent, budget: data.budget, remaining, percent };
      })
      .filter(c => c.budget > 0);
  }, [transactions, currentDate]);

  const spentSoFar = monthlySummary.expenses;
  const percentSpent = income > 0 ? (spentSoFar / income) * 100 : 0;

  if (txLoading || cardLoading || billsLoading || goalsLoading) {
    return (
      <div className="dashboard-skeletons" style={{ padding: '24px 0' }}>
        <div className="skeleton-row pulse" style={{ height: '180px', marginBottom: '24px', borderRadius: '16px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div className="skeleton-row pulse" style={{ height: '120px', borderRadius: '16px' }}></div>
          <div className="skeleton-row pulse" style={{ height: '120px', borderRadius: '16px' }}></div>
          <div className="skeleton-row pulse" style={{ height: '120px', borderRadius: '16px' }}></div>
        </div>
        <div className="skeleton-row pulse" style={{ height: '400px', borderRadius: '16px' }}></div>
      </div>
    );
  }

  return (
    <div className="redesigned-dashboard">
      
      {/* SECTION 1: HERO NUMBER */}
      <section className="dashboard-hero-section">
        <span className="hero-label">AVAILABLE TO SPEND</span>
        <h1 className="hero-number">
          <AnimatedNumber value={availableToSpend} format={formatCurrency} />
        </h1>
        <p className="hero-subtitle">
          of {formatCurrency(income)} income this month
        </p>

        {/* Progress track */}
        <div className="hero-progress-track">
          <div 
            className="hero-progress-fill" 
            style={{ width: mounted ? `${Math.min(100, spendEnvelopeMetrics.percent)}%` : '0%' }}
          ></div>
        </div>

        {/* Inline statistics row */}
        {isMobile ? (
          <div className="hero-stats-mobile-grid">
            <div className="hero-stat-cell">
              <strong>{formatCurrency(dailySpendAllowance)}/day</strong>
              <span>allowance</span>
            </div>
            <div className="hero-stat-cell">
              <strong>{daysLeftInMonth} days</strong>
              <span>remaining</span>
            </div>
            <div className="hero-stat-cell full-width">
              <strong>{spendEnvelopeMetrics.percent.toFixed(0)}%</strong>
              <span>of budget left</span>
            </div>
          </div>
        ) : (
          <div className="hero-stats-row">
            <span className="hero-stat-item">
              <strong>{formatCurrency(dailySpendAllowance)}/day</strong> allowance
            </span>
            <span className="hero-stat-divider">·</span>
            <span className="hero-stat-item">
              <strong>{daysLeftInMonth} days</strong> remaining
            </span>
            <span className="hero-stat-divider">·</span>
            <span className="hero-stat-item">
              <strong>{spendEnvelopeMetrics.percent.toFixed(0)}%</strong> of budget left
            </span>
          </div>
        )}
      </section>

      {/* SECTION 2: SUMMARY STRIP */}
      <section className="summary-strip-grid">
        {/* Card 1: Income */}
        <div className="glass-card summary-strip-card">
          <div className="card-header-label">
            <span className="status-dot dot-green"></span>
            INCOME THIS MONTH
          </div>
          <div className="card-large-val val-green">
            <AnimatedNumber value={income} format={formatCurrency} />
          </div>
          <div className="card-footer-lbl">
            <span className={incomeDiff >= 0 ? 'text-green' : 'text-red'}>
              {incomeDiff >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(incomeDiff))} vs last month
            </span>
          </div>
        </div>

        {/* Card 2: Spent */}
        <div className="glass-card summary-strip-card">
          <div className="card-header-label">
            <span className="status-dot dot-red"></span>
            SPENT SO FAR
          </div>
          <div className="card-large-val val-red">
            <AnimatedNumber value={spentSoFar} format={formatCurrency} />
          </div>
          <div className="card-footer-lbl">
            <span>{percentSpent.toFixed(0)}% of income</span>
            <div className="card-mini-track">
              <div 
                className="card-mini-fill fill-red"
                style={{ width: mounted ? `${Math.min(100, percentSpent)}%` : '0%' }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 3: Net */}
        <div className="glass-card summary-strip-card">
          <div className="card-header-label">
            <span className={`status-dot ${monthlySummary.net >= 0 ? 'dot-green' : 'dot-red'}`}></span>
            NET CASHFLOW
          </div>
          <div className={`card-large-val ${monthlySummary.net >= 0 ? 'val-green' : 'val-red'}`}>
            {monthlySummary.net >= 0 ? '+' : ''}
            <AnimatedNumber value={monthlySummary.net} format={formatCurrency} />
          </div>
          <div className="card-footer-lbl">
            <span className={monthlySummary.net >= 0 ? 'text-green' : 'text-red'}>
              {monthlySummary.net >= 0 ? 'on track' : 'over budget'}
            </span>
          </div>
        </div>
      </section>

      {/* Grid wrapper for flow & detail cards */}
      <div className="dashboard-grid-layout">
        
        {/* SECTION 3: MONEY FLOW TIMELINE CASCADE */}
        <div className="glass-card money-flow-card">
          <div className="card-header-block">
            <h3>Where your money goes</h3>
            <p className="card-subtitle-text">This month's flow</p>
          </div>

          <div className="money-flow-list">
            {flowRows.map((row, idx) => {
              const barPercent = income > 0 ? (row.amount / maxVal) * 100 : 0;
              let amountTextClass = 'val-neutral';
              let barColorClass = 'bar-blue-white';

              if (row.type === 'positive') {
                amountTextClass = 'text-green';
                barColorClass = 'bar-green';
              } else if (row.type === 'negative') {
                amountTextClass = 'text-red';
                barColorClass = 'bar-red';
              } else if (row.type === 'purple') {
                amountTextClass = 'text-purple';
                barColorClass = 'bar-purple';
              }

              const isLast = idx === flowRows.length - 1;

              return (
                <div 
                  key={row.label} 
                  className={`money-flow-row ${mounted ? 'animate' : ''} ${isLast ? 'flow-highlight-row' : ''}`}
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  <div className="flow-col-step">
                    <span className="step-badge">{idx + 1}</span>
                  </div>
                  <div className="flow-col-label">
                    <span>{row.label}</span>
                  </div>
                  <div className={`flow-col-amount ${amountTextClass}`}>
                    {row.type === 'negative' ? '-' : ''}
                    {formatCurrency(row.amount)}
                  </div>
                  {!isMobile && (
                    <div className="flow-col-bar">
                      <div 
                        className={`flow-bar-track-visual ${barColorClass}`}
                        style={{ width: mounted ? `${barPercent}%` : '0%' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column cards stack */}
        <div className="dashboard-sidebar-column">

          {/* SECTION 4: DAILY ALLOWANCE CARD */}
          <div className="glass-card daily-allowance-card-new">
            <div className="allowance-top-row">
              <div className="allowance-left">
                <span className="card-mini-label">DAILY ALLOWANCE</span>
                <div className="allowance-huge-number">
                  <AnimatedNumber value={dailySpendAllowance} format={formatCurrency} />
                </div>
                <span className="allowance-days-remaining">
                  per day for {daysLeftInMonth} days
                </span>
              </div>
              <div className="allowance-right">
                <div className="circular-progress-wrapper">
                  <svg className="circular-progress-svg" viewBox="0 0 64 64">
                    {/* Background track circle */}
                    <circle 
                      className="circle-track" 
                      cx="32" 
                      cy="32" 
                      r={radius} 
                      strokeWidth="5"
                    />
                    {/* Dynamic green indicator circle */}
                    <circle 
                      className="circle-indicator" 
                      cx="32" 
                      cy="32" 
                      r={radius} 
                      strokeWidth="5"
                      strokeDasharray={circumference}
                      strokeDashoffset={mounted ? strokeDashoffset : circumference}
                    />
                  </svg>
                  <div className="circle-inner-labels">
                    <span className="circle-number-val">{daysLeftInMonth}</span>
                    <span className="circle-lbl-text">days left</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily spend mini chart */}
            <div className="allowance-chart-section">
              <span className="chart-info-label">LAST {isMobile ? 5 : 7} DAYS SPEND</span>
              <div className="mini-chart-box" style={{ height: '80px', marginTop: '8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySpendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="mini-chart-tooltip">
                              <span>{payload[0].payload.dateStr}</span>
                              <strong>{formatCurrency(payload[0].value)}</strong>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="spend" radius={[3, 3, 0, 0]}>
                      {dailySpendData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.spend > dailySpendAllowance ? '#ef4444' : '#22c55e'} 
                        />
                      ))}
                    </Bar>
                    <ReferenceLine 
                      y={dailySpendAllowance} 
                      stroke="#f59e0b" 
                      strokeDasharray="3 3" 
                      label=""
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* SECTION 5: ENVELOPE BUDGET CARD */}
          <div className="glass-card envelope-budget-card-new">
            <div className="envelope-card-header">
              <span className="card-mini-label">ENVELOPE BUDGET</span>
              <span className="envelope-percent-badge">
                {spendEnvelopeMetrics.percent.toFixed(0)}% remaining
              </span>
            </div>

            {/* Main Rounded Progress Bar */}
            <div className="envelope-main-track">
              <div 
                className="envelope-main-fill"
                style={{ width: mounted ? `${Math.min(100, spendEnvelopeMetrics.percent)}%` : '0%' }}
              ></div>
            </div>

            <div className="envelope-stats-summary">
              <div className="envelope-stat-box">
                <span className="stats-lbl">Remaining</span>
                <span className="stats-val-large">
                  <AnimatedNumber value={spendEnvelopeMetrics.remaining} format={formatCurrency} />
                </span>
              </div>
              <div className="envelope-stat-box text-right">
                <span className="stats-lbl">Spent</span>
                <span className="stats-val-muted">
                  {formatCurrency(Math.max(0, spendEnvelopeMetrics.total - spendEnvelopeMetrics.remaining))} spent
                </span>
              </div>
            </div>

            {/* Expandable Breakdown Section */}
            <div className="envelope-breakdown-wrapper">
              <button 
                onClick={() => setShowBreakdown(!showBreakdown)} 
                className="breakdown-toggle-btn"
                type="button"
              >
                <span>{showBreakdown ? 'Hide category breakdown' : 'Show breakdown'}</span>
                {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showBreakdown && (
                <div className="breakdown-categories-list">
                  {categoryBudgets.map(cat => (
                    <div key={cat.name} className="breakdown-cat-row">
                      <div className="cat-row-header">
                        <span className="cat-row-name">{cat.name}</span>
                        <span className="cat-row-remaining">{formatCurrency(cat.remaining)} left</span>
                      </div>
                      <div className="cat-row-track">
                        <div 
                          className={`cat-row-fill ${cat.percent > 60 ? 'fill-green' : cat.percent > 30 ? 'fill-amber' : 'fill-red'}`}
                          style={{ width: `${Math.min(100, cat.percent)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;
