import React, { useState } from 'react';

export default function DriverManagement({ drivers, loadingDrivers, fetchDrivers, showNotification }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add Driver Form State
  const [addName, setAddName] = useState('');
  const [addLicense, setAddLicense] = useState('');
  const [addVehicle, setAddVehicle] = useState('');
  const [addStatus, setAddStatus] = useState('Active');
  const [adding, setAdding] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Edit Modal State
  const [editingDriver, setEditingDriver] = useState(null); // stores driver object when editing
  const [editName, setEditName] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [saving, setSaving] = useState(false);
  const [editErrors, setEditErrors] = useState({});

  // Delete Modal State
  const [deletingDriver, setDeletingDriver] = useState(null); // stores driver object when deleting
  const [deleting, setDeleting] = useState(false);

  // Filter drivers based on search term
  const filteredDrivers = drivers.filter(d => 
    d.Drivers.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.planned && d.planned.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.leaves && d.leaves.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Validate Add Form
  const validateAddForm = () => {
    const errs = {};
    if (!addName.trim()) {
      errs.name = 'Driver name is required.';
    } else if (drivers.some(d => d.Drivers.toLowerCase() === addName.trim().toLowerCase())) {
      errs.name = 'A driver with this name is already registered.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Validate Edit Form
  const validateEditForm = () => {
    const errs = {};
    if (!editName.trim()) {
      errs.name = 'Driver name is required.';
    } else if (
      drivers.some(
        d => d.id !== editingDriver.id && d.Drivers.toLowerCase() === editName.trim().toLowerCase()
      )
    ) {
      errs.name = 'Another driver is already registered with this name.';
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Add Driver
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateAddForm()) return;

    setAdding(true);
    const payload = {
      Drivers: addName.trim(),
      planned: addLicense.trim(),
      leaves: addVehicle.trim(),
      status: addStatus
    };

    try {
      const res = await fetch('http://localhost:5000/api/staff_members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showNotification('success', `Driver '${payload.Drivers}' registered successfully.`);
        // Reset form
        setAddName('');
        setAddLicense('');
        setAddVehicle('');
        setAddStatus('Active');
        setFormErrors({});
        fetchDrivers(); // Refresh parent driver list
      } else {
        showNotification('error', data.message || 'Failed to register driver.');
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Network error. Failed to add driver.');
    } finally {
      setAdding(false);
    }
  };

  // Handle Open Edit Modal
  const openEditModal = (driver) => {
    setEditingDriver(driver);
    setEditName(driver.Drivers);
    setEditLicense(driver.planned || '');
    setEditVehicle(driver.leaves || '');
    setEditStatus(driver.status || 'Active');
    setEditErrors({});
  };

  // Handle Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    setSaving(true);
    const payload = {
      Drivers: editName.trim(),
      planned: editLicense.trim(),
      leaves: editVehicle.trim(),
      status: editStatus
    };

    try {
      const res = await fetch(`http://localhost:5000/api/staff_members/${editingDriver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showNotification('success', `Driver details updated for '${payload.Drivers}'.`);
        setEditingDriver(null);
        fetchDrivers();
      } else {
        showNotification('error', data.message || 'Failed to update driver details.');
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Network error. Failed to save edits.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Driver
  const handleDeleteConfirm = async () => {
    if (!deletingDriver) return;
    setDeleting(true);

    try {
      const res = await fetch(`http://localhost:5000/api/staff_members/${deletingDriver.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        if (data.softDeleted) {
          showNotification('success', `Driver set to Inactive (leave history preserved).`);
        } else {
          showNotification('success', `Driver profile removed successfully.`);
        }
        setDeletingDriver(null);
        fetchDrivers();
      } else {
        showNotification('error', data.message || 'Failed to delete driver.');
      }
    } catch (err) {
      console.error(err);
      showNotification('error', 'Network error. Failed to execute delete.');
    } finally {
      setDeleting(false);
    }
  };

  // CSV Export for Driver Records
  const handleExportCSV = () => {
    try {
      let csvContent = 'ID,Driver Name,License Number (DL),Vehicle Preference,Status\n';
      drivers.forEach(d => {
        const escapeCSV = (val) => {
          if (val === null || val === undefined) return '';
          let str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        };
        csvContent += `${d.id},${escapeCSV(d.Drivers)},${escapeCSV(d.planned)},${escapeCSV(d.leaves)},${escapeCSV(d.status)}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `driver_records_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('success', 'Driver registry exported to CSV successfully.');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to export CSV file.');
    }
  };

  return (
    <div className="driver-management-container" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
      
      {/* Upper Grid Layout: Form and Table side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: Add Driver Card */}
        <div className="glass-card">
          <h2 className="card-title">Register New Driver</h2>
          <form onSubmit={handleAddSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="add-name">Driver Name *</label>
                <input
                  id="add-name"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Spoorthi Valluri"
                  value={addName}
                  onChange={(e) => {
                    setAddName(e.target.value);
                    if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                  }}
                  required
                />
                {formErrors.name && <span className="error-msg">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="add-license">License Number (DL)</label>
                <input
                  id="add-license"
                  type="text"
                  className="form-control"
                  placeholder="e.g. DL-112202634"
                  value={addLicense}
                  onChange={(e) => setAddLicense(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-vehicle">Vehicle Type Preference</label>
                <input
                  id="add-vehicle"
                  type="text"
                  className="form-control"
                  placeholder="e.g. SUV, Sedan, Mini Bus"
                  value={addVehicle}
                  onChange={(e) => setAddVehicle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-status">Initial Status</label>
                <select
                  id="add-status"
                  className="form-control"
                  value={addStatus}
                  onChange={(e) => setAddStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={adding}
              >
                {adding ? (
                  <>
                    <span className="submit-spinner"></span>
                    Registering...
                  </>
                ) : 'Register Driver'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Driver Table Card */}
        <div className="glass-card">
          <div className="table-header">
            <h2 className="card-title" style={{ margin: 0 }}>Driver Registry</h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="text"
                className="form-control search-box"
                placeholder="Search by name, DL, vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button 
                type="button"
                className="btn btn-secondary btn-export" 
                onClick={handleExportCSV}
                title="Export Registry to CSV"
                style={{
                  padding: '0.8rem 1.25rem',
                  fontSize: '0.9rem',
                  background: '#f1f5f9',
                  color: 'var(--text-muted)',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                📥 Export CSV
              </button>
            </div>
          </div>

          {loadingDrivers ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Syncing staff members with database...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <p>{searchTerm ? 'No search results match your criteria.' : 'No drivers registered in the database system.'}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Driver Name</th>
                    <th>License Number</th>
                    <th>Vehicle Preference</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((d) => (
                    <tr key={d.id}>
                      <td className="driver-name">{d.Drivers}</td>
                      <td className="date-mono">{d.planned || '—'}</td>
                      <td>{d.leaves || '—'}</td>
                      <td>
                        <span className={`status-badge ${d.status.toLowerCase() === 'active' ? 'approved' : 'rejected'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn"
                            style={{
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.8rem',
                              background: '#eff6ff',
                              color: 'var(--primary-blue)',
                              border: '1px solid #bfdbfe'
                            }}
                            onClick={() => openEditModal(d)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn"
                            style={{
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.8rem',
                              background: '#fef2f2',
                              color: 'var(--color-danger)',
                              border: '1px solid #fca5a5'
                            }}
                            onClick={() => setDeletingDriver(d)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Driver Modal Overlay */}
      {editingDriver && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card">
            <h2 className="card-title">Edit Driver Profile</h2>
            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label htmlFor="edit-name">Driver Name *</label>
                  <input
                    id="edit-name"
                    type="text"
                    className="form-control"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      if (editErrors.name) setEditErrors({ ...editErrors, name: null });
                    }}
                    required
                  />
                  {editErrors.name && <span className="error-msg">{editErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="edit-license">License Number (DL)</label>
                  <input
                    id="edit-license"
                    type="text"
                    className="form-control"
                    value={editLicense}
                    onChange={(e) => setEditLicense(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-vehicle">Vehicle Type Preference</label>
                  <input
                    id="edit-vehicle"
                    type="text"
                    className="form-control"
                    value={editVehicle}
                    onChange={(e) => setEditVehicle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-status">Status</label>
                  <select
                    id="edit-status"
                    className="form-control"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ background: '#f1f5f9', color: 'var(--text-muted)' }}
                    onClick={() => setEditingDriver(null)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {deletingDriver && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card" style={{ maxWidth: '480px' }}>
            <h2 className="card-title" style={{ borderLeftColor: 'var(--color-danger)' }}>Confirm Removal</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                Are you sure you want to remove <strong>{deletingDriver.Drivers}</strong> from the database?
              </p>
              
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                color: '#b45309'
              }}>
                <strong>Business Rule Warning:</strong> If this driver has existing leave requests or scheduled availability history, their record cannot be fully deleted. Instead, their status will automatically be set to <strong>Inactive</strong> to preserve history.
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#f1f5f9', color: 'var(--text-muted)' }}
                  onClick={() => setDeletingDriver(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'var(--color-danger)', color: '#ffffff' }}
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? 'Removing...' : 'Confirm Deletion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
