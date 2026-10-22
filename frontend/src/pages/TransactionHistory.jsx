import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';

const PAYMENT_METHODS = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking'];

export default function TransactionHistory() {
  const {
    transactions, loading, updateTransaction, deleteTransaction,
    statusMessage, formatRupee, selectedMonth
  } = useExpense();

  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: '', type: 'expense', category: '', date: '', paymentMethod: 'UPI', note: ''
  });

  const filtered = transactions.filter(tx => typeFilter === 'all' || tx.type === typeFilter);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sortBy === 'amount-desc') return b.amount - a.amount;
    if (sortBy === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  const startEdit = (tx) => {
    setEditingItem(tx);
    setEditForm({
      amount: tx.amount, type: tx.type, category: tx.category,
      date: tx.date ? tx.date.split('T')[0] : '',
      paymentMethod: tx.paymentMethod || 'UPI',
      note: tx.note || ''
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.amount || Number(editForm.amount) <= 0) return;
    await updateTransaction(editingItem._id, editForm);
    setEditingItem(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this transaction?')) deleteTransaction(id);
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <span>Transactions {selectedMonth ? `— ${selectedMonth}` : '— All Time'}</span>
          <span className="card-title-count">{sorted.length} records</span>
        </div>

        {statusMessage.text && (
          <div className={`alert-box ${statusMessage.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {statusMessage.text}
          </div>
        )}

        {/* Filter & Sort Bar */}
        <div className="filter-bar">
          <div className="filter-tabs">
            {['all', 'expense', 'income'].map(t => (
              <button
                key={t}
                type="button"
                className={typeFilter === t ? 'active' : ''}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? 'All' : t === 'expense' ? 'Expenses' : 'Income'}
              </button>
            ))}
          </div>
          <div className="filter-bar-sort">
            <label>Sort:</label>
            <select
              className="form-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="empty-state">Loading records...</div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">No transactions recorded for this period.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th>Note</th>
                  <th className="col-amount">Amount</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((tx) => (
                  <tr key={tx._id}>
                    <td className="col-date">
                      {tx.date ? new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="col-category">{tx.category}</td>
                    <td>{tx.type === 'income' ? 'Income' : 'Expense'}</td>
                    <td>{tx.paymentMethod || 'UPI'}</td>
                    <td className={tx.note ? '' : 'col-note-empty'}>{tx.note || '-'}</td>
                    <td className="col-amount">
                      {tx.type === 'income' ? '+' : '-'}{formatRupee(tx.amount)}
                    </td>
                    <td className="col-actions">
                      <button type="button" className="action-btn edit" onClick={() => startEdit(tx)}>Edit</button>
                      <button type="button" className="action-btn delete" onClick={() => handleDelete(tx._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">Edit Transaction</h3>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>Amount (₹) *</label>
                <input name="amount" type="number" min="1" step="any"
                  className="form-control" value={editForm.amount} onChange={handleEditChange} required />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <input name="category" type="text"
                  className="form-control" value={editForm.category} onChange={handleEditChange} required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input name="date" type="date"
                    className="form-control" value={editForm.date} onChange={handleEditChange} required />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select name="paymentMethod" className="form-control" value={editForm.paymentMethod} onChange={handleEditChange}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Note</label>
                <input name="note" type="text"
                  className="form-control" value={editForm.note} onChange={handleEditChange} />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">Save Changes</button>
                <button type="button" className="btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
