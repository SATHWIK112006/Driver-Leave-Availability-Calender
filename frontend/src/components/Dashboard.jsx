import React, { useState } from 'react';

export default function Dashboard({ leaves, loading, error, onApprovalChange, drivers }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [editingLeave, setEditingLeave] = useState(null);
  const [editDriver, setEditDriver] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editReason, setEditReason] = useState('Personal Leave');
  const [editAdmin, setEditAdmin] = useState('');
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Cancel/Delete Modal State
  const [deletingLeave, setDeletingLeave] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Format datetime into readable string
  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  // Filter leaves based on search query
  const filteredLeaves = leaves.filter(l => 
    l.Drivers.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.unavailability.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Approve leave handler
  const handleApprove = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/driver_leave_availability/${id}/approve`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.success) {
        if (onApprovalChange) onApprovalChange();
      } else {
        alert(data.message || 'Failed to approve request.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to approve request.');
    }
  };

  // Reject leave handler
  const handleReject = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/driver_leave_availability/${id}/reject`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.success) {
        if (onApprovalChange) onApprovalChange();
      } else {
        alert(data.message || 'Failed to reject request.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to reject request.');
    }
  };

  // CSV Export for Leave Records
  const handleExportCSV = () => {
    try {
      let csvContent = 'ID,Driver Name,Planned Start,Planned End,Status,Unavailability Reason,Admin Notes\n';
      filteredLeaves.forEach(l => {
        const escapeCSV = (val) => {
          if (val === null || val === undefined) return '';
          let str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
          }
          return str;
        };
        csvContent += `${l.id},${escapeCSV(l.Drivers)},${escapeCSV(l.planned)},${escapeCSV(l.leaves)},${escapeCSV(l.status)},${escapeCSV(l.unavailability)},${escapeCSV(l.admin)}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `leave_records_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Failed to export CSV file.');
    }
  };

  // Open Edit Modal
  const openEditModal = (leave) => {
    setEditingLeave(leave);
    setEditDriver(leave.Drivers);
    try {
      // Helper to format ISO datetime to local datetime-local input value format (accounting for timezone offset)
      const dateStart = new Date(leave.planned);
      const tzOffsetStart = dateStart.getTimezoneOffset() * 60000;
      const localISOMinutesStart = new Date(dateStart.getTime() - tzOffsetStart).toISOString().slice(0, 16);
      
      const dateEnd = new Date(leave.leaves);
      const tzOffsetEnd = dateEnd.getTimezoneOffset() * 60000;
      const localISOMinutesEnd = new Date(dateEnd.getTime() - tzOffsetEnd).toISOString().slice(0, 16);

      setEditStart(localISOMinutesStart);
      setEditEnd(localISOMinutesEnd);
    } catch (e) {
      setEditStart('');
      setEditEnd('');
    }
    setEditReason(leave.unavailability || 'Personal Leave');
    setEditAdmin(leave.admin || '');
    setEditErrors({});
  };

  // Validate Edit Form
  const validateEditForm = () => {
    const errs = {};
    if (!editDriver) errs.Drivers = 'Driver name is required.';
    if (!editStart) {
      errs.planned = 'Planned start date and time is required.';
    }
    if (!editEnd) {
      errs.leaves = 'Planned end date and time is required.';
    } else if (editStart && new Date(editStart) >= new Date(editEnd)) {
      errs.leaves = 'Planned end date must be after planned start date.';
    }

    // Overlap validation
    if (editDriver && editStart && editEnd) {
      const newStart = new Date(editStart).toISOString();
      const newEnd = new Date(editEnd).toISOString();
      
      const hasOverlap = leaves && leaves.some(l => {
        if (l.id === editingLeave.id) return false;
        if (l.Drivers !== editDriver) return false;
        if (l.status.toLowerCase() !== 'pending' && l.status.toLowerCase() !== 'approved') return false;
        
        return newStart < l.leaves && newEnd > l.planned;
      });
      
      if (hasOverlap) {
        errs.leaves = 'Scheduling Conflict: This driver already has a Pending or Approved leave log during the selected dates.';
      }
    }

    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save Edit Handler
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    setSaving(true);
    const payload = {
      Drivers: editDriver,
      planned: new Date(editStart).toISOString(),
      leaves: new Date(editEnd).toISOString(),
      unavailability: editReason,
      admin: editAdmin,
      status: 'Pending' // Reset to Pending upon edit
    };

    try {
      const res = await fetch(`http://localhost:5000/api/driver_leave_availability/${editingLeave.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setEditingLeave(null);
        if (onApprovalChange) onApprovalChange();
      } else {
        alert(data.message || 'Failed to save changes.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Delete/Cancel Handler
  const handleDeleteConfirm = async () => {
    if (!deletingLeave) return;
    setDeleting(true);

    try {
      const res = await fetch(`http://localhost:5000/api/driver_leave_availability/${deletingLeave.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setDeletingLeave(null);
        if (onApprovalChange) onApprovalChange();
      } else {
        alert(data.message || 'Failed to cancel request.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to cancel request.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="table-header">
        <h2 className="card-title" style={{ margin: 0 }}>Driver Leave & Availability Dashboard</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            className="form-control search-box"
            placeholder="Search by driver or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            type="button"
            className="btn btn-secondary btn-export" 
            onClick={handleExportCSV}
            title="Export Leaves to CSV"
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

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Syncing data registry with SQLite database...</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <p>Connection Error: Failed to sync logs.</p>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <p>{searchTerm ? 'No search results match your criteria.' : 'No driver leave records found in the system registry.'}</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>Planned Start</th>
                <th>Planned End</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Notes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((l) => (
                <tr key={l.id}>
                  <td className="driver-name">{l.Drivers}</td>
                  <td className="date-mono">{formatDateTime(l.planned)}</td>
                  <td className="date-mono">{formatDateTime(l.leaves)}</td>
                  <td>{l.unavailability}</td>
                  <td>
                    <span className={`status-badge ${l.status.toLowerCase()}`}>
                      {l.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {l.admin || '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {l.status.toLowerCase() === 'pending' && (
                        <>
                          <button
                            className="btn"
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.75rem',
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '700'
                            }}
                            onClick={() => handleApprove(l.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn"
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.75rem',
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fca5a5',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '700'
                            }}
                            onClick={() => handleReject(l.id)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {l.status.toLowerCase() !== 'cancelled' && (
                        <>
                          <button
                            className="btn"
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.75rem',
                              background: '#eff6ff',
                              color: 'var(--primary-blue)',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '700'
                            }}
                            onClick={() => openEditModal(l)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn"
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.75rem',
                              background: '#fef2f2',
                              color: 'var(--color-danger)',
                              border: '1px solid #fca5a5',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '700'
                            }}
                            onClick={() => setDeletingLeave(l)}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Leave Modal Overlay */}
      {editingLeave && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card" style={{ maxWidth: '600px' }}>
            <h2 className="card-title">Edit Leave Record</h2>
            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Driver Selection */}
                <div className="form-group">
                  <label htmlFor="edit-leave-driver">Driver Name *</label>
                  <select
                    id="edit-leave-driver"
                    className="form-control"
                    value={editDriver}
                    onChange={(e) => {
                      setEditDriver(e.target.value);
                      if (editErrors.Drivers) setEditErrors({ ...editErrors, Drivers: null });
                    }}
                    required
                  >
                    <option value="">-- Select Registered Driver --</option>
                    {drivers && drivers.filter(d => d.status === 'Active' || d.Drivers === editingLeave.Drivers).map(d => (
                      <option key={d.id} value={d.Drivers}>
                        {d.Drivers} ({d.leaves || 'No Pref'})
                      </option>
                    ))}
                  </select>
                  {editErrors.Drivers && <span className="error-msg">{editErrors.Drivers}</span>}
                </div>

                {/* Date Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="edit-leave-start">Start Date & Time *</label>
                    <input
                      id="edit-leave-start"
                      type="datetime-local"
                      className="form-control"
                      value={editStart}
                      onChange={(e) => {
                        setEditStart(e.target.value);
                        if (editErrors.planned) setEditErrors({ ...editErrors, planned: null });
                      }}
                      required
                    />
                    {editErrors.planned && <span className="error-msg">{editErrors.planned}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-leave-end">End Date & Time *</label>
                    <input
                      id="edit-leave-end"
                      type="datetime-local"
                      className="form-control"
                      value={editEnd}
                      onChange={(e) => {
                        setEditEnd(e.target.value);
                        if (editErrors.leaves) setEditErrors({ ...editErrors, leaves: null });
                      }}
                      required
                    />
                    {editErrors.leaves && <span className="error-msg">{editErrors.leaves}</span>}
                  </div>
                </div>

                {/* Reason Selection */}
                <div className="form-group">
                  <label htmlFor="edit-leave-reason">Unavailability Reason</label>
                  <select
                    id="edit-leave-reason"
                    className="form-control"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                  >
                    <option value="Personal Leave">Personal Leave</option>
                    <option value="Medical Leave">Medical Leave</option>
                    <option value="Vacation">Vacation</option>
                    <option value="Vehicle Maintenance">Vehicle Maintenance</option>
                    <option value="Other">Other / Unscheduled</option>
                  </select>
                </div>

                {/* Admin Notes */}
                <div className="form-group">
                  <label htmlFor="edit-leave-admin">Admin Notes / Reviewer Comments</label>
                  <textarea
                    id="edit-leave-admin"
                    className="form-control"
                    placeholder="Enter dispatcher notes..."
                    value={editAdmin}
                    onChange={(e) => setEditAdmin(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ background: '#f1f5f9', color: 'var(--text-muted)' }}
                    onClick={() => setEditingLeave(null)}
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

      {/* Cancel Confirmation Modal Overlay */}
      {deletingLeave && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card" style={{ maxWidth: '480px' }}>
            <h2 className="card-title" style={{ borderLeftColor: 'var(--color-danger)' }}>Cancel Leave Request</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                Are you sure you want to cancel the leave request logged for <strong>{deletingLeave.Drivers}</strong>?
              </p>
              
              <div style={{
                background: '#f1f5f9',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                color: 'var(--text-muted)'
              }}>
                <strong>Soft Deletion:</strong> This action will update the status of this leave log to <strong>Cancelled</strong>. The historical record will be preserved for review.
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#f1f5f9', color: 'var(--text-muted)' }}
                  onClick={() => setDeletingLeave(null)}
                  disabled={deleting}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'var(--color-danger)', color: '#ffffff' }}
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
