const mongoose = require('mongoose');

// Schema for tracking income and expenses
const transactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Please enter an amount'],
      min: [1, 'Amount must be at least ₹1']
    },
    type: {
      type: String,
      required: [true, 'Please select transaction type'],
      enum: ['income', 'expense']
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      trim: true
    },
    date: {
      type: Date,
      required: [true, 'Please enter a valid date'],
      default: Date.now
    },
    paymentMethod: {
      type: String,
      required: [true, 'Please select payment method'],
      enum: ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking'],
      default: 'UPI'
    },
    note: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {}
);

module.exports = mongoose.model('Transaction', transactionSchema);
