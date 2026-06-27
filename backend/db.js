const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
const dbExists = fs.existsSync(dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the SQLite database at:', dbPath);
    
    // Enable Foreign Key constraints
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
        if (pragmaErr) {
            console.error('Error enabling foreign keys:', pragmaErr.message);
        } else {
            console.log('Foreign key constraints enabled.');
        }
    });
});

// Setup tables and seed initial data
function initializeDatabase() {
    db.serialize(() => {
        // 1. Create staff_members table
        db.run(`
            CREATE TABLE IF NOT EXISTS staff_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                Drivers TEXT UNIQUE NOT NULL,
                planned TEXT,
                leaves TEXT,
                status TEXT DEFAULT 'Active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating staff_members table:', err.message);
        });

        // 2. Create driver_leave_availability table
        db.run(`
            CREATE TABLE IF NOT EXISTS driver_leave_availability (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                Drivers TEXT NOT NULL,
                planned DATETIME NOT NULL,
                leaves DATETIME NOT NULL,
                status TEXT DEFAULT 'Pending',
                unavailability TEXT,
                admin TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (Drivers) REFERENCES staff_members(Drivers) ON UPDATE CASCADE ON DELETE RESTRICT
            )
        `, (err) => {
            if (err) console.error('Error creating driver_leave_availability table:', err.message);
        });

        // 3. Create audit_logs table
        db.run(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                Drivers TEXT NOT NULL,
                planned TEXT NOT NULL,
                leaves TEXT,
                status TEXT DEFAULT 'Info',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating audit_logs table:', err.message);
        });

        // 4. Create Indexes for performance optimization
        db.run(`CREATE INDEX IF NOT EXISTS idx_leaves_drivers ON driver_leave_availability(Drivers);`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_leaves_dates ON driver_leave_availability(planned, leaves);`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_audit_drivers ON audit_logs(Drivers);`);

        console.log('Database tables and indexes verified/created.');

        // 5. Seed active drivers if database is new or empty
        db.get('SELECT COUNT(*) AS count FROM staff_members', [], (err, row) => {
            if (err) {
                console.error('Error counting staff members:', err.message);
                return;
            }
            if (row.count === 0) {
                console.log('No drivers found in staff_members. Seeding initial data...');
                const driversList = [
                    { name: 'Vaddireddy Bhanu Prakash Reddy', license: 'DL-554202688', vehicle: 'SUV' },
                    { name: 'Pabbathi Vaishanava Reddy', license: 'DL-993202611', vehicle: 'Sedan' },
                    { name: 'Valluri Spoorthi', license: 'DL-112202634', vehicle: 'Sedan' },
                    { name: 'Ravi Teja', license: 'DL-776202690', vehicle: 'Tempo Traveller' },
                    { name: 'Kiran Kumar', license: 'DL-443202612', vehicle: 'SUV' }
                ];

                const stmt = db.prepare(`
                    INSERT INTO staff_members (Drivers, planned, leaves, status)
                    VALUES (?, ?, ?, 'Active')
                `);

                driversList.forEach((d) => {
                    stmt.run([d.name, d.license, d.vehicle], (runErr) => {
                        if (runErr) {
                            console.error(`Error inserting driver ${d.name}:`, runErr.message);
                        } else {
                            console.log(`Driver seeded: ${d.name}`);
                        }
                    });
                });
                stmt.finalize();

                // Log database initialization in audit logs
                db.run(`
                    INSERT INTO audit_logs (Drivers, planned, leaves, status)
                    VALUES ('System', 'DB Init', 'Seeded 5 active driver profiles successfully.', 'Info')
                `);
            } else {
                console.log('Database already has seeded drivers. Skipping seeding.');
            }
        });
    });
}

// Initialize tables on load
initializeDatabase();

// Utility function to execute a parameterized query (SELECT multi-row)
function queryAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Utility function to execute a parameterized query (SELECT single-row)
function queryGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Utility function to run INSERT/UPDATE/DELETE queries
function queryRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

module.exports = {
    db,
    queryAll,
    queryGet,
    queryRun
};
