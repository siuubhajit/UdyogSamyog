# 🏛️ उद्योग संयोग | Udyog Samyog

### Maharashtra Single Window Industrial Approvals, Compliance Processes, and Government Support Portal

**Problem Statement ID:** 26130  
**Organization:** Government of Maharashtra  
**Department:** Maharashtra State Innovation Society, Department of Skills, Employment, Entrepreneurship and Innovation  
**Live Portal:** `http://localhost:3000`

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
- **Unique Serial Identification:** Serialized certificate numbering format (e.g., `CERT/MH/IND/1/2026`).
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
- **Nodemailer Gmail SMTP Integration:** Full support for Google Gmail App Passwords with strict socket and connection timeouts (4,000ms connection, 4,000ms greeting, 5,000ms socket timeout) preventing server hangs.
- **Resilient Development Fallback:** Automatic local fallback mode (`fallback_console`) logs verification codes to stdout and displays accessible helper pills for offline development and local evaluation.
- **Test Domain Bypass:** Automated test suites using test domains (`testcorp.in`, `hi2.in`, `example.com`) generate instant mock OTPs without invoking outbound networks.
- **Password Complexity Standards:** Alphanumeric, minimum 8 characters, at least one special symbol (`@`, `#`, `$`, `%`, etc.) verified via interactive live UI checklists and backend validation.
- **Duplicate Prevention:** Strict database uniqueness checks on official email addresses, 10-digit Indian mobile numbers (starting with 6, 7, 8, or 9), and 15-character GSTIN registration codes.
- **Role-Based Access Control (RBAC):** Middleware guards (`auth`, `official`) protect administrative endpoints. Applicants cannot access official consoles; official users cannot spawn clearance applications.
- **Zero SQL Injection:** 100% parameterized SQL prepared statements using Node.js built-in `node:sqlite` engine.
- **Zero Statutory Abbreviations:** Strict adherence to full statutory terminology across all user interfaces, database tables, and system logs.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js:** Version 20 or later (uses Node's native `node:sqlite` module; zero external C++ compiler tools or Python build dependencies required).

### Installation & Launch

```bash
# 1. Clone or navigate to the project directory
cd "Udyog Samyog"

# 2. Install dependencies
npm install

# 3. Start the application
npm start
```

The server will initialize the SQLite database, apply migrations, seed evaluation accounts, and begin listening on **`http://localhost:3000`**.

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

```
Udyog Samyog/
├── server.js                          # Express server, SQLite database, RBAC middleware, and 33 API routes
├── package.json                       # Project configuration and dependencies
├── .env                               # Optional Gmail SMTP environment variables
├── data/
│   └── udyog-samyog.db               # SQLite database with foreign keys enabled
├── uploads/                           # Storage directory for statutory blueprints and revised compliance files
├── public/
│   ├── index.html                     # Government of Maharashtra Single-Window Landing Page
│   ├── css/
│   │   └── style.css                  # State government theme, responsive layouts, badges, and modal styles
│   ├── js/
│   │   ├── common.js                  # Shared fetch wrapper, navigation guards, and dashboard URL resolver
│   │   ├── auth.js                    # Authentication controller, OTP timer, live complexity, Gmail config modal
│   │   ├── applicant-workflow.js      # Enterprise applicant workflow card and multi-agency clearance matrix
│   │   ├── officer-msins.js           # Apex Officer controller: search console, registry, banning, PSI calculator
│   │   ├── officer-midc.js            # Civil Officer controller: cluster zoning, setbacks, site blueprints
│   │   ├── officer-mpcb.js            # Environmental Officer controller: risk tiering, effluent, Consent to Establish
│   │   ├── officer-dish.js            # Factory Safety Officer controller: machinery layout, chemical hazard review
│   │   └── officer-fire.js            # Fire Services Officer controller: hydrant network, reservoir checks
│   └── pages/
│       ├── login.html                 # State Innovation Society gateway: login, register with OTP, forgot password
│       ├── applicant-dashboard.html   # Enterprise applicant portal, active applications, alerts, query inbox
│       ├── application.html           # 4-step clearance application wizard with dynamic Regulatory Knowledge Engine
│       ├── tracker.html               # Real-time multi-department clearance tracker, query reply, certificate view
│       ├── verification.html          # Split-screen dossier scrutiny console with embedded browser PDF inspector
│       ├── analytics.html             # Service Level Guarantee intelligence, bottleneck analysis, district heatmap
│       ├── reset-password.html        # Secure password reset page with token/OTP validation
│       ├── officer-dashboard.html     # Unified officer routing gateway
│       ├── officer-dashboard-msins.html# Maharashtra State Innovation Society Apex Authority Console
│       ├── officer-dashboard-midc.html # Maharashtra Industrial Development Corporation Civil Console
│       ├── officer-dashboard-mpcb.html # Maharashtra Pollution Control Board Environmental Console
│       ├── officer-dashboard-dish.html # Directorate of Industrial Safety and Health Safety Console
│       └── officer-dashboard-fire.html # Directorate of Maharashtra Fire Services Safety Console
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
| `POST` | `/api/applications/:id/stage-decision` | Official | Records departmental decision (`Approved`, `Rejected`, `Query`) and drives transitions |
| `GET` | `/api/applications/:id/pipeline` | Authenticated | Retrieves live 3-phase pipeline milestone statuses (ownership enforced) |
| `PATCH` | `/api/applications/:id/status` | Official (Apex) | Grants final consolidated approval or halts pipeline |

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
| `GET` | `/api/applications/:id/certificate` | Authenticated | Retrieves official digital clearance certificate with SHA-256 hash |
| `GET` | `/api/schemes/eligible` | Authenticated | Returns eligible Maharashtra state incentive packages |
| `GET` | `/api/analytics/summary` | Authenticated | Returns Service Level Guarantee compliance rates and district intelligence |

---

## 🧪 Automated Testing & Verification

The project includes four automated verification suites:

```bash
# 1. Endpoint Security, RBAC & Logic Suite (24 tests)
node scratch/test_all_endpoints_security_logic.js

# 2. Registration, Authentication & OTP Lifecycle Suite (18 tests)
node scratch/test_auth_lifecycle.js

# 3. End-to-End 3-Phase Statutory Clearance Workflow (7 steps)
node scratch/test_streamlined_workflow.js

# 4. Zero Statutory Abbreviations Audit
node scratch/verify_zero_abbr.js
```

### Test Coverage Highlights
- **RBAC & Route Protection:** Verifies that unauthenticated users, enterprise applicants, and unauthorized departmental officers are strictly barred from restricted routes.
- **IDOR Safeguards:** Confirms that applicants cannot access documents, inspection schedules, or pipeline statuses belonging to other enterprises.
- **Input Validation:** Tests rejection of weak passwords, invalid 10-digit phone numbers, malformed GSTIN codes, empty ban reasons, and invalid decision enums.
- **End-to-End Pipeline Transition:** Proves that an industrial application progresses seamlessly through Phase 1 (Pollution Control Board) ➔ Phase 2 (Industrial Development Corporation, Factory Safety, and Fire Services) ➔ Phase 3 (State Innovation Society Apex Approval) ➔ Final Certificate Issuance.
- **Database Cleanliness:** All test suites automatically purge temporary test records upon completion, leaving the production SQLite database clean.

---

## 🏛️ Government Compliance & Policy Adherence

- **Ease of Doing Business (EoDB):** Eliminates physical visits to government secretariats by providing end-to-end digital clearances.
- **Maharashtra Single Window Act:** Strictly enforces that specialized bodies scrutinize domain blueprints concurrently during Phase 2 before the Apex Authority issues the consolidated permit.
- **Right to Public Services:** Embeds Service Level Guarantees with automated breach detection to ensure timely delivery of government services.
- **Data Sovereignty:** Operates with embedded local SQLite storage, prepared statements, and role-scoped document vaults ensuring citizen and enterprise data remains secure.
