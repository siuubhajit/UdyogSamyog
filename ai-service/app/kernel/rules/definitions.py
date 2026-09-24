"""
Statutory Rules Definitions for Maharashtra Single Window System
Grounded in official state policies:
- Maharashtra Industrial Policy (2019 / 2024)
- Water (Prevention & Control of Pollution) Act 1974 & Air Act 1981
- Maharashtra Regional & Town Planning Act 1966 (MIDC Regulations)
- Factories Act 1948 & Maharashtra Factories Rules
- Maharashtra Fire Prevention and Life Safety Measures Act 2006
- MSMED Act 2020 Enterprise Classification
"""
from typing import List, Dict, Any

STATUTORY_RULES: List[Dict[str, Any]] = [
    # ── MPCB Clearances (Phase 1) ─────────────────────────
    {
        "id": "mpcb-cte-red",
        "rule_key": "mpcb_cte_red",
        "version": 1,
        "department": "Maharashtra Pollution Control Board",
        "task_dept": "mpcb",
        "phase": 1,
        "order": 1,
        "requires": "Consent to Establish (Red Category - Comprehensive Environmental Review)",
        "statutory_act": "Water (Prevention & Control of Pollution) Act 1974 & Air Act 1981",
        "when": {
            "any": [
                {"field": "hazardous", "op": "==", "value": True},
                {"field": "industry_category", "op": "in", "value": ["Chemicals", "Pharmaceuticals"]},
                {"field": "land_size", "op": ">", "value": 20.0},
                {"field": "water_use", "op": ">", "value": 100.0},
            ]
        },
        "documents": [
            "Water Balance Chart & Effluent Treatment Plant (ETP) Blueprint",
            "Manufacturing Process Flowsheet with Mass Balance",
            "Ambient Air Quality and Noise Attenuation Scheme",
        ],
        "reason_template": "High environmental pollution potential: hazardous process declared or major chemical/pharma sector or water demand > 100 KLD.",
        "source": {
            "doc": "MPCB Categorization of Industrial Sectors (CPCB Direction 2016 / MPCB Notification)",
            "section": "Schedule I (Red Category)",
            "url": "https://mpcb.gov.in",
            "last_verified": "2026-09",
        },
        "status": "active",
    },
    {
        "id": "mpcb-cte-orange",
        "rule_key": "mpcb_cte_orange",
        "version": 1,
        "department": "Maharashtra Pollution Control Board",
        "task_dept": "mpcb",
        "phase": 1,
        "order": 1,
        "requires": "Consent to Establish (Orange Category - Standard Environmental Review)",
        "statutory_act": "Water (Prevention & Control of Pollution) Act 1974 & Air Act 1981",
        "when": {
            "all": [
                {"field": "hazardous", "op": "==", "value": False},
                {
                    "any": [
                        {"field": "industry_category", "op": "in", "value": ["Food Processing", "Textile"]},
                        {"field": "land_size", "op": ">", "value": 5.0},
                        {"field": "water_use", "op": ">", "value": 30.0},
                        {"field": "electricity", "op": ">", "value": 350.0},
                    ]
                },
            ]
        },
        "documents": [
            "Effluent Treatment & Sewage Treatment Plant (STP) Scheme",
            "Process Flow Chart & Emission Control Specification",
        ],
        "reason_template": "Moderate environmental footprint: agro/food processing or textile activity or power load > 350 kVA.",
        "source": {
            "doc": "MPCB Categorization of Industrial Sectors",
            "section": "Schedule II (Orange Category)",
            "url": "https://mpcb.gov.in",
            "last_verified": "2026-09",
        },
        "status": "active",
    },
    {
        "id": "mpcb-cte-green",
        "rule_key": "mpcb_cte_green",
        "version": 1,
        "department": "Maharashtra Pollution Control Board",
        "task_dept": "mpcb",
        "phase": 1,
        "order": 1,
        "requires": "Consent to Establish (Green Category - Expedited Fast-Track Review)",
        "statutory_act": "Water (Prevention & Control of Pollution) Act 1974 & Air Act 1981",
        "when": {
            "all": [
                {"field": "hazardous", "op": "==", "value": False},
                {"field": "industry_category", "op": "in", "value": ["Light Engineering", "IT & Electronics", "Warehousing"]},
                {"field": "water_use", "op": "<=", "value": 30.0},
                {"field": "land_size", "op": "<=", "value": 5.0},
            ]
        },
        "documents": [
            "Standard Manufacturing Process Flowsheet",
            "Domestic Sewage Disposal Scheme",
        ],
        "reason_template": "Low pollution potential: engineering, electronics or warehousing operations with small environmental footprint.",
        "source": {
            "doc": "MPCB Categorization of Industrial Sectors",
            "section": "Schedule III (Green Category)",
            "url": "https://mpcb.gov.in",
            "last_verified": "2026-09",
        },
        "status": "active",
    },
    {
        "id": "mpcb-hazard-auth",
        "rule_key": "mpcb_hazard_auth",
        "version": 1,
        "department": "Maharashtra Pollution Control Board",
        "task_dept": "mpcb",
        "phase": 1,
        "order": 2,
        "requires": "Hazardous Waste Management & Handling Authorization",
        "statutory_act": "Hazardous and Other Wastes (Management & Transboundary Movement) Rules 2016",
        "when": {"field": "hazardous", "op": "==", "value": True},
        "documents": [
            "Hazardous Waste Manifest & Storage Plan",
            "Agreement with Common Hazardous Waste Treatment Facility (CHWTF)",
        ],
        "reason_template": "Enterprise generates, handles, or stores hazardous waste as declared in the project profile.",
        "source": {
            "doc": "Hazardous and Other Wastes Management Rules 2016",
            "section": "Rule 6 (Grant of Authorization)",
            "url": "https://mpcb.gov.in",
            "last_verified": "2026-09",
        },
        "status": "active",
    },

    # ── Phase 2 Clearances (Simultaneous Scrutiny) ───────
    {
        "id": "midc-civil-approval",
        "rule_key": "midc_civil_approval",
        "version": 1,
        "department": "Maharashtra Industrial Development Corporation",
        "task_dept": "midc",
        "phase": 2,
        "order": 1,
        "depends_on": ["mpcb_cte_red", "mpcb_cte_orange", "mpcb_cte_green"],
        "requires": "Building Plan & Industrial Land Use Sanction",
        "statutory_act": "Maharashtra Regional and Town Planning Act, 1966 & MIDC Development Control Regulations",
        "when": {"field": "land_size", "op": ">", "value": 0.0},
        "documents": [
            "Land Allotment Letter / Title Deed",
            "Site Master Plan & Layout Drawing with setbacks",
            "Licensed Architect & Structural Engineer Certificate",
        ],
        "reason_template": "Mandatory civil infrastructure and land zoning sanction for all industrial plots in Maharashtra.",
        "source": {
            "doc": "MIDC Development Control Regulations 2020",
            "section": "Regulation 4 (Building Permission Procedure)",
            "url": "https://midcindia.org",
            "last_verified": "2026-09",
        },
        "status": "active",
    },
    {
        "id": "dish-factory-safety",
        "rule_key": "dish_factory_safety",
        "version": 1,
        "department": "Directorate of Industrial Safety & Health",
        "task_dept": "dish",
        "phase": 2,
        "order": 2,
        "depends_on": ["mpcb_cte_red", "mpcb_cte_orange", "mpcb_cte_green"],
        "requires": "Factory Plan Approval & Occupational Safety Clearance",
        "statutory_act": "Factories Act, 1948 & Maharashtra Factories Rules 1963",
        "when": {
            "any": [
                {"field": "employment_potential", "op": ">=", "value": 10},
                {"field": "electricity", "op": ">", "value": 50.0},
                {"field": "hazardous", "op": "==", "value": True},
            ]
        },
        "documents": [
            "Factory Layout Blueprint showing Machinery Placement and Guarding",
            "List of Plant & Machinery with Power Ratings",
            "Ventilation, Lighting and Emergency Exits Specification",
        ],
        "reason_template": "Employs 10+ workers with power or declared high-power industrial machinery under Factories Act.",
        "source": {
            "doc": "Factories Act 1948",
            "section": "Section 6 (Approval, licensing and registration of factories)",
            "url": "https://dish.maharashtra.gov.in",
            "url": "https://industry.maharashtra.gov.in/",
            "last_verified": "2026-09",
        },
        "status": "active",
    },
    {
        "id": "fire-life-safety",
        "rule_key": "fire_life_safety",
        "version": 1,
        "department": "Directorate of Maharashtra Fire Services",
        "task_dept": "fire",
        "phase": 2,
        "order": 3,
        "depends_on": ["mpcb_cte_red", "mpcb_cte_orange", "mpcb_cte_green"],
        "requires": "Provisional Fire Safety Clearance Certificate (Life Safety NOC)",
        "statutory_act": "Maharashtra Fire Prevention and Life Safety Measures Act, 2006",
        "when": {
            "any": [
                {"field": "hazardous", "op": "==", "value": True},
                {"field": "land_size", "op": ">=", "value": 1.0},
                {"field": "industry_category", "op": "in", "value": ["Chemicals", "Pharmaceuticals", "Textile", "Warehousing"]},
            ]
        },
        "documents": [
            "Fire Hydrant Network & Static Water Reservoir Layout",
            "Evacuation Route, Exit Widths & Fire Compartmentation Plan",
            "Structural Fire Resistance Stability Certificate",
        ],
        "reason_template": "Industrial facility exceeding 1 acre or operating in fire-risk sectors (Chemicals, Textiles, Warehousing).",
        "source": {
            "doc": "Maharashtra Fire Prevention and Life Safety Measures Act 2006",
            "section": "Section 3 & Schedule II",
            "url": "https://mahafireservice.gov.in",
            "last_verified": "2026-09",
        },
        "status": "active",
    },

    # ── Phase 3 Clearances (Apex Authority) ──────────────
    {
        "id": "msins-single-window-permit",
        "rule_key": "msins_single_window_permit",
        "version": 1,
        "department": "Maharashtra State Innovation Society / Directorate of Industries",
        "task_dept": "msins",
        "phase": 3,
        "order": 1,
        "depends_on": ["midc_civil_approval", "dish_factory_safety", "fire_life_safety"],
        "requires": "Consolidated Single-Window Industrial Establishment Permit & Digital Certificate",
        "statutory_act": "Maharashtra Right to Public Services Act 2015",
        "when": {"field": "project_cost", "op": ">=", "value": 0.0},
        "documents": [
            "All Confirming Clearances from Phase 1 and Phase 2",
            "Statutory Undertaking and Identity Verification",
        ],
        "reason_template": "Final apex statutory integration step that issues the tamper-evident digital establishment permit.",
        "source": {
            "doc": "Maharashtra Single Window Clearance Policy",
            "section": "Government Resolution DI-2022/CR-88/IND-2",
            "url": "https://industries.maharashtra.gov.in",
            "url": "https://industry.maharashtra.gov.in/",
            "last_verified": "2026-09",
        },
        "status": "active",
    },
]

STATUTORY_SCHEMES: List[Dict[str, Any]] = [
    {
        "id": "scheme-psi-2019",
        "title": "Package Scheme of Incentives (PSI 2019 / 2024)",
        "department": "Directorate of Industries, Maharashtra",
        "benefits": "Up to 40% - 80% Capital Subsidy on Eligible Fixed Capital Investment, Stamp Duty & Registration Fee Exemption, Electricity Duty Exemption for 7 to 10 years.",
        "eligibility": "Applicable for Micro, Small, Medium and Large manufacturing enterprises setting up units in developing talukas (B, C, D, D+ zones) of Maharashtra.",
        "when": {"field": "project_cost", "op": ">=", "value": 0.5},
        "source": {
            "doc": "Government of Maharashtra Industry Department GR No. PSI-2019/CR-46/IND-8",
            "section": "Section 4.1 & Annexure B",
            "url": "https://industries.maharashtra.gov.in",
            "url": "https://industry.maharashtra.gov.in/",
            "last_verified": "2026-09",
        },
    },
    {
        "id": "scheme-msins-seed-grant",
        "title": "Maharashtra State Innovation Society Startup Innovation Voucher & Seed Grant",
        "department": "Maharashtra State Innovation Society",
        "benefits": "Direct financial grant of up to ₹15 Lakhs for rapid prototyping, patent filing, testing, and regulatory conformity assessment.",
        "eligibility": "Innovative MSMEs and DPIIT-recognized startups incorporated within the last 10 years and registered in Maharashtra.",
        "when": {
            "all": [
                {"field": "project_cost", "op": "<=", "value": 15.0},
                {"field": "industry_category", "op": "in", "value": ["IT & Electronics", "Light Engineering", "Pharmaceuticals", "Food Processing"]},
            ]
        },
        "source": {
            "doc": "Maharashtra State Innovative Startup Policy 2018/2024",
            "section": "Clause 3.2 (Financial Assistance for Innovation)",
            "url": "https://msins.in",
            "last_verified": "2026-09",
        },
    },
    {
        "id": "scheme-electricity-duty-waiver",
        "title": "Industrial Electricity Duty & Green Power Waiver",
        "department": "Energy Department, Government of Maharashtra",
        "benefits": "100% complete waiver of statutory electricity duty on commercial tariff for 7 years (Micro/Small) or 10 years (Medium/Large).",
        "eligibility": "New manufacturing industrial units drawing high-tension or low-tension power from Maharashtra State Electricity Distribution Company (MSEDCL).",
        "when": {"field": "electricity", "op": ">=", "value": 20.0},
        "source": {
            "doc": "Maharashtra Electricity Duty Act 2016",
            "section": "Section 5B (Exemption for New Industrial Units)",
            "url": "https://energy.maharashtra.gov.in",
            "last_verified": "2026-09",
        },
    },
    {
        "id": "scheme-interest-subvention",
        "title": "Working Capital & Modernization Interest Subvention Scheme",
        "department": "Department of Skills, Employment & Entrepreneurship",
        "benefits": "5% interest subsidy on bank term loans for advanced automated machinery and cleaner production technologies.",
        "eligibility": "Micro and Small enterprises holding valid Udyam Registration Certificate and establishing industrial operations in Maharashtra.",
        "when": {"field": "project_cost", "op": "<=", "value": 10.0},
        "source": {
            "doc": "Directorate of Industries Financial Assistance Guidelines",
            "section": "Chapter 6 (Interest Subsidy)",
            "url": "https://industries.maharashtra.gov.in",
            "url": "https://industry.maharashtra.gov.in/",
            "last_verified": "2026-09",
        },
    },
]

