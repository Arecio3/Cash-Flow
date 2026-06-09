import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  DollarSign, 
  Tag, 
  Filter, 
  CreditCard as CreditCardIcon, 
  X,
  Wallet,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';

export function TransactionLog({
  creditCards = [],
  txLoading = false,
  txDesc = '',
  setTxDesc,
  txAmount = '',
  setTxAmount,
  txType = 'expense',
  txCategory = 'Other',
  setTxCategory,
  txDate = '',
  setTxDate,
  txCardId = '',
  setTxCardId,
  txErrors = {},
  handleSubmitTransaction,
  handleDeleteTransaction,
  handleTypeChange,
  successFlash = false,
  showMobileTxForm = false,
  setShowMobileTxForm,
  searchTerm = '',
  setSearchTerm,
  filterType = 'All',
  setFilterType,
  filterCategory = 'All',
  setFilterCategory,
  filteredTransactions = [],
  CATEGORIES = [],
  CATEGORY_EMOJIS = {},
  CATEGORY_COLORS = {},
  formatCurrency,
  setShowImportModal
}) {
  const [paymentMode, setPaymentMode] = useState(txCardId ? 'credit' : 'cash');

  useEffect(() => {
    if (txType === 'income') {
      setPaymentMode('cash');
      setTxCardId('');
    } else {
      setPaymentMode(txCardId ? 'credit' : 'cash');
    }
  }, [txType, txCardId, setTxCardId]);

  const handleModeChange = (mode) => {
    setPaymentMode(mode);
    if (mode === 'cash') {
      setTxCardId('');
    } else if (mode === 'credit' && creditCards.length > 0) {
      setTxCardId(creditCards[0].id);
    }
  };

  const selectedCard = useMemo(() => {
    return creditCards.find(c => c.id === txCardId);
  }, [creditCards, txCardId]);

  const availableCredit = useMemo(() => {
    if (!selectedCard) return 0;
    return Math.max(0, selectedCard.limit - selectedCard.balance);
  }, [selectedCard]);

  const overLimitWarning = useMemo(() => {
    const amount = parseFloat(txAmount) || 0;
    return selectedCard && amount > availableCredit;
  }, [selectedCard, txAmount, availableCredit]);

  return (
    <section className="workspace-grid full-grid-mobile">
      {/* Transaction Input Form */}
      <div className={`glass-card transaction-form-card ${successFlash ? 'form-success-flash' : ''} ${showMobileTxForm ? 'mobile-active' : ''}`}>
        <div className="card-title-bar">
          <h2>
            <Plus size={18} style={{ color: 'var(--accent-blue)' }} />
            Log Transaction
          </h2>
          <button 
            type="button" 
            className="mobile-sheet-close-btn" 
            onClick={() => setShowMobileTxForm(false)}
            aria-label="Close form sheet"
          >
            <X size={18} />
          </button>
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
                <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
                Expense
              </button>
              <button
                type="button"
                className={`type-toggle-btn income ${txType === 'income' ? 'active' : ''}`}
                onClick={() => handleTypeChange('income')}
              >
                <Plus size={14} />
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
            <>
              {/* Cash vs Credit Card Toggle */}
              <div className="form-group">
                <label>Payment Method</label>
                <div className="type-toggle-container">
                  <button
                    type="button"
                    className={`type-toggle-btn cash ${paymentMode === 'cash' ? 'active' : ''}`}
                    style={paymentMode === 'cash' ? { backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.25)', fontWeight: '600' } : {}}
                    onClick={() => handleModeChange('cash')}
                  >
                    Cash / Debit
                  </button>
                  <button
                    type="button"
                    className={`type-toggle-btn credit ${paymentMode === 'credit' ? 'active' : ''}`}
                    style={paymentMode === 'credit' ? { backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.25)', fontWeight: '600' } : {}}
                    onClick={() => handleModeChange('credit')}
                  >
                    Credit Card
                  </button>
                </div>
              </div>

              {/* Credit Card Dropdown (only shown if credit card payment mode is selected) */}
              {paymentMode === 'credit' && (
                <div className="form-group">
                  <label htmlFor="tx-card-id">Select Credit Card</label>
                  <div className="input-container">
                    <CreditCardIcon className="input-icon" size={16} />
                    <select
                      id="tx-card-id"
                      className="form-select"
                      value={txCardId}
                      onChange={(e) => setTxCardId(e.target.value)}
                    >
                      <option value="" disabled>Choose a card...</option>
                      {creditCards.map((card) => (
                        <option key={card.id} value={card.id}>{card.name} (Close: {card.statementClose})</option>
                      ))}
                    </select>
                  </div>
                  {selectedCard && (
                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                        {formatCurrency(availableCredit)} available on this card
                      </span>
                      {overLimitWarning && (
                        <span style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                          ⚠️ This charge would put this card over its limit
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

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
            </>
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
          
          <button 
            onClick={() => setShowImportModal(true)} 
            className="import-statement-btn"
            title="Import statement files (CSV, PDF, OFX)"
            type="button"
          >
            <FileSpreadsheet size={14} />
            <span>Import Statement</span>
          </button>
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
            <div className="skeleton-list">
              {[1, 2, 3].map(i => <div key={i} className="skeleton-row pulse"></div>)}
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="transaction-list">
              {filteredTransactions.map((tx) => {
                const card = creditCards.find((c) => c.id === tx.cardId);
                let formattedTxDate = tx.date;
                try {
                  formattedTxDate = format(new Date(tx.date + 'T00:00:00'), 'MMM d, yyyy');
                } catch (e) {
                  console.error('Failed to format date:', tx.date, e);
                }

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
                          <span>{formattedTxDate}</span>
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
              <Wallet size={40} className="empty-icon text-muted" />
              <p>No matching transactions found.</p>
              {(searchTerm || filterCategory !== 'All' || filterType !== 'All') ? (
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
              ) : (
                <button onClick={() => setShowMobileTxForm(true)} className="add-btn mt-button">Add Transaction</button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default TransactionLog;
