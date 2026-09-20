"""
Authoritative Knowledge Base Corpus for Maharashtra Single Window Clearances
Grounded in official policy circulars, acts, and statutory rules.
"""
from typing import List, Dict, Any

KB_CHUNKS: List[Dict[str, Any]] = [
    {
        "id": "kb-mpcb-001",
        "doc_id": "mpcb-guidelines-2020",
        "title": "Maharashtra Pollution Control Board - Categorization & Consent Guidelines",
        "issuer": "Maharashtra Pollution Control Board (MPCB)",
        "section": "Clause 2.1: Consent to Establish (CTE) Requirements",
        "text": "Every industrial unit planning to establish a manufacturing or processing facility in Maharashtra must obtain a prior Consent to Establish (CTE) from MPCB under Section 25 of the Water Act 1974 and Section 21 of the Air Act 1981. Red category units require in-depth scrutiny and an Effluent Treatment Plant (ETP) with Zero Liquid Discharge or standard discharge compliance.",
        "lang": "en",
        "tags": ["mpcb", "environmental", "red", "orange", "green", "cte", "effluent"],
    },
    {
        "id": "kb-mpcb-002",
        "doc_id": "hazard-waste-rules-2016",
        "title": "Hazardous & Other Wastes (Management & Transboundary Movement) Rules",
        "issuer": "Ministry of Environment, Forest and Climate Change / MPCB",
        "section": "Rule 6: Grant of Authorization for Handling Hazardous Waste",
        "text": "Any facility generating, handling, storing, or disposing hazardous chemical waste must obtain specific authorization from MPCB and execute an agreement with a registered Common Hazardous Waste Treatment, Storage and Disposal Facility (CHWTSDF) in Maharashtra.",
        "lang": "en",
        "tags": ["mpcb", "hazardous", "chemical", "waste", "authorization"],
    },
    {
        "id": "kb-midc-001",
        "doc_id": "midc-dcr-2020",
        "title": "MIDC Development Control Regulations & Land Allotment Policy",
        "issuer": "Maharashtra Industrial Development Corporation (MIDC)",
        "section": "Regulation 4: Building Plan Approval and Setback Norms",
        "text": "All industrial structures within MIDC industrial estates or private industrial zones require formal building plan sanction. Front setbacks of at least 6 meters and side/rear setbacks of 4.5 meters are mandatory for plots up to 5 acres to ensure internal access for fire and rescue apparatus.",
        "lang": "en",
        "tags": ["midc", "civil", "setback", "building", "land", "zoning"],
    },
    {
        "id": "kb-dish-001",
        "doc_id": "factories-act-1948",
        "title": "Factories Act 1948 & Maharashtra Factories Rules 1963",
        "issuer": "Directorate of Industrial Safety & Health (DISH)",
        "section": "Section 6: Approval of Plans and Licensing of Factories",
        "text": "Before starting construction or expanding manufacturing operations employing 10 or more workers with power, detailed factory layout blueprints specifying machinery spacing, emergency escape routes, and ventilation must be submitted to DISH for formal safety sanction.",
        "lang": "en",
        "tags": ["dish", "factory", "machinery", "safety", "occupational"],
    },
    {
        "id": "kb-fire-001",
        "doc_id": "fire-act-2006",
        "title": "Maharashtra Fire Prevention and Life Safety Measures Act 2006",
        "issuer": "Directorate of Maharashtra Fire Services",
        "section": "Section 3 & Schedule II: Life Safety Clearance Certificate",
        "text": "Industrial units with built-up area exceeding 500 sqm or occupying plots larger than 1 acre must install dedicated fire hydrant rings, automatic sprinkler systems, and on-site static water storage tanks (minimum 100,000 liters for hazardous units) prior to receiving Provisional Fire NOC.",
        "lang": "en",
        "tags": ["fire", "life-safety", "hydrant", "water-tank", "noc"],
    },
    {
        "id": "kb-msins-001",
        "doc_id": "psi-2019",
        "title": "Package Scheme of Incentives (PSI 2019 / 2024)",
        "issuer": "Directorate of Industries, Maharashtra",
        "section": "Chapter 4: Capital Subsidy & Fiscal Incentives",
        "text": "Eligible Micro, Small, and Medium manufacturing units in Maharashtra can avail up to 40% to 80% capital subsidy on eligible fixed capital investment in plant and machinery, together with 100% exemption from Stamp Duty and Registration Fees on industrial land transfer.",
        "lang": "en",
        "tags": ["msins", "psi", "subsidy", "incentive", "stamp-duty", "msme"],
    },
    {
        "id": "kb-msins-002",
        "doc_id": "startup-policy-2024",
        "title": "Maharashtra State Innovative Startup Policy 2024",
        "issuer": "Maharashtra State Innovation Society (MSINS)",
        "section": "Section 3: Innovation Vouchers and Seed Funding",
        "text": "Innovative enterprises developing hardware, deep-tech, or clean energy prototypes are eligible for seed vouchers of up to ₹15 Lakhs for testing, standardisation, and laboratory compliance support from government-recognized incubators.",
        "lang": "en",
        "tags": ["incentives", "grant", "startup", "voucher", "msins", "seed"],
    },
    {
        "id": "kb-sla-001",
        "doc_id": "mrpsa-2015",
        "title": "Maharashtra Right to Public Services Act 2015",
        "issuer": "Government of Maharashtra",
        "section": "Statutory Service Level Guarantees (SLA)",
        "text": "All statutory clearance applications submitted through the Udyog Samyog single window portal are governed by legally binding timelines: 30 days for MPCB Environmental Consent, 21 days for simultaneous scrutiny by MIDC, DISH, and Fire, and 7 days for final consolidated Single-Window permit issuance.",
        "lang": "en",
        "tags": ["sla", "timeline", "right-to-services", "delay", "statutory"],
    },
]

KB_DOCUMENTS = KB_CHUNKS

