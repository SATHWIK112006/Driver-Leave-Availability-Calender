# System Analysis: Driver Leave & Availability Calendar

This chapter provides a detailed analysis of the existing operational workflow at Manivtha Tours & Travels, identifies the core challenges of manual tracking, outlines the proposed digital system, and defines the system requirements (functional and non-functional) for the MVP.

---

## 1. Existing System Analysis (Manual Workflow)

Currently, **Manivtha Tours & Travels** relies on manual communication channels such as phone calls and messaging applications (e.g., WhatsApp) to track driver leave requests and availability. 

### The Manual Process Flow
1. A driver plans to take leave or becomes unavailable due to personal or vehicle maintenance reasons.
2. The driver calls the operations administrator or sends a text message stating their planned absence.
3. The administrator manually notes this information on a paper register, spreadsheet, or simply attempts to remember it.
4. When a new trip booking arrives (corporate contract or leisure customer), the administrator reviews active bookings and calls drivers individually to verify their immediate availability.

### Limitations & Failures of the Manual System
* **Scheduling Conflicts**: Because there is no centralized schedule, administrators frequently assign trips to drivers who have already verbally logged leaves, resulting in double-booking or dispatcher oversights.
* **Delayed Trip Assignments**: Dispatchers spend considerable time making phone calls to verify driver readiness before confirming trip assignments. This delay reduces response times for corporate and on-demand bookings.
* **Reduced Operational Visibility**: Management cannot view the fleet's net availability on any given day. It is impossible to identify patterns (e.g., high absenteeism on weekends) or compile reports without manually auditing calls and text chat logs.
* **Operational Revenue Loss**: Discovering that an assigned driver is unavailable at the last minute forces dispatcher staff to cancel trips, causing revenue loss and customer dissatisfaction.

---

## 2. Proposed System Analysis (Digital Platform)

The proposed **Driver Leave & Availability Calendar** provides a centralized digital platform that enables drivers to submit leave requests and allows administrators to monitor real-time driver availability before assigning trips.

### The Proposed Process Flow
1. **Direct Input**: Drivers (or staff on their behalf) access a simple, validated web form to select their name, select their planned leave start/end dates, choose a reason for unavailability, and submit.
2. **Relational Processing**: The system performs instant data validation and records the leave in an SQLite database linked to driver profiles.
3. **Real-Time Visualization**: Operations administrators access a live, centralized dashboard showing active leaves, driver names, and dates, with search and filtering features.
4. **Immediate Verification**: Before dispatching a trip, the administrator opens the dashboard to instantly check which drivers are marked "On Leave" vs. "Available", eliminating the need for phone calls.

---

## 3. Comparison Matrix: Manual vs. Proposed Digital System

| Metric | Existing Manual System | Proposed Digital System (MVP) |
| :--- | :--- | :--- |
| **Communication Channel** | Phone calls, SMS, WhatsApp texts | Centralized Web Form & API |
| **Data Storage** | Scattered paper registers, memory, chats | Structured SQLite relational database |
| **Trip Assignment Delay** | High (requires manual calls to verify availability) | Zero (immediate status lookup on dashboard) |
| **Conflict Rate** | High (frequent double-bookings/forgotten leaves) | Low (system database checks dates before saving) |
| **Audit Visibility** | None (no record of who approved/noted a leave) | Complete (actions logged automatically to DB) |
| **Reporting & Summaries** | Requires hours of manual data compiling | Instant dashboard overview |

---

## 4. Functional Requirements (MVP Scope)

The Minimum Viable Product (MVP) developed for Review 2 focuses strictly on the core functions required to log leaves and display them:
1. **Driver Registry lookup**: The Leave Form must dynamically fetch the list of active drivers from the database to populate the selection dropdown.
2. **Leave Request Logging**: The system must capture:
   - Driver name (`Drivers`)
   - Leave Start Date & Time (`planned`)
   - Leave End Date & Time (`leaves`)
   - Reason for unavailability (`unavailability`)
   - Optional comments (`admin`)
3. **Real-time Leave Dashboard**: The admin dashboard must render a clean, sortable tabular grid of all logged leave entries with pagination.
4. **Search and Filtering**: Administrators must be able to search the dashboard by driver name and filter entries by status (`Approved`, `Pending`, `Rejected`).
5. **Form Validations**:
   - The system must reject submissions if any required fields are empty.
   - The system must reject submissions if the end date (`leaves`) is set prior to the start date (`planned`).

---

## 5. Non-Functional Requirements

1. **Usability & Interface**:
   - The web interface must load a modern, clean typography hierarchy (Inter/Exo 2 Google fonts).
   - Use HSL tailored colors for visual indicators (status badges) with high readability.
   - The application must be fully responsive, rendering cleanly on mobile viewports (down to 375px wide) for on-the-road driver access.
2. **Performance & Reliability**:
   - The application dashboard must render initial data in under 2 seconds on standard local networks.
   - Search and filter queries on the SQLite database must complete in under 50 milliseconds.
3. **Security & Data Integrity**:
   - All backend routes must sanitize inputs to prevent HTML/script injections.
   - The backend must utilize parameterized SQL queries to prevent SQL Injection vulnerability.

---

## 6. Feasibility Analysis

### Technical Feasibility
The system uses widely available, standard industry technologies including React, Node.js, Express, and SQLite, making implementation practical and stable within the internship duration. These open-source technologies have massive developer community support, enabling easy debugging and maintenance.

### Economic Feasibility
The software utilizes open-source technologies and requires no commercial licensing costs, making deployment highly cost-effective for small and medium transportation companies like Manivtha Tours & Travels. Running on local resources or free cloud tiers (e.g., Vercel, Render) requires near-zero monthly operational hosting overhead.

### Operational Feasibility
Drivers and administrators require minimal training because the interface follows simple, intuitive form-based workflows already familiar to anyone who has used online calendars or basic web applications. Transitioning from phone calls to this digital calendar represents a massive reduction in dispatcher administrative strain.

