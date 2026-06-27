import React, { useState } from 'react';

export default function LeaveForm({ onSubmissionSuccess, showNotification, drivers, loadingDrivers, leaves }) {
  // Form State
  const [selectedDriver, setSelectedDriver] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('Personal Leave');
  const [adminNotes, setAdminNotes] = useState('');
  
  // Validation Errors State
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Form Validation Logic
  const validateForm = () => {
    const tempErrors = {};
    if (!selectedDriver) tempErrors.Drivers = 'Please select a driver from the register.';
    
    if (!startDate) {
      tempErrors.planned = 'Planned start date and time is required.';
    }
    
    if (!endDate) {
      tempErrors.leaves = 'Planned end date and time is required.';
    } else if (startDate && new Date(startDate) >= new Date(endDate)) {
      tempErrors.leaves = 'Planned end date must be after planned start date.';
    }

    // Client-side date overlap validation check
    if (selectedDriver && startDate && endDate) {
      const newStart = new Date(startDate).toISOString();
      const newEnd = new Date(endDate).toISOString();
      
      const hasOverlap = leaves && leaves.some(l => {
        if (l.Drivers !== selectedDriver) return false;
        if (l.status.toLowerCase() !== 'pending' && l.status.toLowerCase() !== 'approved') return false;
        
        return newStart < l.leaves && newEnd > l.planned;
      });
      
      if (hasOverlap) {
        tempErrors.leaves = 'Scheduling Conflict: This driver already has a Pending or Approved leave log during the selected dates.';
      }
    }
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const payload = {
      Drivers: selectedDriver,
      planned: new Date(startDate).toISOString(),
      leaves: new Date(endDate).toISOString(),
      unavailability: reason,
      admin: adminNotes
    };

    try {
      const response = await fetch('http://localhost:5000/api/driver_leave_availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.success) {
        showNotification('success', `Leave request logged successfully for ${selectedDriver}!`);
        // Reset form inputs
        setSelectedDriver('');
        setStartDate('');
        setEndDate('');
        setReason('Personal Leave');
        setAdminNotes('');
        setErrors({});
        
        // Refresh sibling dashboard data
        onSubmissionSuccess();
      } else {
        showNotification('error', data.message || 'Error logging leave request.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      showNotification('error', 'Network error. Failed to post data to backend.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="card-title">Driver Leave & Availability Entry Form</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Driver Selection */}
          <div className="form-group">
            <label htmlFor="driver-select">Driver Name</label>
            <select
              id="driver-select"
              className="form-control"
              value={selectedDriver}
              onChange={(e) => {
                setSelectedDriver(e.target.value);
                if (errors.Drivers) setErrors({ ...errors, Drivers: null });
              }}
              disabled={loadingDrivers}
            >
              <option value="">-- Select Registered Driver --</option>
              {drivers.filter(d => d.status === 'Active').map(d => (
                <option key={d.id} value={d.Drivers}>
                  {d.Drivers} ({d.leaves || 'No Pref'})
                </option>
              ))}
            </select>
            {errors.Drivers && <span className="error-msg">{errors.Drivers}</span>}
          </div>

          {/* Unavailability Reason */}
          <div className="form-group">
            <label htmlFor="reason-select">Unavailability Reason</label>
            <select
              id="reason-select"
              className="form-control"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="Personal Leave">Personal Leave</option>
              <option value="Medical Leave">Medical Leave</option>
              <option value="Vacation">Vacation</option>
              <option value="Vehicle Maintenance">Vehicle Maintenance</option>
              <option value="Other">Other / Unscheduled</option>
            </select>
          </div>

          {/* Planned Start Date */}
          <div className="form-group">
            <label htmlFor="start-date">Planned Start Date & Time</label>
            <input
              id="start-date"
              type="datetime-local"
              className="form-control"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (errors.planned) setErrors({ ...errors, planned: null });
              }}
            />
            {errors.planned && <span className="error-msg">{errors.planned}</span>}
          </div>

          {/* Planned End Date */}
          <div className="form-group">
            <label htmlFor="end-date">Planned End Date & Time</label>
            <input
              id="end-date"
              type="datetime-local"
              className="form-control"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (errors.leaves) setErrors({ ...errors, leaves: null });
              }}
            />
            {errors.leaves && <span className="error-msg">{errors.leaves}</span>}
          </div>

          {/* Admin Notes */}
          <div className="form-group form-grid-full">
            <label htmlFor="admin-notes">Admin Notes / Reviewer Comments</label>
            <textarea
              id="admin-notes"
              className="form-control"
              placeholder="Enter dispatcher notes, backup coverage details, or approval remarks..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || loadingDrivers}
          >
            {submitting ? (
              <>
                <span className="submit-spinner"></span>
                Logging Leave...
              </>
            ) : 'Log Driver Absence'}
          </button>
        </div>
      </form>
    </div>
  );
}
