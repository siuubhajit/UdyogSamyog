# 🏛️ उद्योग संयोग | Udyog Samyog

### Maharashtra Single Window Industrial Approvals, Compliance Processes, and Government Support Portal

**Problem Statement ID:** 26130  
**Organization:** Government of Maharashtra  
**Department:** Maharashtra State Innovation Society, Department of Skills, Employment, Entrepreneurship and Innovation  
**Database Engine:** MongoDB (Mongoose ODM)  
**Live Portal:** `NA`

---

## 📋 Executive Overview

**Udyog Samyog (उद्योग संयोग)** is the unified, intelligent Single-Window Clearance and Compliance Management Portal designed for the Government of Maharashtra. Built to realize the state's vision of maximum governance and seamless ease of doing business, it eliminates inter-departmental friction, disparate filing systems, and bureaucratic delays by orchestrating specialized departmental scrutinies into a streamlined, phased approval pipeline.

The platform coordinates reviews across four critical regulatory bodies:
1. **Maharashtra Pollution Control Board** (Environmental Protection)
2. **Maharashtra Industrial Development Corporation** (Civil & Infrastructure Engineering)
3. **Directorate of Industrial Safety and Health** (Factory Safety & Worker Welfare)
4. **Directorate of Maharashtra Fire Services** (Life Safety & Fire Protection)

All departmental reviews culminate into a unified apex dossier under the statutory jurisdiction of the **Lead Approving Officer (Maharashtra State Innovation Society / Industries Apex Authority)**, who alone possesses the legal authority to grant consolidated single-window establishment permits and issue digitally signed establishment licenses.

---

## ⚙️ 3-Phase Multi-Agency Clearance Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │               ENTERPRISE APPLICANT                     │
                    │   Submits Unified Application & 4 Statutory Plans      │
                    └──────────────────────────┬─────────────────────────────┘
                                               │
                                               ▼
     ══════════════════════════════════════════════════════════════════════════════════════
     PHASE 1: MANDATORY ENVIRONMENTAL CLEARANCE FIRST
     ══════════════════════════════════════════════════════════════════════════════════════
                                               │
                    ┌──────────────────────────┴─────────────────────────────┐
                    │       MAHARASHTRA POLLUTION CONTROL BOARD              │
                    │   • Environmental Management & Effluent Scheme         │
                    │   • Water Balance, Air Emissions, Hazardous Waste      │
                    │   • Statutory Decision: Consent to Establish           │
                    └──────────────────────────┬─────────────────────────────┘
                                               │
                                               ▼ (Consent to Establish Granted)
     ══════════════════════════════════════════════════════════════════════════════════════
     PHASE 2: SIMULTANEOUS CONCURRENT DEPARTMENTAL SCRUTINY
     ══════════════════════════════════════════════════════════════════════════════════════
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
  ┌─────────────────────────┐    ┌───────────────────────────┐   ┌──────────────────────────┐
  │ CIVIL & INFRASTRUCTURE  │    │  FACTORY SAFETY & HEALTH  │   │   LIFE & FIRE SAFETY     │
  │ Maharashtra Industrial  │    │ Directorate of Industrial │   │      SERVICES            │
  │ Development Corporation │    │   Safety and Health       │   │ Directorate of Fire      │
  │ • Site Master Layout    │    │ • Machinery Layout Plans  │   │ Services                 │
  │ • Building Blueprints   │    │ • Chemical Hazard Controls│   │ • Static Water Reservoir │
  │ • Setbacks & Roadways   │    │ • Worker Welfare Guards   │   │ • Fire Hydrant Network   │
  │ • Floor Area Ratio      │    │ • Factories Act Standards │   │ • Fire Tender Access     │
  └────────────┬────────────┘    └─────────────┬─────────────┘   └────────────┬─────────────┘
               │                               │                              │
               └───────────────────────────────┼──────────────────────────────┘
                                               │ (All 3 Parallel Clearances Approved)
                                               ▼
     ══════════════════════════════════════════════════════════════════════════════════════
     PHASE 3: FINAL CONSOLIDATED SINGLE-WINDOW CLEARANCE & LICENSING
     ══════════════════════════════════════════════════════════════════════════════════════
                                               │
                    ┌──────────────────────────┴─────────────────────────────┐
                    │   LEAD APPROVING OFFICER (APEX AUTHORITY)              │
                    │   Maharashtra State Innovation Society / Industries    │
                    │   • Evaluates Collated Departmental Remarks & Dossiers │
                    │   • Verifies Incentive Eligibility (PSI & Grants)      │
                    │   • Grants Consolidated Single-Window Sanction         │
                    │   • Issues Digitally Authenticated License Certificate │
                    └────────────────────────────────────────────────────────┘
```

---

## 🌟 Comprehensive Feature Matrix

### 1. Dedicated Departmental Officer Consoles
Each regulatory department operates through a specialized, role-tailored dashboard designed specifically for its statutory mandate:

- **Maharashtra State Innovation Society (Apex Portal - `officer-dashboard-msins.html`)**:
  - Executive KPI overview: Active dossiers, approvals, parallel reviews, and flagged queries.
  - Collated multi-agency dossier view with side-by-side remarks from all confirming bodies.
  - Enterprise Clearance & License Search Console with live multi-milestone tracking.
  - Enterprise Registry & Statutory Blacklisting management console.
  - Package Scheme of Incentives subsidy and State Innovation Seed Grant calculator.
  - Consolidated single-window final approval and license certificate issuance.

- **Maharashtra Industrial Development Corporation (Civil Infrastructure - `officer-dashboard-midc.html`)**:
  - Industrial cluster zoning filters (Chakan Industrial Area, Butibori, Thane-Belapur Industrial Zone).
  - Site layout blueprints and building plan scrutiny console.
  - Front/side setback compliance, Floor Area Ratio verification, and plot allotment checks.

- **Maharashtra Pollution Control Board (Environmental Review - `officer-dashboard-mpcb.html`)**:
  - Environmental risk categorization filters (Red, Orange, Green, White).
  - Effluent Treatment Scheme, Zero Liquid Discharge, and air pollution control scrutiny.
  - Statutory Consent to Establish issuance gatekeeper (Phase 1).

- **Directorate of Industrial Safety and Health (Factory Safety - `officer-dashboard-dish.html`)**:
  - Risk tier assessment: Chemical Hazards (flammables, toxic solvents), Thermal Hazards, Heavy Engineering.
  - Machinery guarding layouts and worker health mitigation verification under the Factories Act.
  - Hazardous material secondary containment inspection.

- **Directorate of Maharashtra Fire Services (Life Safety - `officer-dashboard-fire.html`)**:
  - Static underground water reservoir volume calculator (liters per day).
  - Fire hydrant piping network specifications and pump delivery pressure checks (liters per minute).
  - Fire tender driveway access and turning radius verification.

---

### 2. Enterprise Clearance & License Search Console
Located directly on the Apex Authority Portal, this search console provides complete transparency for state officials:
- **Clean Prompt Guide:** Displays a dedicated search guide prompt on initial load, preventing unsearched or random industries from cluttering the screen.
- **Instant Multi-Field Search:** Real-time search across company name, Goods and Services Tax Identification Number (GSTIN) / Registration Number, Application Number, and District.
- **Applied vs. Unapplied Enterprise Separation:**
  - **Applied Enterprises:** Displays live multi-departmental clearance milestones, statutory remarks from inspecting officers, blueprint dossier links, and license certificate actions.
  - **Unapplied Enterprises:** Clearly identified with a distinctive informative warning panel showing registered enterprise details with zero applications filed, preventing false milestone indicators.
- **Zero Substring False Positives:** Intelligent registration matching ensures short queries do not match arbitrary substrings within longer identifiers.

---

### 3. Enterprise Account Management & Statutory Blacklisting
- **Executive Audit:** The Apex Approving Officer can inspect all registered enterprises, review their compliance history, and check total application counts.
- **Statutory Blacklist Enforcement:** Apex officers can blacklist non-compliant enterprises with mandatory legal justification.
- **Application Bar:** Blacklisted enterprises are strictly barred from creating new clearance applications (`POST /api/applications` returns HTTP 403 Forbidden).
- **Instant Reinstatement:** Statutory reinstatement option restores full permit and licensing rights with real-time audit logging.

---

### 4. Smart 4-Step Application Wizard & Regulatory Knowledge Engine
- **Dynamic Risk Tiering:** Automatically calculates industry classification into Red, Orange, Green, or White based on land area, daily water consumption, electricity load, and hazardous materials.
- **Automated MSME Classification:** Classifies investments into Micro, Small, Medium, or Large units in accordance with national industrial criteria.
- **Clearance Mapping:** Automatically determines required clearances across Industrial Development Corporation, Pollution Control Board, Directorate of Industrial Safety and Health, Directorate of Fire Services, Ground Water Authority, and State Electricity Distribution Company.
- **Maharashtra Incentive Matching:** Dynamically identifies eligible state support schemes:
  - **Package Scheme of Incentives (2019/2024):** Capital subsidies up to 40%–80% on Fixed Capital Investment.
  - **State Innovation Voucher & Seed Grant:** Financial grants up to ₹15 Lakhs for innovative prototyping.
  - **Industrial Electricity Duty Waiver:** 100% duty exemptions for 7 to 10 years.
  - **Interest Subvention on Working Capital:** 5% interest subsidy on bank term loans.
- **4 Statutory Plan Blueprint Uploads:** Mandatory PDF blueprint submission with metadata tagging:
  - `environmental_plan` (Effluent Treatment & Emission Scheme)
  - `civil_plan` (Site Master Layout & Blueprint)
  - `factory_safety_plan` (Machinery & Safety Guarding Blueprint)
  - `fire_safety_plan` (Fire Hydrant & Evacuation Scheme)

---

### 5. Interactive Document Vault & Departmental Isolation
- **In-Browser Inline PDF Preview:** Officials and applicants can inspect blueprints directly within the portal with zero download friction (`GET /api/documents/:id/view`).
- **Departmental Vault Isolation:** Non-apex officials can only view and download blueprints belonging to their specialized domain vault (e.g., Fire Officers can only inspect fire protection plans; Civil Officers only see civil layouts).
- **Insecure Direct Object Reference (IDOR) Protection:** Applicants can only view their own uploaded documents. Unauthorized access attempts return HTTP 403 Forbidden.
- **Document Verification Stamping:** Official review remarks and status tagging (`Verified`, `Pending`, `Deficient`).
- **Finalization Lock:** Once an application is Approved or Rejected, document verification remarks cannot be tampered with.

---

### 6. Interactive Query Clarification Workflow
- **Query Raising:** Inspecting officers can raise formal queries on applications that require technical revisions, moving application status to `Flagged`.
- **Applicant Clarification Console:** Applicants receive real-time notifications, review the inspecting officer's exact query message, submit written replies, and optionally upload revised compliance blueprints.
- **Automatic Department Routing:** Uploaded revised blueprints automatically inherit the querying officer's departmental code and become immediately available in that officer's scrutiny vault.
- **Single-Resolution Protection:** Queries can only be resolved once; duplicate submissions to an already resolved query are rejected with HTTP 400.
- **Automatic Status Restoration:** When all open queries on an application are resolved, the application status automatically returns to `In Progress`.

---

### 7. Joint On-Site Inspection Scheduling
- **Official Scheduling:** Inspecting officers can coordinate and schedule physical on-site inspections (`POST /api/applications/:id/inspections`).
- **Inspection Details:** Captures inspecting department, scheduled inspection date, assigned senior inspector name, and scope notes.
- **Access Control:** The inspection list endpoint (`GET /api/applications/:id/inspections`) restricts visibility strictly to authorized state officials and the owning enterprise applicant.

---

### 8. Digital Clearance Certificate Vault & Cryptographic Verification
- **Official Issuance:** Upon Apex approval, the system generates an official Government of Maharashtra Single-Window Industrial Establishment Permit.
- **Cryptographic Fingerprint:** Every certificate is embedded with an irreversible SHA-256 digital signature hash generated from the enterprise name, application number, and state approval metadata.
- **Unique Serial Identification:** Serialized certificate numbering format (e.g., `CERT/MH/IND/6aa6fdf0ac6f8597c2b3e1b9/2026`).
- **Printable Certificate View:** Formatted with state emblem, statutory legislation citations, five-year validity term, and direct QR verification parameters.

---

### 9. Service Level Intelligence & Analytics Console
- **Compliance Tracking:** Real-time monitoring of departmental compliance against statutory Service Level Guarantees.
- **Turnaround Times:** Departmental average clearance times in days compared against state-mandated targets.
- **Bottleneck Detection:** Automated tracking of active applications versus identified service level breaches.
- **District Investment Distribution:** Visual investment density breakdown across Maharashtra industrial districts (Pune, Raigad, Thane, Aurangabad, Nagpur, Nashik).

---

### 10. Robust Authentication, Two-Factor OTP & Security Engine
- **Mandatory Two-Factor OTP Verification:** Integrated OTP validation for both Enterprise Registration and Password Reset.
- **Nodemailer Gmail SMTP Integration:** Full support for Google Gmail App Passwords with strict socket and connection timeouts (10,000ms connection, 10,000ms greeting, 12,000ms socket timeout) preventing server hangs. Emails include both HTML and plain-text bodies for improved deliverability and spam-filter resilience.
- **Resilient Development Fallback:** Automatic local fallback mode (`fallback_console`) logs verification codes to stdout and displays accessible helper pills for offline development and local evaluation.
- **Test Domain Bypass:** Automated test suites using test domains (`testcorp.in`, `hi2.in`, `example.com`) generate instant mock OTPs without invoking outbound networks.
- **Password Complexity Standards:** Alphanumeric, minimum 8 characters, at least one special symbol (`@`, `#`, `$`, `%`, etc.) verified via interactive live UI checklists and backend validation.
- **Duplicate Prevention:** Strict database uniqueness checks on official email addresses, 10-digit Indian mobile numbers (starting with 6, 7, 8, or 9), and 15-character GSTIN registration codes.
- **Role-Based Access Control (RBAC):** Middleware guards (`auth`, `official`, `apexOfficial`) protect administrative endpoints. Applicants cannot access official consoles; official users cannot spawn clearance applications.
- **Modern MongoDB Layer:** High-performance Mongoose schemas with type-safety, validation, atomic updates, and automatic `id` serialization.
- **Zero Statutory Abbreviations:** Strict adherence to full statutory terminology across all user interfaces, database schemas, and system logs.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js:** Version 20 or later.
- **MongoDB:** Community Server (running locally on port `27017`) or a MongoDB Atlas cloud connection URI.

### Installation & Launch

```bash
# 1. Clone or navigate to the project directory
cd UdyogSamyog

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Then edit .env and fill in your values (see below)

# 4. Start the application
npm start
```

The server will automatically connect to MongoDB, seed the default official and applicant accounts (if not already seeded), and begin listening on **`http://localhost:3000`**.

### Environment Variables (`.env`)

Copy `.env.example` to `.env` and set the following:

```env
# Gmail address used to dispatch OTP emails
GMAIL_USER=your_address@gmail.com

# 16-character Google App Password (NOT your Gmail login password)
# Generate one at: https://myaccount.google.com/apppasswords
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Optional: MongoDB connection URI (defaults to local instance)
# MONGODB_URI=mongodb://localhost:27017/udyog_samyog

# Optional: Session encryption secret (randomise for production)
# SESSION_SECRET=a-long-random-string-here
```

> **Security note:** `.env` is listed in `.gitignore` and will never be committed. Never share your Gmail App Password or session secret publicly.

---

## 👥 Evaluation Demo Accounts

Pre-seeded demonstration accounts with 1-click autofill buttons available directly on the login page (`/pages/login.html`):

| Role / Authority | Official Email | Password | Department / Mandate |
| :--- | :--- | :--- | :--- |
| **Lead Approving Officer (Apex Approver)** | `officer@udyog.gov.in` | `Officer@123#` | Maharashtra State Innovation Society & Directorate of Industries (Apex Authority) |
| **Civil Infrastructure Officer** | `midc.officer@udyog.gov.in` | `Midc@123#` | Maharashtra Industrial Development Corporation (Civil Engineering) |
| **Environmental Review Officer** | `mpcb.officer@udyog.gov.in` | `Mpcb@123#` | Maharashtra Pollution Control Board (Environmental Clearance) |
| **Life & Fire Safety Officer** | `fire.officer@udyog.gov.in` | `Fire@123#` | Directorate of Maharashtra Fire Services (Life Safety) |
| **Factory Safety & Health Officer** | `dish.officer@udyog.gov.in` | `Dish@123#` | Directorate of Industrial Safety and Health (Factory Safety) |
| **Enterprise Applicant** | `entrepreneur@mahindra-auto.in` | `Applicant@123#` | Sahyadri Precision Engineering Private Limited |

---

## 📁 Project Architecture & File Structure

The backend follows a clean, modular Express & Mongoose architecture:

```
UdyogSamyog/
├── server.js                          # Application bootstrap, Express server setup, middleware & route mounting
├── package.json                       # Project configuration and dependencies (mongoose, express, helmet, etc.)
├── .env.example                       # Template for environment variables — copy to .env and fill in values
├── .env                               # ⛔ gitignored — contains Gmail App Password & session secret (never commit)
├── .gitignore                         # Excludes .env, node_modules/, scratch/, uploads/*, logs, build artefacts
├── db/
│   ├── models.js                      # Mongoose schemas & models (User, Application, Document, Query, Inspection, Otp, ResetToken)
│   └── seed.js                        # Idempotent database seeder for demo accounts, application, blueprints & plans
├── routes/
│   ├── auth.js                        # Authentication, Enterprise Registration, OTP Verification, Password Reset & Profile
│   ├── admin.js                       # Apex Authority Enterprise Directory, Blacklisting & Reinstatement
│   ├── applications.js                # 3-Phase Statutory Pipeline, Stage Decisions, Dossiers & Digital Certificates
│   ├── documents.js                   # Industrial Vault Uploads, In-browser Preview, Downloads & Officer Verification
│   ├── queries.js                     # Officer Formal Queries & Applicant Clarifications with Blueprint Revisions
│   ├── inspections.js                 # Joint On-Site Inspection Scheduling & History Tracking
│   └── analytics.js                   # Service Level Guarantees, Bottleneck Detection & State Incentive Matching
├── utils/
│   └── helpers.js                     # Rate Limiters, Gmail SMTP, Regulatory Knowledge Engine, Plan Classifier & Auth Middleware
├── uploads/                           # ⛔ gitignored — Industrial vault disk storage for statutory blueprints
│   └── .gitkeep                       # Ensures the uploads/ directory exists in the repo
├── scratch/                           # ⛔ gitignored — Local diagnostic & one-off test scripts (never committed)
└── public/
    ├── css/
    │   └── style.css                  # Professional government theme, glassmorphic topbar, responsive layout & dark mode tokens
    ├── js/
    │   ├── common.js                  # Shared fetch wrapper, Zero-FOUC theme switcher, Modal API & conditional AI loader
    │   ├── auth.js                    # Authentication controller, OTP timer, live complexity & Gmail config modal
    │   ├── applicant-workflow.js      # Enterprise applicant workflow card and multi-agency clearance matrix
    │   ├── clearance-timeline.js      # Unified clearance timeline component (compact, detailed, officer)
    │   ├── officer-msins.js           # Apex Officer controller: search console, registry, banning, PSI calculator
    │   └── officer/                   # Modular Officer Workspace Controllers & Statutory Calculators
    │       ├── workspace.js           # Unified departmental workspace master controller
    │       ├── department-config.js   # Dynamic departmental metadata, checklist criteria & calculator bindings
    │       ├── application-table.js   # Reusable applications table & mobile responsive cards
    │       ├── decision-panel.js      # Shared statutory decision controller & checklist validator
    │       └── calculators/           # Statutory Engineering Calculators (MPCB, MIDC, DISH, FIRE)
    └── pages/
        ├── login.html                 # State Innovation Society gateway: login, register with OTP, forgot password
        ├── applicant-dashboard.html   # Enterprise applicant portal: top active table, KPIs, timeline & mobile cards
        ├── application.html           # 5-step clearance application wizard with dynamic Regulatory Knowledge Engine
        ├── tracker.html               # Real-time multi-department clearance tracker with detailed phase drill-down
        ├── verification.html          # Split-screen dossier scrutiny console with fixed PDF viewer & tabbed review panel
        ├── analytics.html             # Service Level Guarantee intelligence, bottleneck analysis, district heatmap
        ├── reset-password.html        # Secure password reset page with token/OTP validation
        ├── officer-workspace.html     # Unified configurable Departmental Officer Workspace (?dept=mpcb|midc|dish|fire)
        ├── officer-dashboard.html     # Unified officer routing gateway
        └── officer-dashboard-msins.html  # Maharashtra State Innovation Society Apex Authority Console
```

---

## 📡 RESTful API Reference

### 1. Authentication, Sessions & OTP
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/otp/send` | Public | Dispatches 6-digit verification OTP via Gmail SMTP or fallback mode (90s validity) |
| `POST` | `/api/otp/verify` | Public | Validates entered OTP code against database records |
| `POST` | `/api/register` | Public | Registers enterprise with verified OTP, complexity checks, phone & GSTIN validation |
| `POST` | `/api/login` | Public | Authenticates credentials and issues session cookie |
| `POST` | `/api/logout` | Authenticated | Terminates session |
| `GET` | `/api/me` | Authenticated | Retrieves current authenticated session user profile |
| `POST` | `/api/forgot-password` | Public | Dispatches password reset OTP or generates secure reset token |
| `POST` | `/api/reset-password` | Public | Resets account password using reset token or email + OTP |
| `GET` | `/api/config/gmail` | Authenticated | Checks whether Gmail SMTP is configured |
| `POST` | `/api/config/gmail` | Authenticated | Saves custom Gmail credentials to environment |
| `POST` | `/api/config/gmail/test` | Authenticated | Tests live connectivity to Google Gmail SMTP servers |
| `GET` | `/api/account` | Authenticated | Retrieves enterprise profile and application counts |
| `DELETE` | `/api/account` | Authenticated | Removes enterprise profile (guarded against active applications) |
| `POST` | `/api/test/reset-limits` | Dev/Test | Resets rate limiting buckets for automated testing |

### 2. Enterprise Administration (Apex Authority Only)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/enterprises` | Official (Apex) | Lists all registered enterprises with application counts and ban status |
| `POST` | `/api/admin/enterprises/:id/ban` | Official (Apex) | Blacklists enterprise with mandatory statutory reason |
| `POST` | `/api/admin/enterprises/:id/unban` | Official (Apex) | Reinstates blacklisted enterprise |

### 3. Applications & Scrutiny Pipeline
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/applications` | Applicant | Submits new clearance application with 4-plan blueprint evaluation |
| `GET` | `/api/applications` | Authenticated | Lists applications (filtered by departmental jurisdiction or applicant ownership) |
| `GET` | `/api/applications/pending` | Authenticated | Lists pending applications awaiting departmental scrutiny |
| `GET` | `/api/applications/:id` | Authenticated | Retrieves complete application dossier, plans, remarks, and metadata |
| `PUT` | `/api/applications/:id` | Authenticated | Updates existing application parameters with automated re-tiering |
| `POST` | `/api/applications/:id/stage-decision` | Official | Records departmental decision (`Approved`, `Rejected`, `Query`) and drives transitions |
| `GET` | `/api/applications/:id/pipeline` | Authenticated | Retrieves live 3-phase pipeline milestone statuses (ownership enforced) |
| `PATCH`| `/api/applications/:id/department-clearance`| Official | Updates departmental milestone status |
| `PATCH`| `/api/applications/:id/status` | Official (Apex) | Grants final consolidated approval or halts pipeline |
| `GET` | `/api/applications/:id/certificate` | Authenticated | Retrieves official digital clearance certificate with SHA-256 hash |

### 4. Statutory Documents & Vault
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/applications/:id/documents` | Applicant | Uploads statutory plan PDFs (`environmental_plan`, `civil_plan`, etc.) |
| `GET` | `/api/applications/:id/documents` | Authenticated | Lists documents (scoped by inspecting officer's department vault) |
| `GET` | `/api/documents/:id/view` | Authenticated | Streams PDF/image inline for browser preview (department-scoped) |
| `GET` | `/api/documents/:id` | Authenticated | Downloads document binary (department-scoped) |
| `PATCH` | `/api/documents/:id/verify` | Official | Updates document verification status and scrutiny remarks |

### 5. Queries, Inspections & Licensing
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/applications/:id/query` | Official | Raises formal query on dossier, setting application status to `Flagged` |
| `POST` | `/api/queries/:id/reply` | Authenticated | Submits clarification reply and optional revised compliance document |
| `POST` | `/api/applications/:id/inspections` | Official | Schedules joint on-site physical inspection |
| `GET` | `/api/applications/:id/inspections` | Authenticated | Lists scheduled inspections (ownership enforced) |
| `GET` | `/api/schemes/eligible` | Authenticated | Returns eligible Maharashtra state incentive packages |
| `GET` | `/api/analytics/summary` | Authenticated | Returns Service Level Guarantee compliance rates and district intelligence |

---

## 🧪 Automated Testing & Verification

The `scratch/` directory contains local diagnostic and verification scripts. It is **gitignored** and never committed — clone the repo and create these locally as needed.

```bash
# 1. Comprehensive MongoDB End-to-End Integration Suite (26 tests)
node scratch/test_mongodb_integration.js

# 2. Complete Lifecycle Suite: Uploads, Queries, 3-Phase Approvals & Certificate Generation (16 tests)
node scratch/test_full_lifecycle.js

# 3. Multi-Portal Authentication and Dashboard Visibility Verification (6 portals)
node scratch/test_all_portals.js
```

### Test Coverage Highlights
- **RBAC & Route Protection:** Verifies that unauthenticated users, enterprise applicants, and unauthorized departmental officers are strictly barred from restricted routes.
- **IDOR Safeguards:** Confirms that applicants cannot access documents, inspection schedules, or pipeline statuses belonging to other enterprises.
- **Input Validation:** Tests rejection of weak passwords, invalid 10-digit phone numbers, malformed GSTIN codes, empty ban reasons, and invalid decision enums.
- **End-to-End Pipeline Transition:** Proves that an industrial application progresses seamlessly through Phase 1 (Pollution Control Board) ➔ Phase 2 (Industrial Development Corporation, Factory Safety, and Fire Services) ➔ Phase 3 (State Innovation Society Apex Approval) ➔ Final Certificate Issuance.
- **Data Integrity:** All MongoDB models enforce unique indexes on emails, registration numbers, and application numbers.

---

## 🤖 Intelligent AI Clearance Subsystem (26-Section Blueprint)

Udyog Samyog embeds an enterprise-grade, deterministic-first AI Copilot and Operations Subsystem powered by **Google Gemini models** and a **Statutory Rules Kernel**. The subsystem runs in an isolated Python environment (`ai-service/.venv`), communicating with the Express portal via signed HMAC-SHA256 user context tokens and an automated **Circuit Breaker** with transparent statutory fallbacks.

### Architecture Overview
```
┌───────────────────────────┐            ┌────────────────────────────┐
│   Express Web Portal      │   HMAC     │    Python FastAPI Service  │
│   (Port 3000)             ├───────────►│    (Port 8000, .venv)      │
│   • UI Drawers & Modals   │◄───────────┤    • Statutory Rules Engine│
│   • Circuit Breaker       │   Tokens   │    • TF-IDF Vector KB      │
│   • Deterministic Fallback│            │    • Gemini Client         │
└───────────────────────────┘            └────────────────────────────┘
```

### Module Breakdown
- **Module A: Applicant Advisor & What-if Simulation:**
  - Evaluates enterprise investment (MSME Act 2020) and risk tiering (Green/Orange/Red).
  - Identifies all statutory clearances across 3 phases with clickable legal citations.
  - Interactive What-If simulation comparing capital/hazard changes.
- **Module B: Smart Form Assistant:**
  - Auto-fills form fields based on industrial sector benchmarks.
  - Pre-submission Completeness Checker with scoring (0.0 to 1.0) and missing blueprint alerts.
- **Module C: Document Intelligence:**
  - Multi-page PDF/image OCR parsing and key schema extraction (PAN, GSTIN, Plot Allotment).
  - Field-level confidence scores with color badges and mandatory Human Review Confirmation modal.
- **Module D: Officer Scrutiny Copilot:**
  - Executive Scrutiny Brief synthesizing investment, risk, and verified documents.
  - Checklist pre-verification with officer manual overrides.
  - Discrepancy detector (e.g. Red category without ETP blueprint).
  - 1-Click statutory Deficiency Notice drafter enforcing the legal 7-day cure window.
- **Module E: Prediction & Analytics:**
  - Machine learning timeline estimator bounded strictly within the Maharashtra Right to Services 45-day SLA ceiling.
  - Query risk predictor highlighting bottleneck risks prior to departmental dispatch.
- **Module F: Integrity & Anomaly Scanner:**
  - SHA-256 cryptographic hashing to detect duplicate uploads across applications.
  - Metadata tampering detection and statistical investment outliers.
  - Public Certificate Verification endpoint validating 64-character SHA-256 digital seals.
- **Module G: Grounded Conversational Assistant:**
  - Tri-lingual support (English, Marathi `mr`, Hindi `hi`).
  - Read-only guardrails with zero autonomous write actions.
  - Verified government policy citations on all answers.
- **Module H: Multilingual Accessibility:**
  - Native Marathi and Hindi language support across chat and advisor recommendations.
- **Module I: Operations Center & Admin Console (`ai-admin.html`):**
  - Live module emergency kill-switches with instantaneous portal sync.
  - Rules Engine & Knowledge Base inspector.
  - Model registry tracking prompt versions and latencies.
  - Real-time telemetry: Request volume, error rate, fallback rate, and p95 latency.

### Setup & Running the AI Subsystem
```bash
# 1. Navigate to AI service directory
cd ai-service

# 2. Activate isolated virtual environment
.\.venv\Scripts\Activate.ps1    # (or .\.venv\Scripts\activate.bat)

# 3. Install dependencies (if not already installed)
pip install -r requirements.txt

# 4. Launch FastAPI AI Service
python -m uvicorn app.main:app --port 8000 --host 127.0.0.1

# 5. Run Python Test Suite (23 test scenarios)
pytest tests/test_ai_service.py

# 6. Run AI Client & Circuit Breaker Integration Suite
node scratch/test_ai_portal_integration.js
```

---

## 🏛️ Government Compliance & Policy Adherence

- **Ease of Doing Business (EoDB):** Eliminates physical visits to government secretariats by providing end-to-end digital clearances.
- **Maharashtra Single Window Act:** Strictly enforces that specialized bodies scrutinize domain blueprints concurrently during Phase 2 before the Apex Authority issues the consolidated permit.
- **Right to Public Services:** Embeds Service Level Guarantees with automated breach detection to ensure timely delivery of government services.
- **Data Sovereignty & Scalability:** Operates with scalable MongoDB document storage, atomic operations, and role-scoped document vaults ensuring citizen and enterprise data remains secure.
- **Constitutional Due Process:** AI functions strictly as an advisory and scrutiny copilot. All decisions, approvals, and rejections are strictly executed by designated statutory government officers.

