import { useState, useEffect, useRef, useMemo } from 'react';
import { CreditCard as CreditCardIcon, Plus, Edit2, Trash2, Check } from 'lucide-react';

function CreditCardItem({
  card,
  chargesThisMonth,
  payoffAmount,
  formatCurrency,
  getIssuerColor,
  notesOpen,
  toggleNotesCollapse,
  isEditingNotes,
  inlineNotesValue,
  setInlineNotesValue,
  handleSaveInlineNotes,
  handleStartInlineNotesEdit,
  setPayingCardId,
  handleOpenEditCard,
  handleDeleteCard,
  cancelInlineNotesEdit
}) {
  const [flash, setFlash] = useState(false);
  const prevBalanceRef = useRef(card.balance);

  useEffect(() => {
    if (card.balance !== prevBalanceRef.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 800);
      prevBalanceRef.current = card.balance;
      return () => clearTimeout(timer);
    }
  }, [card.balance]);

  const availableCredit = Math.max(0, card.limit - card.balance);
  const utilRatio = card.limit > 0 ? (card.balance / card.limit) * 100 : 0;
  
  let utilColorClass = 'util-green';
  if (utilRatio >= 30 && utilRatio <= 60) utilColorClass = 'util-amber';
  else if (utilRatio > 60) utilColorClass = 'util-red';

  const chargesRatio = card.limit > 0 ? (chargesThisMonth / card.limit) * 100 : 0;
  const cardRewards = card.balance * ((parseFloat(card.cashback) || 0) / 100);
  const issuerInfo = getIssuerColor(card.issuer);

  const noPayoffPlanned = chargesThisMonth > 0 && payoffAmount <= 0;

  return (
    <div className={`cc-card ${flash ? 'flash-active' : ''}`}>
      <div className="cc-header">
        <div className="cc-title-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          {noPayoffPlanned && (
            <span 
              className="amber-warning-dot" 
              title="No payoff planned this month for charges on this card."
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                boxShadow: '0 0 8px #f59e0b'
              }}
            ></span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => handleOpenEditCard(card)} className="cc-edit-btn" title="Edit credit card">
            <Edit2 size={13} />
          </button>
          <button onClick={() => handleDeleteCard(card.id)} className="cc-delete-btn" title="Delete credit card">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="cc-details-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)' }}>
        <span>Statement Close: <strong>{card.statementClose}</strong></span>
        <span>Cashback: <strong>{card.cashback}%</strong></span>
      </div>

      {/* Charges This Month Stat Row */}
      <div className="cc-charges-stat" style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
          <span>Charges This Month:</span>
          <strong style={{ color: '#a78bfa' }}>{formatCurrency(chargesThisMonth)}</strong>
        </div>
        <div className="cc-util-bar" style={{ height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
          <div 
            className="cc-charges-fill" 
            style={{ 
              width: `${Math.min(100, chargesRatio)}%`, 
              height: '100%', 
              backgroundColor: '#a78bfa',
              transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        </div>
      </div>

      <div className="cc-balances" style={{ marginTop: '12px' }}>
        <div>
          <span className="cc-balance-label">Balance</span>
          <p className={`cc-balance-val ${flash ? 'flash-text' : ''}`}>{formatCurrency(card.balance)}</p>
        </div>
        <div className="text-right">
          <span className="cc-balance-label">Available Credit</span>
          <p className="cc-limit-val" style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(availableCredit)} available</p>
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
        
        <div className="cc-status-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          {card.balance === 0 ? (
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

      {/* Cash Impact Row */}
      <div className="cc-cash-impact" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
        <span>Credit Limit: <strong>{formatCurrency(card.limit)}</strong></span>
        <span>CASH IMPACT: <strong style={{ color: '#10b981' }}>{formatCurrency(payoffAmount)} planned payoff</strong></span>
      </div>

      {/* Notes Section */}
      <div className="cc-notes-section" style={{ marginTop: '12px' }}>
        <button 
          onClick={() => toggleNotesCollapse(card.id)} 
          className="notes-toggle-btn"
          type="button"
        >
          {notesOpen ? 'Hide Notes' : 'Show Notes'}
        </button>

        {notesOpen && (
          <div className="notes-content-box">
            {isEditingNotes ? (
              <div className="inline-notes-edit-form">
                <textarea
                  value={inlineNotesValue}
                  onChange={(e) => setInlineNotesValue(e.target.value)}
                  className="form-input inline-notes-textarea"
                  placeholder="Write card notes here..."
                />
                <div className="inline-notes-actions">
                  <button onClick={() => handleSaveInlineNotes(card.id)} className="btn-small save">Save</button>
                  <button onClick={cancelInlineNotesEdit} className="btn-small cancel">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="notes-text-display">
                <p className="notes-text-p">{card.notes || <span className="no-notes-placeholder">No notes added. Click edit to add notes.</span>}</p>
                <button onClick={() => handleStartInlineNotesEdit(card)} className="notes-inline-edit-btn" title="Edit notes inline">
                  <Edit2 size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CreditCardTracker({
  creditCards = [],
  cardLoading = false,
  creditCardChargesThisMonth = {},
  plannedPayoffsPerCard = {},
  formatCurrency,
  getIssuerColor,
  openCardNotes = {},
  toggleNotesCollapse,
  inlineEditingCardNotesId = null,
  inlineNotesValue = '',
  setInlineNotesValue,
  handleSaveInlineNotes,
  handleStartInlineNotesEdit,
  setPayingCardId,
  handleOpenEditCard,
  handleDeleteCard,
  setShowAddCard,
  setInlineEditingCardNotesId
}) {
  return (
    <div className="glass-card cc-tracker-card full-card">
      <div className="card-title-bar">
        <h2>
          <CreditCardIcon size={18} style={{ color: 'var(--accent-blue)' }} />
          Credit Cards
        </h2>
        <button onClick={() => setShowAddCard(true)} className="add-btn">
          <Plus size={14} /> Add Card
        </button>
      </div>

      <div className="cc-list">
        {cardLoading ? (
          <div className="skeleton-list">
            {[1, 2].map((i) => <div key={i} className="skeleton-card pulse"></div>)}
          </div>
        ) : creditCards.length > 0 ? (
          creditCards.map((card) => (
            <CreditCardItem
              key={card.id}
              card={card}
              chargesThisMonth={creditCardChargesThisMonth[card.id] || 0}
              payoffAmount={plannedPayoffsPerCard[card.id] || 0}
              formatCurrency={formatCurrency}
              getIssuerColor={getIssuerColor}
              notesOpen={!!openCardNotes[card.id]}
              toggleNotesCollapse={toggleNotesCollapse}
              isEditingNotes={inlineEditingCardNotesId === card.id}
              inlineNotesValue={inlineNotesValue}
              setInlineNotesValue={setInlineNotesValue}
              handleSaveInlineNotes={handleSaveInlineNotes}
              handleStartInlineNotesEdit={handleStartInlineNotesEdit}
              setPayingCardId={setPayingCardId}
              handleOpenEditCard={handleOpenEditCard}
              handleDeleteCard={handleDeleteCard}
              cancelInlineNotesEdit={() => setInlineEditingCardNotesId(null)}
            />
          ))
        ) : (
          <div className="empty-state">
            <CreditCardIcon size={40} className="empty-icon text-muted" />
            <p>No credit cards configured.</p>
            <button onClick={() => setShowAddCard(true)} className="add-btn mt-button">Add Card</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreditCardTracker;
