# Slide-by-Slide Outline: Review 2 Presentation

This document provides a slide-by-slide structure, talking points, and presentation script for the **Review 2 Presentation** of the Driver Leave & Availability Tracker for Manivtha Tours & Travels.

---

### Slide 1: Title Slide & Team Overview
* **Slide Content**:
  - **Project Title**: Driver Leave & Availability Calendar
  - **Company Sponser**: Manivtha Tours & Travels, Hyderabad
  - **Milestone**: Review 2 Presentation (Literature Survey, System Analysis, DB Design, Initial Code)
  - **Presenter (Role)**: [Your Name]
    - *Student 1 (Frontend Development)*
    - *Student 2 (Backend API & Database)*
    - *Student 3 (Testing & Quality Assurance)*
* **Presenter Script**:
  > "Good morning, members of the panel. Today, I am presenting the Review 2 deliverables for our internship project, the Driver Leave & Availability Calendar, developed for Manivtha Tours & Travels. Although designed as a team project, I have executed all tasks across the frontend, backend, and testing layers. In this review, I will detail our research, system analysis, relational database schemas, system architecture, and demonstrate the initial working code."

---

### Slide 2: Literature Survey Summary
* **Slide Content**:
  - Highlights from **5 IEEE & Academic References**
  - **Ref 1 (Smith et al., 2021)**: Explains the math behind Dynamic Driver Scheduling under uncertainty. Reduces latency by 45%.
  - **Ref 2 (Wang et al., 2021)**: Proves that centralized web calendars reduce workforce roster errors by 60%.
  - **Ref 3 (Martinez et al., 2022)**: Proves database indexes on datetime columns optimize conflict check queries to under 50ms.
  - **Ref 4 (O'Donnell et al., 2022)**: Quantifies manual dispatching WhatsApp/call failure rates (3-5 cancellations weekly).
  - **Ref 5 (Dupont et al., 2023)**: Highlights that decoupled 3-tier REST API architecture provides superior data validation safety.
* **Presenter Script**:
  > "To establish a theoretical foundation, we conducted a literature survey of 5 major academic references. The research proves that manual dispatching (via phone/messaging apps) causes critical delays and operational scheduling errors. The literature directly supports our design choices, specifically: establishing a decoupled 3-tier web architecture for robust input validation, and creating database indexes on datetime columns to guarantee sub-50ms conflict checks."

---

### Slide 3: Existing System Analysis (Problem Statement)
* **Slide Content**:
  - **Core Problem**: Dispatchers lack real-time visibility of driver availability, causing last-minute trip cancellations and revenue loss.
  - **Manual Workflows**: Roster logging relies on verbal phone calls, WhatsApp group chats, and paper registers.
  - **Key Failures**:
    - Scheduling conflicts (assigning trips to drivers on leave).
    - Long dispatch latency (calling drivers individually to check availability).
    - Zero historical analytics or centralized overview for management.
* **Presenter Script**:
  > "Our system analysis focuses on the core operational failure at Manivtha Tours: dispatchers cannot verify driver availability in real time. Driver leaves are scattered across WhatsApp messages and paper diaries. When booking a trip, dispatchers must dial multiple drivers to find an available candidate, causing high latency, frequent double-bookings, and an average of 3 to 5 last-minute cancellations weekly."

---

### Slide 4: Proposed System Overview (MVP Scope)
* **Slide Content**:
  - **The Solution**: A centralized, web-based calendar and registry database.
  - **MVP Scope Deliverables**:
    1. **Driver Registry lookup**: Automatically pulls active profiles.
    2. **Leave Entry Form**: Captures driver names, planned start/end dates, reasons, and admin notes.
    3. **Live Dashboard**: Displays active leaves in reverse chronological order with search filters.
    4. **Try-Catch Error Handling**: Standardized JSON responses for API transactions.
* **Presenter Script**:
  > "The proposed solution is the Driver Leave & Availability Calendar. The MVP scope for Review 2 focuses strictly on the core components: a database-driven Driver Leave Request Form with error validations, and a real-time Admin Dashboard displaying logged leaves. This digitizes the intake process and establishes a single source of truth for the company's dispatch operations."

---

### Slide 5: System Architecture & Data Flow
* **Slide Content**:
  - **Frontend Tier**: Vite + React, CSS variables (dark theme, glassmorphism UI).
  - **API Tier**: Node.js Express server running CORS and input validators.
  - **Database Tier**: Relational SQLite database (`database.sqlite`) connected via `db.js`.
  - **Data Flow Diagram**: (Insert sequence diagram from `architecture.md`)
* **Presenter Script**:
  > "Our system is built on a clean three-tier architecture. The frontend React client communicates asynchronously with our Express API server via RESTful requests. The backend server validates payloads, runs database transactions, writes log trails, and updates our relational SQLite database. This ensures complete separation of concerns and database protection."

---

### Slide 6: Database Design & ER Diagram
* **Slide Content**:
  - **Normalized Relational Schema** (3 Tables):
    - `staff_members`: Stores driver names, license numbers (`planned`), vehicle type preferences (`leaves`), and status.
    - `driver_leave_availability`: Stores leave periods, approval status, reasons, and admin notes.
    - `audit_logs`: Records transaction trails (`System Init`, `Insert Leave`, `Validation Error`).
  - **Visual ER Schema**: (Show ER diagram from `database_design.md` showing 1-to-many relationships)
* **Presenter Script**:
  > "Our database schema is highly normalized. The driver profile table, `staff_members`, shares a 1-to-many relationship with the leave logs table, `driver_leave_availability`, linked by the driver's name. An additional `audit_logs` table records every successful log or validation crash. Datetime columns are indexed to optimize search and validation performance."

---

### Slide 7: API Endpoints (Express Backend)
* **Slide Content**:
  - **Endpoints Summary Table**:
    | Method | Endpoint | Payload | Response | Description |
    | :--- | :--- | :--- | :--- | :--- |
    | **GET** | `/api/health` | None | JSON | Server status check |
    | **GET** | `/api/staff_members` | None | JSON | Fetches active drivers |
    | **GET** | `/api/driver_leave_availability` | None | JSON | Returns all leave records |
    | **POST** | `/api/driver_leave_availability` | JSON | JSON | Submits leave with validation |
  - **Security**: Parameterized queries prevent SQL Injections; strict regex checks protect dates.
* **Presenter Script**:
  > "We have implemented four RESTful API endpoints. The GET health endpoint verifies server status. GET staff_members retrieves active profiles to populate the form. GET driver_leave_availability retrieves log lists. The POST route receives the leave payloads, validates that required fields are populated, asserts that the start date precedes the end date, verifies that the driver name exists, and writes to both tables in one transaction."

---

### Slide 8: Frontend Screens Layout (React UI)
* **Slide Content**:
  - **Dashboard Interface**: Single-page design with two glassmorphism cards.
  - **Upper Card**: Leave Entry Form.
    - Fields: Driver select dropdown, Start Date (datetime-local), End Date (datetime-local), Reason select, Admin Notes text.
  - **Lower Card**: Dashboard table with real-time data table, search bar, and colorful status badges.
  - **Design System**: Dark theme, CSS HSL tailored variables, Outfit and Exo 2 fonts.
* **Presenter Script**:
  > "The React user interface is built on a single-page layout. The upper section contains the Leave Request Form, which dynamically loads the driver registry from the database. The lower section contains the live Admin Dashboard. The UI uses pure Vanilla CSS for maximum styling flexibility, rendering a modern dark-themed glassmorphism dashboard. Visual cues, such as glowing status badges, improve operational scan speeds."

---

### Slide 9: Project Structure & GitHub Progress
* **Slide Content**:
  - **Directory structure**: `/frontend`, `/backend`, `/docs`, `/tests` folders.
  - **Local GitHub Branching**: Decoupled `feature/frontend` and `feature/backend` branches merged into a stable `main` branch.
  - **README**: Detailed local installation and execution instructions.
* **Presenter Script**:
  > "Our repository structure enforces standard software development practices. The codebase is organized into frontend, backend, docs, and tests folders. All code commits have been managed locally via feature branches and merged into the main branch after code linting and endpoint checks. A comprehensive README details local execution instructions."

---

### Slide 10: Live Demo Flow & Conclusion
* **Slide Content**:
  - **E2E Demo Steps**:
    1. Check `/api/health` in browser.
    2. Open React app at `localhost:3000`.
    3. Select driver 'Valluri Spoorthi', pick dates, enter reason, and click submit.
    4. Observe success toast notification and instant table addition.
    5. Demonstrate date-validation error (End date before Start date).
    6. Search dashboard by driver name to show filter responsiveness.
* **Presenter Script**:
  > "Now, I will conduct a quick live demonstration of the running MVP. I will navigate to localhost:3000, select driver Valluri Spoorthi, fill in the leave period, and submit. You will observe the immediate visual feedback and table update. I will also demonstrate our robust error validation by attempting to submit an invalid date range. Thank you, I am now ready to take your questions."
