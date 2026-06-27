import React, { useState, useEffect } from 'react';
import LeaveForm from './components/LeaveForm';
import Dashboard from './components/Dashboard';
import DriverManagement from './components/DriverManagement';

export default function App() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  
  // Tab switcher state: 'calendar' or 'drivers'
  const [activeTab, setActiveTab] = useState('calendar');

  // Notification Toast state
  const [notification, setNotification] = useState(null);

  // Helper to trigger toast notifications
  const showNotification = (type, message) => {
    setNotification({ type, message });
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Fetch all logged leaves
  const fetchLeaves = () => {
    setLoading(true);
    fetch('http://localhost:5000/api/driver_leave_availability')
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setLeaves(resData.data);
          setError(false);
        } else {
          setError(true);
          showNotification('error', resData.message || 'Failed to sync leaves.');
        }
      })
      .catch(err => {
        console.error('Error fetching leaves:', err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Fetch registered drivers list
  const fetchDrivers = () => {
    setLoadingDrivers(true);
    fetch('http://localhost:5000/api/staff_members')
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setDrivers(resData.data);
        } else {
          showNotification('error', resData.message || 'Failed to fetch driver profiles.');
        }
      })
      .catch(err => {
        console.error('Error loading drivers:', err);
        showNotification('error', 'Unable to connect to the backend server API.');
      })
      .finally(() => {
        setLoadingDrivers(false);
      });
  };

  // Fetch data on initial mount
  useEffect(() => {
    fetchLeaves();
    fetchDrivers();
  }, []);

  // Compute metrics for the Project Review / Dashboard KPI cards
  const now = new Date();
  
  // 1. Total Drivers count (both Active and Inactive)
  const totalDriversCount = drivers.length;

  // 2. Active drivers count (only 'Active' status)
  const activeDriversCount = drivers.filter(d => d.status === 'Active').length;

  // 3. Drivers On Leave: Approved requests where today's date falls in the [planned, leaves] range
  const driversOnLeaveCount = leaves.filter(l => {
    if (l.status.toLowerCase() !== 'approved') return false;
    const start = new Date(l.planned);
    const end = new Date(l.leaves);
    return start <= now && end >= now;
  }).length;

  // 4. Pending Requests count
  const pendingCount = leaves.filter(l => l.status.toLowerCase() === 'pending').length;

  // 5. Approved Requests count (all-time)
  const approvedCount = leaves.filter(l => l.status.toLowerCase() === 'approved').length;

  // 6. Rejected Requests count (all-time)
  const rejectedCount = leaves.filter(l => l.status.toLowerCase() === 'rejected').length;

  // 7. Total Leaves Logged (excluding Cancelled)
  const totalLeavesCount = leaves.filter(l => l.status.toLowerCase() !== 'cancelled').length;

  // 8. Driver Availability Rate
  const availabilityRate = activeDriversCount > 0 
    ? Math.round(((activeDriversCount - driversOnLeaveCount) / activeDriversCount) * 100) 
    : 100;

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span style={{ fontSize: '1.2rem' }}>
            {notification.type === 'success' ? '✓' : '⚠️'}
          </span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Section */}
      <header className="header">
        <div className="header-left">
          <div className="logo">🚗 Manivtha Tours & Travels</div>
          <h1>Driver Leave & Availability Tracker</h1>
        </div>
        <div className="header-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.8rem' }}>
          <span className="badge-review">Academic Project Review</span>
          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              📅 Leave Calendar
            </button>
            <button
              className={`nav-tab ${activeTab === 'drivers' ? 'active' : ''}`}
              onClick={() => setActiveTab('drivers')}
            >
              👥 Manage Drivers
            </button>
          </div>
        </div>
      </header>

      {/* Summary KPI Cards Section */}
      <section className="summary-cards">
        <div className="summary-card">
          <span className="summary-card-title">Total Drivers</span>
          <span className="summary-card-value">{loadingDrivers ? '...' : totalDriversCount}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Active Drivers</span>
          <span className="summary-card-value">{loadingDrivers ? '...' : activeDriversCount}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Drivers On Leave</span>
          <span className="summary-card-value">{loading ? '...' : driversOnLeaveCount}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Pending Requests</span>
          <span className="summary-card-value">{loading ? '...' : pendingCount}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Approved Requests</span>
          <span className="summary-card-value">{loading ? '...' : approvedCount}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Rejected Requests</span>
          <span className="summary-card-value">{loading ? '...' : rejectedCount}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Total Leaves Logged</span>
          <span className="summary-card-value">{loading ? '...' : totalLeavesCount}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Driver Availability</span>
          <span className="summary-card-value">{loading || loadingDrivers ? '...' : `${availabilityRate}%`}</span>
        </div>
      </section>

      {/* Conditional rendering depending on tab switcher */}
      {activeTab === 'calendar' ? (
        <main className="dashboard-grid">
          {/* Leave request form at the top */}
          <LeaveForm 
            onSubmissionSuccess={fetchLeaves} 
            showNotification={showNotification}
            drivers={drivers}
            loadingDrivers={loadingDrivers}
            leaves={leaves}
          />

          {/* Dashboard entries listing below */}
          <Dashboard 
            leaves={leaves} 
            loading={loading} 
            error={error} 
            onApprovalChange={fetchLeaves}
            drivers={drivers}
          />
        </main>
      ) : (
        <main>
          <DriverManagement
            drivers={drivers}
            loadingDrivers={loadingDrivers}
            fetchDrivers={fetchDrivers}
            showNotification={showNotification}
          />
        </main>
      )}
    </div>
  );
}
