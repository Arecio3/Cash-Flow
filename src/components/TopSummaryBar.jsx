import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

export function TopSummaryBar({ 
  income, 
  expenses, 
  net, 
  currentDate, 
  onPrevMonth, 
  onNextMonth, 
  transactions,
  formatCurrency,
  categoryColors,
  categoryEmojis
}) {
  const [isOpen, setIsOpen] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Determine if it is a past month
  const isPastMonth = useMemo(() => {
    const today = new Date();
    return currentYear < today.getFullYear() || (currentYear === today.getFullYear() && currentMonth < today.getMonth());
  }, [currentYear, currentMonth]);

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calculate category breakdown for the active month
  const breakdown = useMemo(() => {
    const categories = {};
    transactions.forEach((tx) => {
      const txDateObj = new Date(tx.date + 'T00:00:00');
      if (txDateObj.getFullYear() === currentYear && txDateObj.getMonth() === currentMonth) {
        const amt = parseFloat(tx.amount) || 0;
        const catName = tx.category || 'Other';
        if (!categories[catName]) {
          categories[catName] = { amount: 0, type: tx.type };
        }
        categories[catName].amount += amt;
      }
    });

    return Object.entries(categories).map(([name, data]) => ({
      name,
      amount: data.amount,
      type: data.type
    })).sort((a, b) => b.amount - a.amount);
  }, [transactions, currentYear, currentMonth]);

  const netColorClass = net >= 0 ? 'text-green' : 'text-red';

  return (
    <div className="top-summary-wrapper">
      <div className="top-summary-bar" onClick={() => setIsOpen(!isOpen)}>
        {/* Left: Month Selector & Past Month Indicator */}
        <div className="month-selector-wrapper" onClick={(e) => e.stopPropagation()}>
          <button onClick={onPrevMonth} className="summary-nav-btn" aria-label="Previous Month">
            <ChevronLeft size={16} />
          </button>
          <div className="summary-month-label">
            {monthLabel}
            {isPastMonth && (
              <span className="past-month-badge">
                viewing {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <button onClick={onNextMonth} className="summary-nav-btn" aria-label="Next Month">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Center/Right: Key Metrics */}
        <div className="summary-metrics">
          <div className="metric-item">
            <span className="metric-lbl">Income</span>
            <span className="metric-val text-green">{formatCurrency(income)}</span>
          </div>
          <div className="metric-item">
            <span className="metric-lbl">Expenses</span>
            <span className="metric-val text-red">{formatCurrency(expenses)}</span>
          </div>
          <div className="metric-item">
            <span className="metric-lbl">Net</span>
            <span className={`metric-val ${netColorClass}`}>
              {net >= 0 ? '+' : ''}{formatCurrency(net)}
            </span>
          </div>
        </div>

        {/* Mobile Dropdown Indicator */}
        <div className="dropdown-toggle-icon">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Dropdown breakdown */}
      {isOpen && (
        <div className="summary-breakdown-dropdown">
          <div className="breakdown-header">
            <h4>Monthly Category Breakdown</h4>
            <span>{monthLabel}</span>
          </div>
          <div className="breakdown-grid">
            {breakdown.length > 0 ? (
              breakdown.map((item) => {
                const color = categoryColors[item.name] || '#9ca3af';
                const emoji = categoryEmojis[item.name] || '📦';
                return (
                  <div key={item.name} className="breakdown-row">
                    <div className="breakdown-cat-name">
                      <span className="breakdown-emoji">{emoji}</span>
                      <span className="breakdown-name-text">{item.name}</span>
                    </div>
                    <span 
                      className={`breakdown-amount ${item.type === 'income' ? 'text-green' : 'text-red'}`}
                      style={{ borderRight: `3px solid ${color}` }}
                    >
                      {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="empty-breakdown">No transactions logged for this month.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TopSummaryBar;
