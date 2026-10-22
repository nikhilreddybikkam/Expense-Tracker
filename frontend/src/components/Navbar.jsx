import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="navbar">

      {/* Brand */}
      <span className="navbar-brand">Expense Tracker</span>

      {/* Today's Date in Middle */}
      <div className="navbar-date">
        
         <span >{todayStr}</span>
      </div>

      {/* Nav Links */}
      <nav className="navbar-nav">
        <NavLink to="/" end className="nav-link">
          Dashboard
        </NavLink>

        <NavLink to="/add" className="nav-link">
          Add Transaction
        </NavLink>

        <NavLink to="/history" className="nav-link">
          History
        </NavLink>
      </nav>

    </header>
  );
}
