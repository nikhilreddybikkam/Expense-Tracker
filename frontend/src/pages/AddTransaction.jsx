import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpense } from '../context/ExpenseContext';

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Rental Income', 'Business', 'Other'];
const EXPENSE_CATEGORIES = ['Housing', 'Rent', 'Groceries', 'Dining Out', 'Utilities', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Other'];
const PAYMENT_METHODS = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking'];

export default function AddTransaction() {
  const { addTransaction, statusMessage, showMessage } = useExpense();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category: 'Groceries',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'UPI',
    note: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleTypeChange = (newType) => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      category: newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showMessage('Please enter an amount greater than ₹0', 'error');
      return;
    }
    if (!formData.date) {
      showMessage('Please select a date', 'error');
      return;
    }
    setSubmitting(true);
    const result = await addTransaction(formData);
    setSubmitting(false);
    if (result.success) {
      setFormData({
        amount: '',
        type: formData.type,
        category: formData.type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: 'UPI',
        note: ''
      });
    }
  };

  return (
    <div className="add-transaction-wrapper">
      <div className="card add-transaction-card">
        <div className="card-title">Record New Transaction</div>

        {statusMessage.text && (
          <div className={`alert-box ${statusMessage.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Type Toggle */}
          <div className="type-toggle">
            <button
              type="button"
              className={formData.type === 'expense' ? 'active-expense' : ''}
              onClick={() => handleTypeChange('expense')}
            >
              💸 Expense
            </button>
            <button
              type="button"
              className={formData.type === 'income' ? 'active-income' : ''}
              onClick={() => handleTypeChange('income')}
            >
              💰 Income
            </button>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label htmlFor="amount">Amount (₹) *</label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 1500"
              className="form-control"
              value={formData.amount}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              className="form-control"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              {(formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              id="date"
              name="date"
              type="date"
              className="form-control"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label htmlFor="paymentMethod">Payment Method</label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              className="form-control"
              value={formData.paymentMethod}
              onChange={handleInputChange}
            >
              {PAYMENT_METHODS.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div className="form-group">
            <label htmlFor="note">Note (Optional)</label>
            <input
              id="note"
              name="note"
              type="text"
              placeholder="e.g. Monthly grocery run"
              className="form-control"
              value={formData.note}
              onChange={handleInputChange}
            />
          </div>

          <button type="submit" className="btn-primary full-width" disabled={submitting}>
            {submitting ? 'Saving...' : '+ Save Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}
