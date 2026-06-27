# System Architecture & User Flow Diagrams

This document contains the structural system architecture, sequence models, and operational user flow diagrams for the **Driver Leave & Availability Calendar** application.

---

## 1. 3-Tier System Architecture Diagram

The application is structured as a decoupled 3-tier web architecture. The client-side interface communicates asynchronously with the backend server, which executes database operations using parameterized queries.

```mermaid
graph TD
    %% Client Layer
    subgraph Client_Layer["Frontend Layer (Vite + React)"]
        LeaveForm["LeaveForm Component"]
        Dashboard["Dashboard Component"]
        App_State["App.jsx (Global State & Notifications)"]
        Vanilla_CSS["index.css (Glassmorphism & Layout)"]
    end

    %% API Layer
    subgraph API_Layer["Backend API Layer (Node.js + Express)"]
        Server["server.js (HTTP Server)"]
        Cors["CORS Middleware"]
        JSON_Parser["Express JSON Parser"]
        Validators["Input Validation Module"]
    end

    %% Database Layer
    subgraph Database_Layer["Database Layer (SQLite)"]
        DB_Wrapper["db.js (Query Runners)"]
        SQLite_DB[("database.sqlite")]
    end

    %% Communications Flow
    LeaveForm -->|1. GET /api/staff_members| Server
    LeaveForm -->|3. POST /api/driver_leave_availability| Server
    Dashboard -->|2. GET /api/driver_leave_availability| Server
    
    Server -->|Express Router| Validators
    Validators -->|Query Parameters| DB_Wrapper
    DB_Wrapper -->|SQL Statement| SQLite_DB
```

---

## 2. API Request Sequence Diagram

This diagram details the chronological sequence of requests, data validations, database transactions, and state synchronizations occurring when a driver submits a leave request.

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Driver / Dispatcher
    participant Form as React LeaveForm
    participant App as App.jsx (State Coordinator)
    participant Server as Express Server (server.js)
    participant DB as SQLite Database (db.js)
    participant Dashboard as React Dashboard

    %% Initial Mount
    Note over Form, DB: On Application Mount
    Form->>Server: GET /api/staff_members
    Server->>DB: SELECT * FROM staff_members WHERE status = 'Active'
    DB-->>Server: [Driver profiles: Bhanu, Spoorthi, etc.]
    Server-->>Form: {"success": true, "data": [...]}
    Form->>Form: Populate selection dropdown

    %% Leave Submission Flow
    Note over Driver, DB: Driver Logs a Leave
    Driver->>Form: Selects Driver, Start/End Dates, submits
    Form->>Form: Run Client-side validation
    Form->>Server: POST /api/driver_leave_availability (JSON payload)
    
    %% Server Validations
    Note over Server: Server-side validation checks
    alt Fields empty or Start Date >= End Date
        Server-->>Form: 400 Bad Request: {"success": false, "message": "..."}
        Form->>Driver: Show validation error message
    else Inputs valid
        Server->>DB: Verify Driver exists and is Active
        DB-->>Server: Driver Profile record
        alt Driver check fails
            Server-->>Form: 400 Bad Request: Driver unregistered
        else Driver check passes
            Server->>DB: INSERT INTO driver_leave_availability (Pending)
            DB-->>Server: Insert Success (ID generated)
            Server->>DB: INSERT INTO audit_logs (Activity Log)
            DB-->>Server: Log Success
            Server-->>Form: 201 Created: {"success": true, "data": {...}}
            Form->>Form: Reset fields & Show Success Toast Notification
            Form->>App: Trigger onSubmissionSuccess() callback
            
            %% Dashboard Reload
            App->>Server: GET /api/driver_leave_availability
            Server->>DB: SELECT * FROM driver_leave_availability ORDER BY created_at DESC
            DB-->>Server: [All leave records]
            Server-->>App: {"success": true, "data": [...]}
            App->>Dashboard: Pass updated records as props
            Dashboard->>Dashboard: Re-render table displaying new leave entry
        end
    end
```

---

## 3. Operational User Flow Diagram

This flow diagram charts the path from the user's perspective, representing the logical steps from profile selection to dashboard feedback.

```mermaid
flowchart TD
    Start([User opens Web App]) --> LoadDrivers[App loads active driver names from API]
    LoadDrivers --> SelectDriver[User selects Driver from dropdown]
    SelectDriver --> EnterDates[User picks Start & End Dates/Times]
    EnterDates --> ChooseReason[User selects Unavailability Reason]
    ChooseReason --> ClickSubmit[User clicks Submit]
    
    ClickSubmit --> ClientValid{Client validation passes?}
    ClientValid -- No --> ShowClientError[Display field error highlights] --> SelectDriver
    ClientValid -- Yes --> PostAPI[Send HTTP POST payload to Express API]
    
    PostAPI --> ServerValid{Server validation passes?}
    ServerValid -- No --> ReturnHTTP400[Return HTTP 400 + JSON Error Message] --> ShowClientError
    ServerValid -- Yes --> CheckDB{Driver exists in active staff registry?}
    
    CheckDB -- No --> ReturnHTTP400
    CheckDB -- Yes --> InsertDB[Insert record into driver_leave_availability as 'Pending']
    
    InsertDB --> WriteAudit[Write success audit log to audit_logs table]
    WriteAudit --> ReturnHTTP201[Return HTTP 201 + JSON Success Payload]
    ReturnHTTP201 --> ClearForm[Form resets and triggers success notification toast]
    ClearForm --> FetchLeaves[Trigger API GET to fetch fresh leave logs]
    FetchLeaves --> UpdateUI[Re-render dashboard table displaying the entry]
    UpdateUI --> End([Process Complete])
```
