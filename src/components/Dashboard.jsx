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
  creditCards,
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
  windowWidth,
  // New props
  cashAvailable = 0,
  totalAvailableCredit = 0,
  totalOwed = 0,
  monthlyObligations = 0,
  cashExpensesTotal = 0,
  creditExpensesTotal = 0,
  creditCardChargesThisMonth = {},
  investmentGoals = []
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
    const daysCount = isMobile ? 5 : 7;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1);
      
      const totalSpend = transactions.reduce((sum, tx) => {
        // Cash spent only (debit/cash spend, excluding card charges)
        const cardId = tx.cardId || tx.linked_card_id;
        if (tx.type === 'expense' && tx.date === dateStr && !cardId) {
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
  const plannedPayoffs = monthlyCardPayoffsTotal;
  
  // Credit card charges in current month
  const creditCardCharges = useMemo(() => {
    return Object.values(creditCardChargesThisMonth).reduce((sum, amt) => sum + amt, 0);
  }, [creditCardChargesThisMonth]);

  const totalCreditLimits = useMemo(() => {
    return creditCards.reduce((sum, c) => sum + c.limit, 0);
  }, [creditCards]);

  const creditAvailablePercent = totalCreditLimits > 0 ? (totalAvailableCredit / totalCreditLimits) * 100 : 0;

  // Sum of investment goal targets
  const investTarget = useMemo(() => {
    return investmentGoals.reduce((sum, g) => sum + (parseFloat(g.contribution) || 0), 0);
  }, [investmentGoals]);

  // Available to deploy (cash + credit combined)
  const availableToDeploy = cashAvailable + totalAvailableCredit;

  const flowRows = useMemo(() => {
    return [
      { label: 'Income', amount: income, type: 'positive' },
      { label: 'Cash bills & expenses', amount: cashExpensesTotal, type: 'negative' },
      { label: 'Card payoffs planned', amount: plannedPayoffs, type: 'negative' },
      { label: 'Cash available', amount: cashAvailable, type: 'positive', highlight: true },
      { type: 'divider', label: 'CREDIT (not cash)' },
      { label: 'Credit card charges', amount: creditCardCharges, type: 'purple' },
      { label: 'Available credit', amount: totalAvailableCredit, type: 'blue' },
      { type: 'divider' },
      { label: 'Invest target', amount: investTarget, type: 'negative-purple' },
      { label: 'Available to deploy', amount: availableToDeploy, type: 'white', highlight: true }
    ];
  }, [income, cashExpensesTotal, plannedPayoffs, cashAvailable, creditCardCharges, totalAvailableCredit, investTarget, availableToDeploy]);

  const maxVal = Math.max(income, totalAvailableCredit, 1);

  const categoryBudgets = useMemo(() => {
    const categoriesMap = {};
    CATEGORIES.forEach(cat => {
      categoriesMap[cat] = { spent: 0, budget: cat === 'Income' ? 0 : 250 };
    });

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

  const percentSpent = income > 0 ? (cashExpensesTotal / income) * 100 : 0;

  // --- Warnings & Banners ---
  const creditDebtWarning = totalOwed > 0.2 * income && income > 0;
  const lowCashWarning = cashAvailable < monthlyObligations;

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
      
      {/* SECTION: SMART WARNING BANNERS */}
      <div className="dashboard-banners-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {lowCashWarning && (
          <div className="dashboard-warning-banner red-banner" style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#ef4444',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>Low cash warning — only <strong>{formatCurrency(cashAvailable)}</strong> available after obligations</span>
          </div>
        )}
        {creditDebtWarning && (
          <div className="dashboard-warning-banner amber-banner" style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#f59e0b',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>Your card balances are <strong>{formatCurrency(totalOwed)}</strong> — consider scheduling a payoff</span>
          </div>
        )}
      </div>

      {/* SECTION 1: HERO NUMBER (TWO COLUMN SPLIT) */}
      <section className="dashboard-hero-section-new glass-card" style={{ width: '100%' }}>
        <div className="hero-columns-container" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
          {/* Left Column: Cash Available */}
          <div className="hero-column left-column">
            <span className="hero-label">CASH AVAILABLE</span>
            <h1 className="hero-number val-green" style={{ fontSize: '40px', margin: '8px 0 4px 0' }}>
              <AnimatedNumber value={cashAvailable} format={formatCurrency} />
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)', margin: '0 0 16px 0' }}>
              after bills & payoffs
            </p>
            <div className="hero-progress-track">
              <div 
                className="hero-progress-fill" 
                style={{ 
                  width: mounted && income > 0 ? `${Math.min(100, (cashAvailable / income) * 100)}%` : '0%',
                  backgroundColor: '#22c55e'
                }}
              ></div>
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              {income > 0 ? ((cashAvailable / income) * 100).toFixed(0) : 0}% of income remaining
            </span>
          </div>

          {/* Right Column: Credit Available */}
          <div className="hero-column right-column">
            <span className="hero-label" style={{ color: '#a78bfa' }}>CREDIT AVAILABLE</span>
            <h1 className="hero-number val-purple" style={{ fontSize: '40px', margin: '8px 0 4px 0', color: '#a78bfa' }}>
              <AnimatedNumber value={totalAvailableCredit} format={formatCurrency} />
            </h1>
            <p className="hero-subtitle" style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)', margin: '0 0 16px 0' }}>
              across {creditCards.length} {creditCards.length === 1 ? 'card' : 'cards'}
            </p>
            <div className="hero-progress-track">
              <div 
                className="hero-progress-fill" 
                style={{ 
                  width: mounted && totalCreditLimits > 0 ? `${Math.min(100, creditAvailablePercent)}%` : '0%',
                  backgroundColor: '#a78bfa'
                }}
              ></div>
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              {totalCreditLimits > 0 ? creditAvailablePercent.toFixed(0) : 0}% available credit limit
            </span>
          </div>
        </div>

        <div className="hero-divider-line" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '20px 0' }} />

        {/* Bottom Row: True Liquid Position */}
        <div className="hero-liquid-row" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <span className="hero-label" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', margin: 0 }}>TRUE LIQUID POSITION</span>
          <strong style={{ fontSize: '18px', color: '#ffffff' }}>
            {formatCurrency(cashAvailable - totalOwed)}
          </strong>
          <span className="info-tooltip-trigger" title="Your cash minus what you currently owe on all credit cards" style={{ cursor: 'help', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>ℹ️</span>
        </div>
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
        <div className="glass-card summary-strip-card" style={{ gap: '8px' }}>
          <div className="card-header-label">
            <span className="status-dot dot-red"></span>
            SPENT SO FAR
          </div>
          <div className="card-large-val val-red" style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <AnimatedNumber value={cashExpensesTotal} format={formatCurrency} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>cash spent</span>
          </div>
          <div className="card-medium-val val-purple" style={{ fontSize: '14px', marginTop: '2px', display: 'flex', alignItems: 'center' }}>
            <AnimatedNumber value={creditExpensesTotal} format={formatCurrency} />
            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', marginLeft: '4px', textTransform: 'uppercase' }}>on cards</span>
            <span className="info-tooltip-trigger" title="Card charges don't reduce your cash until you make a payment" style={{ marginLeft: '6px', cursor: 'help', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>ℹ️</span>
          </div>
        </div>

        {/* Card 3: Net */}
        <div className="glass-card summary-strip-card">
          <div className="card-header-label">
            <span className={`status-dot ${cashAvailable >= 0 ? 'dot-green' : 'dot-red'}`}></span>
            NET CASHFLOW
          </div>
          <div className={`card-large-val ${cashAvailable >= 0 ? 'val-green' : 'val-red'}`}>
            {cashAvailable >= 0 ? '+' : ''}
            <AnimatedNumber value={cashAvailable} format={formatCurrency} />
          </div>
          <div className="card-footer-lbl">
            {totalOwed > 0 ? (
              <span className="text-amber" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⚠️ {formatCurrency(totalOwed)} owed on cards
              </span>
            ) : (
              <span className={cashAvailable >= 0 ? 'text-green' : 'text-red'}>
                {cashAvailable >= 0 ? 'on track' : 'over budget'}
              </span>
            )}
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
              if (row.type === 'divider') {
                return (
                  <div key={`divider-${idx}`} className="flow-divider-row" style={{ display: 'flex', alignItems: 'center', margin: '14px 0' }}>
                    <div className="flow-divider-line" style={{ flex: 1, borderTop: '1px dotted rgba(255, 255, 255, 0.12)' }} />
                    {row.label && (
                      <span className="flow-divider-label" style={{ padding: '0 10px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {row.label}
                      </span>
                    )}
                    <div className="flow-divider-line" style={{ flex: 1, borderTop: '1px dotted rgba(255, 255, 255, 0.12)' }} />
                  </div>
                );
              }

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
              } else if (row.type === 'blue') {
                amountTextClass = 'text-blue';
                barColorClass = 'bar-blue';
              } else if (row.type === 'negative-purple') {
                amountTextClass = 'text-purple';
                barColorClass = 'bar-purple';
              }

              const isHighlight = row.highlight;

              return (
                <div 
                  key={row.label} 
                  className={`money-flow-row ${mounted ? 'animate' : ''} ${isHighlight ? 'flow-highlight-row' : ''}`}
                  style={{ transitionDelay: `${idx * 40}ms` }}
                >
                  <div className="flow-col-step">
                    <span className="step-badge">{idx + 1}</span>
                  </div>
                  <div className="flow-col-label">
                    <span>{row.label}</span>
                  </div>
                  <div className={`flow-col-amount ${amountTextClass}`}>
                    {(row.type === 'negative' || row.type === 'negative-purple') ? '-' : ''}
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
                    <circle 
                      className="circle-track" 
                      cx="32" 
                      cy="32" 
                      r={radius} 
                      strokeWidth="5"
                    />
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

            {/* Credit Exposure Warning */}
            {spendEnvelopeMetrics.creditExposure > 0 && (
              <div className="envelope-credit-warning" style={{
                fontSize: '12px',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>⚠️</span>
                <span><strong>{formatCurrency(spendEnvelopeMetrics.creditExposure)}</strong> charged to cards — plan a payoff to protect your budget</span>
              </div>
            )}

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
