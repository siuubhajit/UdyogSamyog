# उद्योग संयोग | Udyog Samyog

### Streamlining Industrial Approvals, Compliance Processes, and Access to Government Support Services

**Problem Statement ID:** 26130  
**Organization:** Government of Maharashtra  
**Department:** Maharashtra State Innovation Society, Department of Skills, Employment, Entrepreneurship and Innovation

---

## Overview

**Udyog Samyog (उद्योग संयोग)** is a unified, intelligent single-window approval and compliance management portal designed for the Government of Maharashtra. It streamlines the end-to-end industrial journey for entrepreneurs by synchronizing domain scrutiny across specialized departments (Maharashtra Industrial Development Corporation, Maharashtra Pollution Control Board, Maharashtra Fire Services, and Directorate of Industrial Safety & Health) into an apex dossier managed by the **Lead Approving Officer (State Innovation Society / Industries Apex Authority)**.

### Key Features & Enhancements

1. **Multi-Department Scrutiny Division**:
   - **Industrial Development Corporation (Civil & Infrastructure)**: Site layout plans, building setbacks, zoning, and civil access.
   - **Pollution Control Board (Environmental)**: Consent to Establish, effluent treatment scheme, air emission safeguards.
   - **Maharashtra Fire Services**: Hydrant layout, static water reservoir, emergency egress, life safety clearance.
   - **Directorate of Industrial Safety & Health (Factory Safety)**: Factory blueprints, machinery layout, guarding, and worker safety under the Factories Act.
   - **Consolidated Apex Dossier**: All departmental clearances streamline directly to the **Lead Approving Officer (State Innovation Society / Industries Apex Authority)** who alone possesses statutory authority for final single-window clearance and sanction issuance.

2. **Enterprise Account Management & Statutory Banning**:
   - The Apex Approving Officer has directorial authority to inspect all registered enterprises, audit their submissions, and blacklist/ban any company from future licenses and approvals with statutory justification.
   - Blacklisted enterprises are barred from submitting new applications (`POST /api/applications` returns 403) and display a permanent warning banner.

3. **Strict Password Policy & Matching Security**:
   - Enforced password complexity: **alphanumeric + minimum 8 characters + at least one special symbol** (`@`, `#`, `$`, `%`, etc.).
   - Interactive live validation checklist and mandatory **Confirm Password** fields on both Registration and Password Reset.

4. **Gmail OTP Dispatch with Development Fallback**:
   - Two-factor OTP verification for registration and password reset via `nodemailer`.
   - Configure live Gmail credentials (`GMAIL_USER` and `GMAIL_APP_PASSWORD`) in the UI or environment.
   - Automatic development fallback logs OTPs to stdout and displays a clickable helper pill for friction-free evaluation.

5. **Interactive Document Vault & Inline Inspector**:
   - Government officials can inspect, verify, and flag submitted blueprints and documents directly inside the web browser with zero download friction.

6. **Automated Risk-Based Scrutiny & Incentives Engine**:
   - Dynamic classification into Green, Orange, and Red tiers.
   - Direct pairing with the Package Scheme of Incentives, State Innovation Grants (up to ₹15 Lakhs), and power tariff waivers.

7. **Verifiable Digital License Vault**:
   - Generates official Maharashtra Consolidated Industrial Clearance Certificates with QR verification and SHA-256 digital signature hash upon apex approval.

---

## Quick Start

### 1. Requirements

- Node.js 20+ (uses Node 24's built-in `node:sqlite` engine; zero native C++ compiler tools or Python required).

### 2. Installation & Run

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Open **`http://localhost:3000`** in your browser.

---

## Evaluation Demo Accounts (1-Click Autofill Available on Login Page)

All seeded accounts satisfy the strict password policy (minimum 8 characters, alphanumeric, special symbol `#`):

| Role                                                                    | Email                           | Password         | Organization / Department                 |
| ----------------------------------------------------------------------- | ------------------------------- | ---------------- | ----------------------------------------- |
| **Lead Approving Officer (State Innovation Society / Industries Apex)** | `officer@udyog.gov.in`          | `Officer@123#`   | Maharashtra State Innovation Society      |
| **Industrial Development (Civil & Infrastructure)**                     | `midc.officer@udyog.gov.in`     | `Midc@123#`      | Industrial Development Civil Wing         |
| **Pollution Control Board (Environmental)**                             | `mpcb.officer@udyog.gov.in`     | `Mpcb@123#`      | Maharashtra Pollution Control Board       |
| **Maharashtra Fire Services**                                           | `fire.officer@udyog.gov.in`     | `Fire@123#`      | Directorate of Maharashtra Fire Services  |
| **Industrial Safety & Health (Factory Safety)**                         | `dish.officer@udyog.gov.in`     | `Dish@123#`      | Directorate of Industrial Safety & Health |
| **Enterprise Applicant**                                                | `entrepreneur@mahindra-auto.in` | `Applicant@123#` | Sahyadri Precision Engineering Pvt Ltd    |

---

## Project Structure

- `server.js` - Express backend with built-in SQLite (`DatabaseSync`), Nodemailer OTP dispatch, password complexity validation, role-based departmental milestone updates, and apex enterprise management.
- `public/pages/login.html` - Maharashtra State Innovation Society gateway with tabbed Sign In, Registration with OTP, Password Reset, and Gmail configuration modal.
- `public/pages/officer-dashboard.html` - Government scrutiny queue, SLA countdowns, and Enterprise Registry & Banning console for Apex Officer.
- `public/pages/verification.html` - Split-screen scrutiny console with embedded PDF viewer, domain-specific departmental clearance actions, and apex consolidated clearance panel.
- `public/pages/application.html` - Multi-step smart application wizard with real-time Regulatory Knowledge Engine and blacklist protection.
- `public/pages/applicant-dashboard.html` - Enterprise dashboard with live status cards, blacklist notice, and query alert banners.
- `public/pages/tracker.html` - Real-time parallel departmental approval tracker, query reply console, and printable digital clearance certificate.
- `public/pages/analytics.html` - Department intelligence, SLA compliance rates, and Maharashtra district clearance heatmap.
- `public/css/style.css` - State Government theme with responsive layouts, accessible typography, and status badges.
