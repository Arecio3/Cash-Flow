import { useState, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { X, Upload, Check, AlertTriangle, RefreshCw } from 'lucide-react';

// Set pdfjs worker source CDN link matching the installed version
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs`;

const CATEGORIES = ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Credit Card', 'Income', 'Other'];

const suggestCategory = (descText) => {
  const desc = descText.toLowerCase();
  if (desc.includes('publix') || desc.includes('grocery') || desc.includes('market') || desc.includes('kroger') || desc.includes('whole foods') || desc.includes('food') || desc.includes('restaurant') || desc.includes('cafe')) {
    return 'Food';
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('hulu') || desc.includes('disney') || desc.includes('concert') || desc.includes('theatre') || desc.includes('show') || desc.includes('steam')) {
    return 'Entertainment';
  }
  if (desc.includes('chevron') || desc.includes('shell') || desc.includes('exxon') || desc.includes('gas') || desc.includes('uber') || desc.includes('lyft') || desc.includes('taxi') || desc.includes('transit') || desc.includes('metro')) {
    return 'Transport';
  }
  if (desc.includes('rent') || desc.includes('apartment') || desc.includes('mortgage') || desc.includes('housing')) {
    return 'Housing';
  }
  if (desc.includes('electric') || desc.includes('power') || desc.includes('water') || desc.includes('comcast') || desc.includes('internet') || desc.includes('wifi') || desc.includes('utilities') || desc.includes('phone') || desc.includes('verizon') || desc.includes('att')) {
    return 'Utilities';
  }
  if (desc.includes('insurance') || desc.includes('medical') || desc.includes('health') || desc.includes('doctor') || desc.includes('hospital') || desc.includes('aetna') || desc.includes('blue cross') || desc.includes('premium')) {
    return 'Healthcare';
  }
  if (desc.includes('paycheck') || desc.includes('salary') || desc.includes('deposit') || desc.includes('freelance') || desc.includes('direct deposit')) {
    return 'Income';
  }
  if (desc.includes('payment') || desc.includes('credit card') || desc.includes('chase') || desc.includes('amex') || desc.includes('capital one')) {
    return 'Credit Card';
  }
  return 'Other';
};

export function ImportModal({ 
  onClose, 
  onImportConfirm, 
  creditCards, 
  existingTransactions,
  addToast 
}) {
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState({});
  const [bulkCardId, setBulkCardId] = useState('');
  
  // CSV Custom Mapping State
  const [csvRawRows, setCsvRawRows] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [showMappingUI, setShowMappingUI] = useState(false);
  const [mappings, setMappings] = useState({ date: -1, desc: -1, amount: -1 });

  const fileInputRef = useRef(null);

  // Parse CSV helper
  const parseCSVText = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    return lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  // Parse OFX/QFX helper
  const parseOFXText = (text) => {
    const txMatches = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g);
    if (!txMatches) return [];

    return txMatches.map((block) => {
      const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
      const amtMatch = block.match(/<TRNAMT>([-+]?\d+(?:\.\d+)?)/);
      const nameMatch = block.match(/<NAME>(.*?)(?:\r?\n|<)/);

      const rawDate = dateMatch ? dateMatch[1].trim() : ''; // YYYYMMDD
      const rawAmt = amtMatch ? parseFloat(amtMatch[1].trim()) : 0;
      const description = nameMatch ? nameMatch[1].trim() : 'Unspecified Payee';

      // Format Date YYYY-MM-DD
      const formattedDate = rawDate.length >= 8 
        ? `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`
        : new Date().toISOString().split('T')[0];

      // Amounts in OFX are positive for credit/deposits, negative for charges/debits
      const parsedType = rawAmt < 0 ? 'expense' : 'income';
      const positiveAmount = Math.abs(rawAmt);

      return {
        date: formattedDate,
        description,
        amount: positiveAmount,
        type: parsedType,
        category: suggestCategory(description),
        cardId: ''
      };
    });
  };

  // PDF Text extraction
  const getPdfText = async (arrayBuffer) => {
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  // Query Anthropic to parse PDF text
  const parsePdfTextWithClaude = async (pdfText) => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing VITE_ANTHROPIC_API_KEY in .env.local configuration file.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: 'You are a financial statement parser. Extract all transactions from the provided bank or credit card statement text. Return ONLY a JSON array with no explanation. Each transaction object must have: date (YYYY-MM-DD), description (string), amount (positive number), type ("income" or "expense"). Debits and charges are expenses. Credits, payments received, and deposits are income. If you cannot parse a line as a transaction, skip it.',
        messages: [
          {
            role: 'user',
            content: `Please parse these transactions from the statement text:\n\n${pdfText}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API call failed: ${errText}`);
    }

    const resData = await response.json();
    const assistantContent = resData.content[0].text;
    
    // Parse JSON array
    try {
      const jsonStart = assistantContent.indexOf('[');
      const jsonEnd = assistantContent.lastIndexOf(']') + 1;
      const jsonStr = assistantContent.substring(jsonStart, jsonEnd);
      return JSON.parse(jsonStr);
    } catch (err) {
      console.error('Failed to parse JSON response from Claude assistant:', assistantContent, err);
      throw new Error('Failed to parse JSON response from Claude assistant.', { cause: err });
    }
  };

  // Process selected file
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setParsing(true);
    setCsvRawRows([]);
    setShowMappingUI(false);

    try {
      const fileName = file.name.toLowerCase();
      const reader = new FileReader();

      if (fileName.endsWith('.csv')) {
        reader.onload = (event) => {
          const csvText = event.target.result;
          const rows = parseCSVText(csvText);
          processCSV(rows);
        };
        reader.readAsText(file);
      } else if (fileName.endsWith('.ofx') || fileName.endsWith('.qfx')) {
        reader.onload = (event) => {
          const ofxText = event.target.result;
          const parsed = parseOFXText(ofxText);
          if (parsed.length === 0) {
            addToast('Could not find any transactions in OFX/QFX file.', 'delete');
          } else {
            initializeParsedRows(parsed);
          }
          setParsing(false);
        };
        reader.readAsText(file);
      } else if (fileName.endsWith('.pdf')) {
        reader.onload = async (event) => {
          try {
            const buffer = event.target.result;
            const textContent = await getPdfText(buffer);
            const rawTransactions = await parsePdfTextWithClaude(textContent);
            
            const formatted = rawTransactions.map(t => ({
              date: t.date || new Date().toISOString().split('T')[0],
              description: t.description || 'Parsed Transaction',
              amount: parseFloat(t.amount) || 0,
              type: t.type === 'income' ? 'income' : 'expense',
              category: suggestCategory(t.description || ''),
              cardId: ''
            }));

            initializeParsedRows(formatted);
          } catch (err) {
            console.error(err);
            addToast(err.message || 'Error parsing PDF with Claude.', 'delete');
          } finally {
            setParsing(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        addToast('Unsupported file type. Use PDF, CSV, or OFX/QFX.', 'delete');
        setParsing(false);
      }
    } catch (err) {
      console.error(err);
      addToast('Error reading file.', 'delete');
      setParsing(false);
    }
  };

  // CSV column parser mapping
  const processCSV = (rows) => {
    if (rows.length < 2) {
      addToast('CSV file is empty or missing rows.', 'delete');
      setParsing(false);
      return;
    }

    const headers = rows[0].map(h => h.toLowerCase().trim());
    setCsvHeaders(rows[0]);
    setCsvRawRows(rows.slice(1));

    // Auto-detect mappings
    const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('time') || h.includes('posted') || h.includes('day'));
    const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('name') || h.includes('payee') || h.includes('merchant') || h.includes('detail'));
    const amtIdx = headers.findIndex(h => h.includes('amount') || h.includes('charge') || h.includes('payment') || h.includes('value') || h.includes('sum'));

    if (dateIdx !== -1 && descIdx !== -1 && amtIdx !== -1) {
      // Auto mapping succeeded
      const mapped = rows.slice(1).map(row => {
        const rawAmt = parseFloat(row[amtIdx]?.replace(/[$,]/g, '')) || 0;
        const type = rawAmt < 0 ? 'expense' : 'income';
        const absAmt = Math.abs(rawAmt);
        const desc = row[descIdx] || 'CSV Transaction';
        return {
          date: parseCSVDate(row[dateIdx]),
          description: desc,
          amount: absAmt,
          type: type,
          category: suggestCategory(desc),
          cardId: ''
        };
      }).filter(r => r.amount > 0);

      initializeParsedRows(mapped);
      setParsing(false);
    } else {
      // Prompt user to mapping
      setMappings({
        date: dateIdx !== -1 ? dateIdx : 0,
        desc: descIdx !== -1 ? descIdx : 1,
        amount: amtIdx !== -1 ? amtIdx : 2
      });
      setShowMappingUI(true);
      setParsing(false);
    }
  };

  const parseCSVDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const s = dateStr.trim();
    // Try converting YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    
    // Try MM/DD/YYYY
    const slashParts = s.split('/');
    if (slashParts.length === 3) {
      let mm = slashParts[0].padStart(2, '0');
      let dd = slashParts[1].padStart(2, '0');
      let yyyy = slashParts[2];
      if (yyyy.length === 2) yyyy = '20' + yyyy;
      return `${yyyy}-${mm}-${dd}`;
    }
    return new Date().toISOString().split('T')[0];
  };

  const applyCSVMapping = () => {
    const dateIdx = mappings.date;
    const descIdx = mappings.desc;
    const amtIdx = mappings.amount;

    if (dateIdx === -1 || descIdx === -1 || amtIdx === -1) {
      addToast('Please assign all three required columns.', 'delete');
      return;
    }

    const mapped = csvRawRows.map(row => {
      const rawAmt = parseFloat(row[amtIdx]?.replace(/[$,]/g, '')) || 0;
      const type = rawAmt < 0 ? 'expense' : 'income';
      const absAmt = Math.abs(rawAmt);
      const desc = row[descIdx] || 'CSV Transaction';
      return {
        date: parseCSVDate(row[dateIdx]),
        description: desc,
        amount: absAmt,
        type: type,
        category: suggestCategory(desc),
        cardId: ''
      };
    }).filter(r => r.amount > 0);

    initializeParsedRows(mapped);
    setShowMappingUI(false);
  };

  const initializeParsedRows = (rows) => {
    const formatted = rows.map((r, index) => {
      // Check for duplicate
      const isDuplicate = existingTransactions.some(tx => (
        tx.date === r.date &&
        Math.abs(tx.amount - r.amount) < 0.01 &&
        tx.description.toLowerCase().trim() === r.description.toLowerCase().trim()
      ));

      return {
        ...r,
        index,
        isDuplicate
      };
    });

    setParsedRows(formatted);

    // Auto-select all by default except duplicates
    const selection = {};
    formatted.forEach((r) => {
      selection[r.index] = !r.isDuplicate;
    });
    setSelectedIndices(selection);
  };

  // Toggle single item checkbox selection
  const handleToggleRow = (index) => {
    setSelectedIndices(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Select all or Deselect all
  const handleSelectAll = (val) => {
    const selection = {};
    parsedRows.forEach((r) => {
      selection[r.index] = val;
    });
    setSelectedIndices(selection);
  };

  // Edit fields directly inline
  const handleFieldChange = (index, field, value) => {
    setParsedRows(prev => prev.map(r => {
      if (r.index === index) {
        const updated = { ...r, [field]: value };
        if (field === 'description') {
          updated.category = suggestCategory(value);
        }
        return updated;
      }
      return r;
    }));
  };

  const handleConfirmImport = async () => {
    const selectedRows = parsedRows.filter(r => selectedIndices[r.index]);
    if (selectedRows.length === 0) {
      addToast('No transactions selected for import.', 'delete');
      return;
    }

    try {
      setParsing(true);
      await onImportConfirm(selectedRows);
      addToast(`${selectedRows.length} transactions imported successfully!`);
      onClose();
    } catch (e) {
      console.error(e);
      addToast('Failed to import transactions.', 'delete');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box glass-card import-modal-box">
        <div className="modal-header">
          <h3>Import Statement</h3>
          <button onClick={onClose} className="close-btn" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Upload dropzone */}
        {parsedRows.length === 0 && !showMappingUI && (
          <div className="import-dropzone-wrapper">
            <label className="import-dropzone">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept=".csv, .pdf, .ofx, .qfx" 
                style={{ display: 'none' }}
              />
              <Upload size={36} className="text-teal dropzone-icon" />
              <h4>Drag & drop or click to upload</h4>
              <p className="dropzone-sub">Supports CSV, PDF, and OFX/QFX statement files</p>
            </label>
            {parsing && (
              <div className="dropzone-loading">
                <RefreshCw size={24} className="spinner-icon text-teal" />
                <span>Reading & parsing statement text...</span>
              </div>
            )}
          </div>
        )}

        {/* CSV Mapping UI */}
        {showMappingUI && (
          <div className="csv-mapping-wrapper">
            <h4>Map CSV Columns</h4>
            <p className="csv-mapping-sub">We couldn't automatically detect your headers. Please map them manually:</p>
            
            <div className="mapping-form">
              <div className="form-group">
                <label>Transaction Date</label>
                <select 
                  className="form-select"
                  value={mappings.date}
                  onChange={(e) => setMappings(prev => ({ ...prev, date: parseInt(e.target.value) }))}
                >
                  <option value={-1}>Select date column...</option>
                  {csvHeaders.map((header, idx) => (
                    <option key={idx} value={idx}>Column {idx + 1}: {header || '(empty)'}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description / Payee</label>
                <select 
                  className="form-select"
                  value={mappings.desc}
                  onChange={(e) => setMappings(prev => ({ ...prev, desc: parseInt(e.target.value) }))}
                >
                  <option value={-1}>Select description column...</option>
                  {csvHeaders.map((header, idx) => (
                    <option key={idx} value={idx}>Column {idx + 1}: {header || '(empty)'}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount</label>
                <select 
                  className="form-select"
                  value={mappings.amount}
                  onChange={(e) => setMappings(prev => ({ ...prev, amount: parseInt(e.target.value) }))}
                >
                  <option value={-1}>Select amount column...</option>
                  {csvHeaders.map((header, idx) => (
                    <option key={idx} value={idx}>Column {idx + 1}: {header || '(empty)'}</option>
                  ))}
                </select>
              </div>

              <div className="mapping-actions">
                <button onClick={applyCSVMapping} className="confirm-import-btn">Apply Mapping</button>
                <button onClick={() => setShowMappingUI(false)} className="cancel-mapping-btn">Back</button>
              </div>
            </div>
          </div>
        )}

        {/* Preview grid */}
        {parsedRows.length > 0 && (
          <div className="import-preview-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="preview-top-actions">
              <div className="selection-toggles">
                <button onClick={() => handleSelectAll(true)} className="btn-small">Select All</button>
                <button onClick={() => handleSelectAll(false)} className="btn-small">Deselect All</button>
              </div>
              
              <div className="bulk-card-wrapper">
                <label>Bulk Link Card:</label>
                <select 
                  className="form-select select-compact"
                  value={bulkCardId}
                  onChange={(e) => {
                    const cardId = e.target.value;
                    setBulkCardId(cardId);
                    if (cardId) {
                      setParsedRows(prev => prev.map(r => ({
                        ...r,
                        cardId
                      })));
                    }
                  }}
                >
                  <option value="">None / Cash</option>
                  {creditCards.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable table container */}
            <div className="preview-table-container" style={{ flex: 1, overflowY: 'auto', marginTop: '12px' }}>
              <table className="preview-table">
                <thead>
                  <tr>
                    <th width="40"></th>
                    <th>Date</th>
                    <th>Description</th>
                    <th width="120">Amount ($)</th>
                    <th width="100">Type</th>
                    <th>Category</th>
                    <th>Route to Card</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr key={row.index} className={row.isDuplicate ? 'possible-duplicate-row' : ''}>
                      <td className="text-center">
                        <input 
                          type="checkbox" 
                          checked={!!selectedIndices[row.index]}
                          onChange={() => handleToggleRow(row.index)}
                        />
                      </td>
                      <td>
                        <input 
                          type="date" 
                          value={row.date}
                          onChange={(e) => handleFieldChange(row.index, 'date', e.target.value)}
                          className="table-input"
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input 
                            type="text" 
                            value={row.description}
                            onChange={(e) => handleFieldChange(row.index, 'description', e.target.value)}
                            className="table-input"
                          />
                          {row.isDuplicate && (
                            <span className="duplicate-alert" title="A transaction with the same Date, Amount, and Description already exists in your records.">
                              <AlertTriangle size={14} className="text-amber" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01"
                          value={row.amount}
                          onChange={(e) => handleFieldChange(row.index, 'amount', parseFloat(e.target.value) || 0)}
                          className="table-input"
                        />
                      </td>
                      <td>
                        <select
                          value={row.type}
                          onChange={(e) => handleFieldChange(row.index, 'type', e.target.value)}
                          className="table-select"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.category}
                          onChange={(e) => handleFieldChange(row.index, 'category', e.target.value)}
                          className="table-select"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.cardId}
                          onChange={(e) => handleFieldChange(row.index, 'cardId', e.target.value)}
                          className="table-select"
                        >
                          <option value="">None / Cash</option>
                          {creditCards.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="preview-confirm-actions">
              <button 
                onClick={handleConfirmImport} 
                className="confirm-import-btn"
                disabled={parsing}
              >
                {parsing ? (
                  <>
                    <RefreshCw size={14} className="spinner-icon" style={{ marginRight: '6px' }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} style={{ marginRight: '6px' }} />
                    Confirm Import ({parsedRows.filter(r => selectedIndices[r.index]).length} selected)
                  </>
                )}
              </button>
              <button onClick={() => setParsedRows([])} className="reset-preview-btn">Reset</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportModal;
