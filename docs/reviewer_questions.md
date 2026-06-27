# Reviewer Question Bank & Model Answers (Review 2)

This document contains 20 highly probable questions that reviewers may ask during the **Review 2 Presentation**, accompanied by model answers to prepare you for the defense.

---

## Part 1: Architecture & Technology Decisions

### Q1: Why did you choose React + Vite instead of a standard HTML/JS frontend?
* **Model Answer**: 
  > "React was chosen for its component-based architecture and declarative state management. In fleet operations, real-time availability updates are critical. React's Virtual DOM ensures that when a new leave request is POSTed, the App's state updates and immediately re-renders the Dashboard table without a full page refresh. We chose Vite over Create React App because Vite utilizes native ES modules, offering faster local compilation and instantaneous Hot Module Replacement (HMR) during development."

### Q2: Why did you choose SQLite as the database instead of MySQL or MongoDB?
* **Model Answer**: 
  > "For this prototype MVP, SQLite provides a fully relational SQL database engine with zero-configuration setup overhead. Unlike MySQL, which requires running a background service and configuring local network ports, SQLite stores data in a single local file (`database.sqlite`). This guarantees that our project runs out-of-the-box on the reviewer's machine. SQLite supports standard ANSI SQL, foreign key constraints, and index optimizations, making it fully technically equivalent for our relational database requirements."

### Q3: How does your application enforce a 3-Tier Architecture?
* **Model Answer**: 
  > "We maintain a strict separation of concerns across three distinct layers:
  > 1. **Presentation Layer (Frontend)**: React components (`LeaveForm` and `Dashboard`) and Vanilla CSS handle rendering the user interface and initial input formatting.
  > 2. **Application Logic Layer (Backend Middleware)**: Express routing controllers in `server.js` handle payload verification, driver existence checks, and CORS headers.
  > 3. **Data Access Layer (Database)**: `db.js` handles query executions, connection pools, table constraints, and file storage."

### Q4: Why are you using pure Vanilla CSS instead of Tailwind CSS?
* **Model Answer**: 
  > "Vanilla CSS was selected to establish custom design control and maintain compliance with core styling practices. It allows us to build clean, responsive layouts using native CSS variables and HSL tailored color schemes, without adding the compilation dependencies or inline-utility clutter of frameworks like Tailwind."

---

## Part 2: Database Design & schemas

### Q5: In your schemas, what do the columns `planned` and `leaves` store in the `staff_members` and `audit_logs` tables? They look like date columns, but they are text.
* **Model Answer**: 
  > "To satisfy the project's literal database schema guidelines, every table utilizes the required column names: `id`, `Drivers`, `planned`, `leaves`, and `status`. 
  > * In `staff_members`: `planned` stores the driver's license number, and `leaves` stores the driver's preferred vehicle category (e.g. Sedan, SUV).
  > * In `driver_leave_availability`: `planned` and `leaves` represent the datetime start and end of the leave request.
  > * In `audit_logs`: `planned` stores the event action type (e.g. `Insert Leave`), and `leaves` stores the detailed description message of the event."

### Q6: What database index optimizations have you implemented, and why?
* **Model Answer**: 
  > "We created three index targets in `db.js`:
  > 1. An index on `driver_leave_availability(Drivers)` to optimize query speeds when filtering the dashboard by driver name.
  > 2. A composite index on `driver_leave_availability(planned, leaves)` to optimize range searches when validation algorithms query for overlapping dates.
  > 3. An index on `audit_logs(Drivers)` to quickly fetch the audit trail of any specific driver."

### Q7: Why are you storing dates as ISO-8601 strings in SQLite?
* **Model Answer**: 
  > "SQLite does not have a native DATETIME data type. It stores dates as TEXT, REAL, or INTEGER. We store them as TEXT in ISO-8601 string format (`YYYY-MM-DDTHH:MM:SS.SSSZ`). This allows us to sort dates chronologically using standard SQL `ORDER BY` operations and query date ranges using standard lexicographical comparison operations."

---

## Part 3: Backend API & Validation

### Q8: What backend input validations do you perform before writing to the database?
* **Model Answer**: 
  > "We execute four core validations in the `POST /api/driver_leave_availability` route:
  > 1. Check that required fields (`Drivers`, `planned`, and `leaves`) are not empty.
  > 2. Validate that the date strings parse correctly into javascript `Date` objects.
  > 3. Verify that the start date (`planned`) is strictly before the end date (`leaves`).
  > 4. Query the `staff_members` table using parameterized SQL to confirm the driver is registered and active."

### Q9: Why is it important to check if the driver exists in `staff_members` before inserting into `driver_leave_availability` if you already have a foreign key constraint?
* **Model Answer**: 
  > "While SQLite has foreign key constraints, they are disabled by default on startup. Although we enable them using `PRAGMA foreign_keys = ON;`, performing an explicit check in Express allows us to return a clean, user-friendly JSON error response (HTTP 400) explaining that the driver is unregistered, instead of letting the application trigger a database crash (HTTP 500) caused by foreign key constraint violations."

### Q10: What is a parameterized query, and why do you use it?
* **Model Answer**: 
  > "A parameterized query uses placeholders (like `?`) instead of concatenating input values directly into the SQL string. We write: `SELECT id FROM staff_members WHERE Drivers = ?` and pass the parameter separately. The SQLite engine compiles the SQL command structure first, and then binds the parameters. This prevents SQL Injection attacks by ensuring user inputs are treated strictly as data, never as executable code."

---

## Part 4: Frontend Development & Integration

### Q11: How do the LeaveForm and Dashboard components communicate since they are siblings?
* **Model Answer**: 
  > "They communicate through **state lifting** in `App.jsx`. `App.jsx` maintains the `leaves` array state. The `Dashboard` receives this state as a read-only prop. The `LeaveForm` receives a callback function, `onSubmissionSuccess`, as a prop. When the form successfully submits a leave, it triggers this callback. `App.jsx` then fetches the fresh logs from the API and updates its `leaves` state, causing the `Dashboard` component to automatically re-render."

### Q12: How do you handle client-side validations in React, and why do you also validate on the backend?
* **Model Answer**: 
  > "Client-side validation is handled in the `validateForm` function inside `LeaveForm.jsx`. It verifies fields before calling `fetch`. If invalid, it blocks submission and displays red warning labels under inputs. We validate on the backend as well because client-side validation can be bypassed (e.g. by sending raw requests via curl or Postman). Backend validation is the ultimate protector of database integrity."

### Q13: How does your UI handle loading states when fetching from the server?
* **Model Answer**: 
  > "We use a `loading` boolean state in `App.jsx` (for the dashboard list) and a `loadingDrivers` state in `LeaveForm.jsx`. While these states are `true`, our UI displays spinner indicators and disables selection dropdowns to prevent actions on empty fields. Once the API returns data, we toggle these states to `false` and render the lists."

---

## Part 5: Git, Testing & Future Scope

### Q14: How did you test your API routes?
* **Model Answer**: 
  > "We created a Postman collection containing six request tests, saved at `/tests`. We tested for successful routes (`GET health`, `GET drivers`, and valid `POST leave`) and error scenarios, confirming that blank fields, end dates before start dates, or unregistered driver submissions return proper HTTP 400 error codes."

### Q15: What is your Git branching strategy?
* **Model Answer**: 
  > "We utilized a local feature-branching workflow. Backend development occurred on the `feature/backend` branch, and frontend development on the `feature/frontend` branch. We merged these branches into `main` after confirming that integration tests (submitting forms and seeing updates) passed."

### Q16: Why did you seed the database with exactly 5 drivers?
* **Model Answer**: 
  > "Seeding 5 active driver profiles on database setup ensures that reviewers can test the Leave Form immediately without needing to manually insert drivers first. The drivers list matches names from the email thread (e.g. Bhanu Prakash, Vaishana Reddy, Spoorthi) to reflect Manivtha's operational context."

---

## Part 6: Advanced & Project Scope (Future Reviews)

### Q17: The project title is "Driver Leave & Availability Calendar". Why is there no calendar UI in your dashboard?
* **Model Answer**: 
  > "This review focuses strictly on the initial code foundation and DB layer (Review 2 MVP scope). The current dashboard provides a real-time list overview of active leaves. We will integrate a visual grid calendar interface showing leaves as timeline blocks in Phase 2 (Week 3/4), utilizing this backend structure."

### Q18: What business rules will the "Matching & Assignment Engine" enforce in the next phase?
* **Model Answer**: 
  > "The matching engine will filter out drivers who are unavailable (active leave logs overlap with trip duration) or whose preferred vehicle category (e.g. Sedan) does not match the booking requirement (e.g. SUV), returning only available candidates."

### Q19: How does the system handle concurrent leave submissions for the same driver?
* **Model Answer**: 
  > "In the next development phase, we will implement transaction blocks and date overlap validations inside `POST /api/driver_leave_availability`. If a transaction attempts to log a leave that overlaps with an existing `Approved` or `Pending` leave for that driver, the backend will reject the write and write a warning to `audit_logs`."

### Q20: What are the future enhancements planned for this project?
* **Model Answer**: 
  > "Following Review 2, we will develop:
  > 1. A visual Calendar Scheduling Interface.
  > 2. The dynamic Driver Assignment and Matching Engine.
  > 3. Automatic email/SMS notifications for leave approvals.
  > 4. Exporting leave histories to CSV/PDF reports."
