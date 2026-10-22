const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Transaction = require('./Transaction');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense_tracker';

// Middleware
app.use(cors({
  origin: '*'
}));
app.use(express.json());

// Helper to construct date range from "YYYY-MM"
const getDateRangeForMonth = (monthStr) => {
  if (!monthStr || monthStr === 'all') return null;
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);
  if (isNaN(year) || isNaN(month)) return null;

  // Start of month (inclusive) and end of month (inclusive)
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
};

// 1. GET /api/transactions - List transactions with optional month filter
app.get('/api/transactions', async (req, res) => {
  try {
    const { month, type } = req.query;
    const filter = {};

    const range = getDateRangeForMonth(month);
    if (range) {
      filter.date = { $gte: range.start, $lte: range.end };
    }

    if (type && ['income', 'expense'].includes(type)) {
      filter.type = type;
    }

    // Sort by date descending
    const transactions = await Transaction.find(filter).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
});

// 2. GET /api/transactions/summary - Aggregation for monthly totals and category breakdown
app.get('/api/transactions/summary', async (req, res) => {
  try {
    const { month } = req.query;
    const matchStage = {};

    const range = getDateRangeForMonth(month);
    if (range) {
      matchStage.date = { $gte: range.start, $lte: range.end };
    }

    // MongoDB Aggregation Pipeline
    const aggResult = await Transaction.aggregate([
      { $match: matchStage },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: '$type',
                total: { $sum: '$amount' },
                count: { $sum: 1 }
              }
            }
          ],
          categories: [
            { $match: { type: 'expense' } },
            {
              $group: {
                _id: '$category',
                total: { $sum: '$amount' },
                count: { $sum: 1 }
              }
            },
            { $sort: { total: -1 } }
          ],
          paymentMethods: [
            {
              $group: {
                _id: '$paymentMethod',
                total: { $sum: '$amount' },
                count: { $sum: 1 }
              }
            },
            { $sort: { total: -1 } }
          ]
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let transactionCount = 0;

    const facet = aggResult[0] || {};
    if (facet.totals) {
      facet.totals.forEach((item) => {
        if (item._id === 'income') totalIncome = item.total;
        if (item._id === 'expense') totalExpense = item.total;
        transactionCount += item.count;
      });
    }

    const categoryBreakdown = (facet.categories || []).map((c) => ({
      category: c._id,
      total: c.total,
      count: c.count
    }));

    const paymentBreakdown = (facet.paymentMethods || []).map((p) => ({
      method: p._id,
      total: p.total,
      count: p.count
    }));

    // Aggregation across all months for the Bar Graph
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrendRaw = await Transaction.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          expense: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
          },
          income: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthlyTrend = monthlyTrendRaw.map((item) => ({
      month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      expense: item.expense,
      income: item.income
    }));

    res.json({
      month: month || 'all',
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount,
      categoryBreakdown,
      paymentBreakdown,
      monthlyTrend
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating summary', error: error.message });
  }
});

// 3. POST /api/transactions - Create new transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { amount, type, category, date, paymentMethod, note } = req.body;

    // Basic human-style validation
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Type must be either income or expense' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const newTransaction = new Transaction({
      amount: Number(amount),
      type,
      category: category.trim(),
      date: date ? new Date(date) : new Date(),
      paymentMethod: paymentMethod || 'UPI',
      note: note ? note.trim() : ''
    });

    const saved = await newTransaction.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create transaction', error: error.message });
  }
});

// 4. PUT /api/transactions/:id - Update transaction
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { amount, type, category, date, paymentMethod, note } = req.body;

    if (amount !== undefined && Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const updated = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(type && { type }),
        ...(category && { category: category.trim() }),
        ...(date && { date: new Date(date) }),
        ...(paymentMethod && { paymentMethod }),
        ...(note !== undefined && { note: note.trim() })
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update transaction', error: error.message });
  }
});

// 5. DELETE /api/transactions/:id - Delete transaction
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete transaction', error: error.message });
  }
});

// Seed sample Indian rupee transactions if empty
async function seedInitialData() {
  const count = await Transaction.countDocuments();
  if (count === 0) {
    const sampleData = [
      {
        amount: 65000,
        type: 'income',
        category: 'Salary',
        date: new Date('2026-10-01'),
        paymentMethod: 'Net Banking',
        note: ''
      },
      {
        amount: 18000,
        type: 'expense',
        category: 'Rent',
        date: new Date('2026-10-02'),
        paymentMethod: 'UPI',
        note: ''
      },
      {
        amount: 4500,
        type: 'expense',
        category: 'Groceries',
        date: new Date('2026-10-05'),
        paymentMethod: 'UPI',
        note: ''
      },
      {
        amount: 15000,
        type: 'income',
        category: 'Freelance',
        date: new Date('2026-10-08'),
        paymentMethod: 'UPI',
        note: ''
      },
      {
        amount: 1850,
        type: 'expense',
        category: 'Electricity Bill',
        date: new Date('2026-10-10'),
        paymentMethod: 'Net Banking',
        note: ''
      },
      {
        amount: 899,
        type: 'expense',
        category: 'Internet Bill',
        date: new Date('2026-10-11'),
        paymentMethod: 'Credit Card',
        note: ''
      },
      {
        amount: 2200,
        type: 'expense',
        category: 'Dining Out',
        date: new Date('2026-10-14'),
        paymentMethod: 'Debit Card',
        note: ''
      },
      {
        amount: 1200,
        type: 'expense',
        category: 'Transport',
        date: new Date('2026-10-17'),
        paymentMethod: 'Cash',
        note: ''
      },
      {
        amount: 3400,
        type: 'expense',
        category: 'Shopping',
        date: new Date('2026-10-20'),
        paymentMethod: 'Credit Card',
        note: ''
      },
      {
        amount: 5000,
        type: 'income',
        category: 'Business',
        date: new Date('2026-10-22'),
        paymentMethod: 'UPI',
        note: ''
      }
    ];

    await Transaction.insertMany(sampleData);
    console.log('Sample data added to MongoDB');
  }
}

// Connect to MongoDB and start server
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully');
    await seedInitialData();
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });
