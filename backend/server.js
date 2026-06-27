const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { queryAll, queryGet, queryRun } = require('./db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing middlewares
app.use(cors());
app.use(express.json());

// Catch and handle malformed JSON bodies gracefully
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('JSON Syntax Error captured:', err.message);
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON format in request body.'
        });
    }
    next();
});

// ----------------------------------------------------
// 1. GET /api/health
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: "ok",
            project: "Driver Leave & Availability Calendar Backend",
            timestamp: new Date().toISOString()
        }
    });
});

// Helper to escape CSV values
function escapeCSV(val) {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// ----------------------------------------------------
// Export Endpoints (Placed before parameterized routes to avoid conflicts)
// ----------------------------------------------------
app.get('/api/driver_leave_availability/export', async (req, res) => {
    try {
        const sql = 'SELECT id, Drivers, planned, leaves, status, unavailability, admin FROM driver_leave_availability ORDER BY created_at DESC';
        const leaves = await queryAll(sql);
        
        let csv = 'ID,Driver Name,Planned Start,Planned End,Status,Unavailability Reason,Admin Notes\n';
        leaves.forEach(l => {
            csv += `${l.id},${escapeCSV(l.Drivers)},${escapeCSV(l.planned)},${escapeCSV(l.leaves)},${escapeCSV(l.status)},${escapeCSV(l.unavailability)},${escapeCSV(l.admin)}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=leave_records.csv');
        return res.status(200).send(csv);
    } catch (err) {
        console.error('Error exporting leaves:', err.message);
        res.status(500).json({ success: false, message: 'Failed to export leave records.' });
    }
});

app.get('/api/staff_members/export', async (req, res) => {
    try {
        const sql = 'SELECT id, Drivers, planned, leaves, status FROM staff_members ORDER BY Drivers ASC';
        const staff = await queryAll(sql);
        
        let csv = 'ID,Driver Name,License Number (DL),Vehicle Preference,Status\n';
        staff.forEach(s => {
            csv += `${s.id},${escapeCSV(s.Drivers)},${escapeCSV(s.planned)},${escapeCSV(s.leaves)},${escapeCSV(s.status)}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=driver_records.csv');
        return res.status(200).send(csv);
    } catch (err) {
        console.error('Error exporting staff members:', err.message);
        res.status(500).json({ success: false, message: 'Failed to export driver records.' });
    }
});

// ----------------------------------------------------
// 2. GET /api/staff_members
// ----------------------------------------------------
app.get('/api/staff_members', async (req, res) => {
    try {
        const sql = 'SELECT id, Drivers, planned, leaves, status FROM staff_members ORDER BY Drivers ASC';
        const drivers = await queryAll(sql);
        res.status(200).json({
            success: true,
            data: drivers
        });
    } catch (err) {
        console.error('Error fetching staff members:', err.message);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve driver registry from database.'
        });
    }
});

// ----------------------------------------------------
// 2b. POST /api/staff_members
// ----------------------------------------------------
app.post('/api/staff_members', async (req, res) => {
    const { Drivers, planned, leaves, status } = req.body;
    if (!Drivers || !Drivers.trim()) {
        return res.status(400).json({ success: false, message: 'Driver field is required.' });
    }
    try {
        const existing = await queryGet('SELECT id FROM staff_members WHERE Drivers = ?', [Drivers.trim()]);
        if (existing) {
            return res.status(400).json({ success: false, message: `Driver '${Drivers}' is already registered.` });
        }
        
        const sql = `
            INSERT INTO staff_members (Drivers, planned, leaves, status)
            VALUES (?, ?, ?, ?)
        `;
        const params = [Drivers.trim(), planned || '', leaves || '', status || 'Active'];
        const result = await queryRun(sql, params);
        
        // Log "Driver Created" in audit logs
        await queryRun(
            `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, 'Driver Created', ?, 'Info')`,
            [Drivers.trim(), `Driver profile created with license: ${planned || 'None'} and vehicle: ${leaves || 'None'}.`]
        );

        res.status(201).json({
            success: true,
            data: {
                id: result.id,
                Drivers: Drivers.trim(),
                planned: planned || '',
                leaves: leaves || '',
                status: status || 'Active'
            }
        });
    } catch (err) {
        console.error('Error creating staff member:', err.message);
        res.status(500).json({
            success: false,
            message: 'Failed to register the new driver profile.'
        });
    }
});

// ----------------------------------------------------
// 2c. PUT /api/staff_members/:id
// ----------------------------------------------------
app.put('/api/staff_members/:id', async (req, res) => {
    const { id } = req.params;
    const { Drivers, planned, leaves, status } = req.body;
    
    if (!Drivers || !Drivers.trim()) {
        return res.status(400).json({ success: false, message: 'Driver name is required.' });
    }
    
    try {
        const existingDriver = await queryGet('SELECT id, Drivers, status FROM staff_members WHERE id = ?', [id]);
        if (!existingDriver) {
            return res.status(404).json({ success: false, message: 'Driver not found.' });
        }

        const duplicate = await queryGet('SELECT id FROM staff_members WHERE Drivers = ? AND id != ?', [Drivers.trim(), id]);
        if (duplicate) {
            return res.status(400).json({ success: false, message: `Another driver is already registered with the name '${Drivers}'.` });
        }

        const sql = `
            UPDATE staff_members
            SET Drivers = ?, planned = ?, leaves = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        const params = [Drivers.trim(), planned || '', leaves || '', status || 'Active', id];
        await queryRun(sql, params);
        
        // Audit log entries for Driver updated / de-activated
        const statusChanged = existingDriver.status !== status;
        let logAction = 'Driver Updated';
        let logDetails = `Driver profile updated. Name: ${Drivers.trim()}, License: ${planned || 'None'}, Vehicle: ${leaves || 'None'}, Status: ${status || 'Active'}.`;
        
        if (statusChanged) {
            if (status === 'Inactive') {
                logAction = 'Driver Deactivated';
                logDetails = `Driver '${Drivers.trim()}' status set to Inactive.`;
            } else if (status === 'Active') {
                logAction = 'Driver Activated';
                logDetails = `Driver '${Drivers.trim()}' status set to Active.`;
            }
        }

        await queryRun(
            `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, ?, ?, 'Info')`,
            [Drivers.trim(), logAction, logDetails]
        );

        res.status(200).json({
            success: true,
            data: {
                id: parseInt(id),
                Drivers: Drivers.trim(),
                planned: planned || '',
                leaves: leaves || '',
                status: status || 'Active'
            }
        });
    } catch (err) {
        console.error('Error updating staff member:', err.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update the driver profile.'
        });
    }
});

// ----------------------------------------------------
// 2d. GET /api/staff_members/:id
// ----------------------------------------------------
app.get('/api/staff_members/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const sql = 'SELECT id, Drivers, planned, leaves, status FROM staff_members WHERE id = ?';
        const driver = await queryGet(sql, [id]);
        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver profile not found.'
            });
        }
        res.status(200).json({
            success: true,
            data: driver
        });
    } catch (err) {
        console.error('Error fetching staff member:', err.message);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve driver profile.'
        });
    }
});

// ----------------------------------------------------
// 2e. DELETE /api/staff_members/:id
// ----------------------------------------------------
app.delete('/api/staff_members/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const driver = await queryGet('SELECT Drivers, status FROM staff_members WHERE id = ?', [id]);
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found.' });
        }

        // Check if there is leave history in driver_leave_availability
        const leavesCheck = await queryGet(
            'SELECT COUNT(*) AS count FROM driver_leave_availability WHERE Drivers = ?',
            [driver.Drivers]
        );

        if (leavesCheck.count > 0) {
            // Soft delete: set status to Inactive
            const sql = 'UPDATE staff_members SET status = "Inactive", updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            await queryRun(sql, [id]);

            // Audit log: Driver deactivated (on delete)
            await queryRun(
                `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, 'Driver Deactivated', ?, 'Info')`,
                [driver.Drivers, `Driver deactivated on delete request due to existing leave records.`]
            );

            return res.status(200).json({
                success: true,
                softDeleted: true,
                message: `Driver '${driver.Drivers}' has active or past leave records. Status set to 'Inactive' instead of permanent deletion.`
            });
        } else {
            // Hard delete: remove from staff_members
            const sql = 'DELETE FROM staff_members WHERE id = ?';
            await queryRun(sql, [id]);

            // Audit log: Driver deleted
            await queryRun(
                `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, 'Driver Deleted', ?, 'Info')`,
                [driver.Drivers, `Driver profile permanently deleted.`]
            );

            return res.status(200).json({
                success: true,
                softDeleted: false,
                message: `Driver '${driver.Drivers}' profile deleted successfully.`
            });
        }
    } catch (err) {
        console.error('Error deleting staff member:', err.message);
        res.status(500).json({
            success: false,
            message: 'Failed to process delete request for driver.'
        });
    }
});

// ----------------------------------------------------
// 3. GET /api/driver_leave_availability
// ----------------------------------------------------
app.get('/api/driver_leave_availability', async (req, res) => {
    try {
        const sql = 'SELECT id, Drivers, planned, leaves, status, unavailability, admin FROM driver_leave_availability ORDER BY created_at DESC';
        const leaves = await queryAll(sql);
        res.status(200).json({
            success: true,
            data: leaves
        });
    } catch (err) {
        console.error('Error fetching leaves:', err.message);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve leave records from database.'
        });
    }
});

// ----------------------------------------------------
// 4. POST /api/driver_leave_availability
// ----------------------------------------------------
app.post('/api/driver_leave_availability', async (req, res) => {
    const { Drivers, planned, leaves, unavailability, admin } = req.body;

    // A. Required fields check
    if (!Drivers || !Drivers.trim()) {
        return res.status(400).json({ success: false, message: 'Driver field is required.' });
    }
    if (!planned) {
        return res.status(400).json({ success: false, message: 'Planned start date is required.' });
    }
    if (!leaves) {
        return res.status(400).json({ success: false, message: 'Planned end date is required.' });
    }

    // B. Date logic check (planned must be before leaves)
    const startDate = new Date(planned);
    const endDate = new Date(leaves);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid start or end date format.' });
    }

    if (startDate >= endDate) {
        return res.status(400).json({ success: false, message: 'Planned start date must be before the end date.' });
    }

    try {
        // C. Verify driver exists in staff_members
        const driverCheckSql = 'SELECT id FROM staff_members WHERE Drivers = ? AND status = "Active"';
        const driver = await queryGet(driverCheckSql, [Drivers]);

        if (!driver) {
            // Log verification failure in audit logs
            await queryRun(
                `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, 'Verify Error', ?, 'Conflict')`,
                [Drivers || 'Unknown', `Driver verification failed: Name not registered or inactive.`]
            );
            return res.status(400).json({
                success: false,
                message: `Driver '${Drivers}' is not a registered active staff member.`
            });
        }

        // C2. Check for date overlaps (only check against Pending or Approved leaves)
        const overlapSql = `
            SELECT id FROM driver_leave_availability 
            WHERE Drivers = ? 
              AND status IN ('Pending', 'Approved') 
              AND planned < ? 
              AND leaves > ?
        `;
        const overlap = await queryGet(overlapSql, [Drivers, leaves, planned]);
        if (overlap) {
            // Log overlap warning in audit logs
            await queryRun(
                `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, 'Overlap Error', ?, 'Conflict')`,
                [Drivers, `Overlap detected for requested leave from ${planned} to ${leaves}.`]
            );
            return res.status(400).json({
                success: false,
                message: `Scheduling Conflict: Driver '${Drivers}' already has an Approved or Pending leave request that overlaps with this time range.`
            });
        }

        // D. Insert leave request into database
        const insertSql = `
            INSERT INTO driver_leave_availability (Drivers, planned, leaves, status, unavailability, admin)
            VALUES (?, ?, ?, 'Pending', ?, ?)
        `;
        const params = [Drivers, planned, leaves, unavailability || 'Personal Leave', admin || ''];
        const result = await queryRun(insertSql, params);

        // E. Log successful operation in audit logs
        await queryRun(
            `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, 'Leave Created', ?, 'Info')`,
            [Drivers, `Successfully logged leave request ID: ${result.id} from ${planned} to ${leaves}.`]
        );

        res.status(201).json({
            success: true,
            data: {
                id: result.id,
                Drivers,
                planned,
                leaves,
                status: 'Pending',
                unavailability: unavailability || 'Personal Leave',
                admin: admin || ''
            }
        });

    } catch (err) {
        console.error('Database transaction error:', err.message);
        
        // Log database failure in audit logs
        try {
            await queryRun(
                `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, 'DB Error', ?, 'Conflict')`,
                [Drivers || 'System', `Error saving leave request to database: ${err.message}`]
            );
        } catch (logErr) {
            console.error('Failed to write audit log:', logErr.message);
        }

        res.status(500).json({
            success: false,
            message: 'A database error occurred while processing your request.'
        });
    }
});

// ----------------------------------------------------
// 5. PUT /api/driver_leave_availability/:id/approve
// ----------------------------------------------------
app.put('/api/driver_leave_availability/:id/approve', async (req, res) => {
    const { id } = req.params;
    try {
        const leave = await queryGet('SELECT Drivers, planned, leaves FROM driver_leave_availability WHERE id = ?', [id]);
        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave record not found.' });
        }
        
        await queryRun(
            'UPDATE driver_leave_availability SET status = "Approved", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        
        // Log "Leave Approved" in audit logs
        await queryRun(
            `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, 'Leave Approved', ?, 'Info')`,
            [leave.Drivers, `Approved leave request from ${leave.planned} to ${leave.leaves}.`]
        );
        
        res.status(200).json({
            success: true,
            message: 'Leave request approved successfully.'
        });
    } catch (err) {
        console.error('Error approving leave request:', err.message);
        res.status(500).json({ success: false, message: 'Failed to approve leave request.' });
    }
});

// ----------------------------------------------------
// 6. PUT /api/driver_leave_availability/:id/reject
// ----------------------------------------------------
app.put('/api/driver_leave_availability/:id/reject', async (req, res) => {
    const { id } = req.params;
    try {
        const leave = await queryGet('SELECT Drivers, planned, leaves FROM driver_leave_availability WHERE id = ?', [id]);
        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave record not found.' });
        }
        
        await queryRun(
            'UPDATE driver_leave_availability SET status = "Rejected", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
        
        // Log "Leave Rejected" in audit logs
        await queryRun(
            `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, 'Leave Rejected', ?, 'Info')`,
            [leave.Drivers, `Rejected leave request from ${leave.planned} to ${leave.leaves}.`]
        );
        
        res.status(200).json({
            success: true,
            message: 'Leave request rejected successfully.'
        });
    } catch (err) {
        console.error('Error rejecting leave request:', err.message);
        res.status(500).json({ success: false, message: 'Failed to reject leave request.' });
    }
});


// ----------------------------------------------------
// 9. PUT /api/driver_leave_availability/:id
// ----------------------------------------------------
app.put('/api/driver_leave_availability/:id', async (req, res) => {
    const { id } = req.params;
    const { Drivers, planned, leaves, unavailability, admin, status } = req.body;

    if (!Drivers || !Drivers.trim()) {
        return res.status(400).json({ success: false, message: 'Driver field is required.' });
    }
    if (!planned) {
        return res.status(400).json({ success: false, message: 'Planned start date is required.' });
    }
    if (!leaves) {
        return res.status(400).json({ success: false, message: 'Planned end date is required.' });
    }

    const startDate = new Date(planned);
    const endDate = new Date(leaves);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid start or end date format.' });
    }
    if (startDate >= endDate) {
        return res.status(400).json({ success: false, message: 'Planned start date must be before the end date.' });
    }

    try {
        // Check if leave record exists
        const existingLeave = await queryGet('SELECT id, Drivers, status FROM driver_leave_availability WHERE id = ?', [id]);
        if (!existingLeave) {
            return res.status(404).json({ success: false, message: 'Leave record not found.' });
        }

        // Verify driver exists and is active
        const driver = await queryGet('SELECT id FROM staff_members WHERE Drivers = ? AND status = "Active"', [Drivers]);
        if (!driver) {
            return res.status(400).json({
                success: false,
                message: `Driver '${Drivers}' is not a registered active staff member.`
            });
        }

        // Check for date overlaps (excluding the current leave record id)
        const overlapSql = `
            SELECT id FROM driver_leave_availability 
            WHERE Drivers = ? 
              AND id != ?
              AND status IN ('Pending', 'Approved') 
              AND planned < ? 
              AND leaves > ?
        `;
        const overlap = await queryGet(overlapSql, [Drivers, id, leaves, planned]);
        if (overlap) {
            return res.status(400).json({
                success: false,
                message: `Scheduling Conflict: Driver '${Drivers}' already has an Approved or Pending leave request that overlaps with this time range.`
            });
        }

        const sql = `
            UPDATE driver_leave_availability
            SET Drivers = ?, planned = ?, leaves = ?, unavailability = ?, admin = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        const params = [Drivers, planned, leaves, unavailability || 'Personal Leave', admin || '', status || existingLeave.status, id];
        await queryRun(sql, params);

        // Audit log
        await queryRun(
            `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, 'Leave Updated', ?, 'Info')`,
            [Drivers, `Updated leave request ID: ${id} to ${planned} to ${leaves}. Status: ${status || existingLeave.status}.`]
        );

        res.status(200).json({
            success: true,
            message: 'Leave request updated successfully.'
        });
    } catch (err) {
        console.error('Error updating leave request:', err.message);
        res.status(500).json({ success: false, message: 'Failed to update leave request.' });
    }
});

// ----------------------------------------------------
// 10. DELETE /api/driver_leave_availability/:id (Soft-Delete)
// ----------------------------------------------------
app.delete('/api/driver_leave_availability/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const leave = await queryGet('SELECT Drivers, planned, leaves FROM driver_leave_availability WHERE id = ?', [id]);
        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave record not found.' });
        }

        await queryRun(
            'UPDATE driver_leave_availability SET status = "Cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );

        // Log "Leave Cancelled" in audit logs
        await queryRun(
            `INSERT INTO audit_logs (Drivers, planned, leaves, status) VALUES (?, 'Leave Cancelled', ?, 'Info')`,
            [leave.Drivers, `Cancelled leave request from ${leave.planned} to ${leave.leaves}.`]
        );

        res.status(200).json({
            success: true,
            message: 'Leave request status set to Cancelled.'
        });
    } catch (err) {
        console.error('Error deleting/cancelling leave request:', err.message);
        res.status(500).json({ success: false, message: 'Failed to cancel leave request.' });
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Express API Server listening on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/api/health`);
});
