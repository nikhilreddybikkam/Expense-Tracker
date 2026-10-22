import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useExpense } from '../context/ExpenseContext';

const PIE_COLORS = ['#4285F4', '#F4B400', '#B266E3', '#0F9D58', '#E91E63', '#00ACC1', '#FF7043'];

export default function Dashboard() {
  const { summary, loading, formatRupee, selectedMonth, setSelectedMonth, transactions } = useExpense();
  const [chartView, setChartView] = useState('month');

  const isOverall = !selectedMonth;
  const activeView = isOverall ? 'overall' : chartView;

  // Weekly data (Sun - Sat)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData = days.map(day => ({ name: day, amount: 0, expense: 0, income: 0 }));

  (transactions || []).forEach(tx => {
    if (!tx.date) return;
    const d = new Date(tx.date);
    const dayIndex = d.getDay();
    if (dayIndex >= 0 && dayIndex < 7) {
      if (tx.type === 'expense') {
        weeklyData[dayIndex].amount += tx.amount;
        weeklyData[dayIndex].expense += tx.amount;
      } else {
        weeklyData[dayIndex].income += tx.amount;
      }
    }
  });

  // Overall months data
  const overallData = (summary.monthlyTrend || []).map(item => ({
    name: item.month.split(' ')[0],
    amount: item.expense,
    expense: item.expense,
    income: item.income
  }));

  const activeChartData = activeView === 'overall'
    ? (overallData.length ? overallData : [{ name: 'Current', amount: summary.totalExpense, expense: summary.totalExpense, income: summary.totalIncome }])
    : weeklyData;

  const pieData = (summary.categoryBreakdown || []).map(item => ({
    name: item.category,
    value: item.total
  }));

  const balancePositive = summary.balance >= 0;

  return (
    <div className="dashboard-wrapper">

      {/* ── Top Bar ── */}
      <div className="dashboard-topbar">
        <div className="dashboard-topbar-left">
          {/* Month / Overall Toggle */}
          <div className="view-toggle">
            <button
              type="button"
              className={selectedMonth ? 'view-toggle-btn active' : 'view-toggle-btn'}
              onClick={() => {
                if (!selectedMonth) setSelectedMonth(new Date().toISOString().slice(0, 7));
                setChartView('month');
              }}
            >
              Month
            </button>
            <button
              type="button"
              className={!selectedMonth ? 'view-toggle-btn active' : 'view-toggle-btn'}
              onClick={() => {
                setSelectedMonth('');
                setChartView('overall');
              }}
            >
              Overall
            </button>
          </div>

          {selectedMonth && (
            <input
              type="month"
              value={selectedMonth}
              className="month-input"
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setChartView('month');
              }}
              title="Select which month to view"
            />
          )}
        </div>

        <Link to="/add" className="btn-add-transaction">
          + Add Transaction
        </Link>
      </div>

      {/* ── 3 Stat Cards ── */}
      <div className="stat-grid">

        <div className="card">
          <p className="stat-label">Total Income</p>
          <p className="stat-amount">{formatRupee(summary.totalIncome)}</p>
        </div>

        <div className="card">
          <p className="stat-label">Total Expenses</p>
          <p className="stat-amount">{formatRupee(summary.totalExpense)}</p>
        </div>

        <div className="card">
          <p className="stat-label">Net Balance</p>
          <p className="stat-amount">{formatRupee(summary.balance)}</p>
        </div>

      </div>

      {/* ── Charts Row ── */}
      <div className="charts-grid">

        {/* Bar Chart */}
        <div className="card">
          <div className="chart-header">
            <div>
              <p className="chart-title">
                {activeView === 'overall' ? 'Monthly Comparison' : 'Daily Income & Expenses'}
              </p>
              <div className="chart-legend">
                <span className="chart-subtitle">
                  {activeView === 'overall' ? 'All recorded months' : `Data for ${selectedMonth || 'selected month'}`}
                </span>
                <span className="chart-legend-item">
                  <span className="legend-dot income" /> Earning
                </span>
                <span className="chart-legend-item">
                  <span className="legend-dot expense" /> Spending
                </span>
              </div>
            </div>

            {!isOverall && (
              <div className="chart-subtoggle">
                <button
                  type="button"
                  className={chartView === 'month' ? 'chart-subtoggle-btn active' : 'chart-subtoggle-btn'}
                  onClick={() => setChartView('month')}
                >
                  Days
                </button>
                <button
                  type="button"
                  className={chartView === 'overall' ? 'chart-subtoggle-btn active' : 'chart-subtoggle-btn'}
                  onClick={() => setChartView('overall')}
                >
                  Months
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <p className="chart-loading">Loading...</p>
          ) : (
            <ResponsiveContainer width="100%" height={310}>
              <BarChart data={activeChartData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgb(226,232,240)" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={{ stroke: 'rgb(226,232,240)' }} stroke="rgb(100,116,139)" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="rgb(100,116,139)"
                  tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  formatter={(val, name) => [formatRupee(val), name]}
                  contentStyle={{ borderRadius: 8, border: '1px solid rgb(203,213,225)', fontSize: 13 }}
                  cursor={{ fill: 'rgb(241,245,249)' }}
                />
                <Bar dataKey="income" name="Earning" fill="rgb(96,165,250)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="expense" name="Spending" fill="rgb(29,78,216)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card">
          <p className="pie-title">Spending Distribution</p>
          <p className="pie-subtitle">Categories</p>

          {!summary.categoryBreakdown?.length ? (
            <p className="chart-loading">No expenses yet.</p>
          ) : (
            <div className="pie-wrapper">
              <div className="pie-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      outerRadius={105}
                      stroke="rgb(30,41,59)"
                      strokeWidth={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [formatRupee(val), 'Spent']}
                      contentStyle={{ borderRadius: 8, border: '1px solid rgb(203,213,225)', fontSize: 12 }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={9}
                      wrapperStyle={{ fontSize: 12, paddingTop: 14 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
