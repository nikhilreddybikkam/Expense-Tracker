import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const ExpenseContext = createContext();

export const useExpense = () => useContext(ExpenseContext);

export const ExpenseProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    categoryBreakdown: [],
    paymentBreakdown: []
  });

  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Fetch both list and summary whenever selected month changes
  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const monthQuery = selectedMonth ? `?month=${selectedMonth}` : '';
      
      const [txRes, summaryRes] = await Promise.all([
        axios.get(`/api/transactions${monthQuery}`),
        axios.get(`/api/transactions/summary${monthQuery}`)
      ]);

      setTransactions(txRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Error fetching expense data:', err);
      showMessage('Could not load data from backend server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 3500);
  };

  // Add a new transaction (POST)
  const addTransaction = async (data) => {
    try {
      const response = await axios.post('/api/transactions', data);
      showMessage('Transaction added successfully!');
      fetchData();
      return { success: true, data: response.data };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add transaction';
      showMessage(msg, 'error');
      return { success: false, error: msg };
    }
  };

  // Update transaction (PUT)
  const updateTransaction = async (id, data) => {
    try {
      const response = await axios.put(`/api/transactions/${id}`, data);
      showMessage('Transaction updated successfully!');
      fetchData();
      return { success: true, data: response.data };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update transaction';
      showMessage(msg, 'error');
      return { success: false, error: msg };
    }
  };

  // Delete transaction (DELETE)
  const deleteTransaction = async (id) => {
    try {
      await axios.delete(`/api/transactions/${id}`);
      showMessage('Transaction deleted successfully');
      fetchData();
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete transaction';
      showMessage(msg, 'error');
      return { success: false, error: msg };
    }
  };

  // Indian Rupee formatting utility
  const formatRupee = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <ExpenseContext.Provider
      value={{
        transactions,
        summary,
        selectedMonth,
        setSelectedMonth,
        loading,
        statusMessage,
        showMessage,
        fetchData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        formatRupee
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};
