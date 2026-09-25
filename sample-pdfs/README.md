# UdyogSamyog — Statutory Department Sample PDFs

This directory contains official sample blueprint templates and statutory compliance reference documents for each department under the **Government of Maharashtra Single-Window Clearance System (UdyogSamyog)**.

Applicants may download, inspect, and use these standardized documents as reference layouts when preparing statutory submissions.

---

## Included Sample Documents

| File Name | Department | Statutory Regulation | Purpose |
|:---|:---|:---|:---|
| `MPCB_Environmental_Management_Plan_Sample.pdf` | **MPCB** (Maharashtra Pollution Control Board) | *Water Act 1974 & Air Act 1981* | Environmental Management Plan (EMP), Zero Liquid Discharge (ZLD), and ETP treatment flow scheme. |
| `MIDC_Site_Master_Layout_Blueprint_Sample.pdf` | **MIDC** (Maharashtra Industrial Development Corp) | *MIDC DCR 2023 & IS 456:2000* | Industrial Plot Master Site Layout, building setbacks, road circulation, and green belt zoning. |
| `DISH_Factory_Safety_Hazard_Control_Sample.pdf` | **DISH** (Directorate of Industrial Safety & Health) | *The Factories Act 1948 & MFR 1963* | Factory Safety Layout, machinery isolation guards, occupational health, and hazardous chemical spill containment. |
| `FIRE_Hydrant_Evacuation_Scheme_Sample.pdf` | **FIRE** (Maharashtra Fire Services Directorate) | *Maharashtra Fire Act 2006 & NBC Part IV* | Provisional Fire Safety clearance, wet riser hydrant ring-main, static water reservoir, and life evacuation plan. |
| `MIDC_Land_Allotment_Deed_Sample.pdf` | **MIDC / Land Revenue** | *MIDC Estates & Land Disposal Regulations* | Formal industrial plot allotment order and registered 95-year statutory lease deed. |
| `MSINS_Project_Feasibility_Report_DPR_Sample.pdf` | **MSINS / Single Window Directorate** | *Maharashtra Industrial Policy 2019-2024* | Detailed Project Report (DPR), fixed capital outlay breakdown, and local employment creation metrics. |

---

## Technical Specifications
- **Format:** Adobe PDF `%PDF-1.4` compliant binary structure with valid cross-reference tables (`xref`).
- **Typography:** Standard PostScript Type1 Helvetica / Helvetica-Bold fonts compatible with all desktop, mobile, and web PDF rendering engines.
- **Access Route:** Statically served at `/sample-pdfs/<filename>` from the web application.
- **Regeneration:** Run `npm run generate-samples` to regenerate all sample templates.
