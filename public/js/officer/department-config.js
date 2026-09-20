/**
 * Department Configurations for Consolidated Officer Workspace
 * MPCB, MIDC, DISH, FIRE
 */

const DEPARTMENT_CONFIG = {
  mpcb: {
    deptCode: "mpcb",
    name: "Maharashtra Pollution Control Board",
    shortName: "MPCB",
    title: "Environmental Clearance Console",
    phase: "Phase 1 Gateway",
    badgeClass: "emerald",
    accentColor: "#059669",
    planType: "environmental_plan",
    planLabel: "Environmental Management Plan",
    defaultApprovalRemark: "Consent to Establish granted under Water & Air Pollution Control Acts.",
    filterType: "category",
    filterTitle: "Pollution Categories",
    filterOptions: [
      { id: "all", label: "All Categories" },
      { id: "Red", label: "🔴 Red Category (High)" },
      { id: "Orange", label: "🟠 Orange Category (Medium)" },
      { id: "Green", label: "🟢 Green Category (Low)" },
      { id: "White", label: "⚪ White Category (Exempt)" }
    ],
    checklist: [
      "Environmental Management Plan (EMP) verified",
      "Effluent Treatment Plant (ETP) capacity & sizing verified",
      "Hazardous waste storage & disposal arrangement verified",
      "Air emission controls & stack height standards verified"
    ],
    calculator: "effluent",
    calculatorTitle: "Effluent Treatment & Air Dispersion Calculator",
    calculatorSub: "Estimate required ETP hydraulic capacity (KLD) and statutory SO2 stack height standards."
  },

  midc: {
    deptCode: "midc",
    name: "Maharashtra Industrial Development Corporation",
    shortName: "MIDC",
    title: "Civil Infrastructure & Building Plan Console",
    phase: "Phase 2 Simultaneous",
    badgeClass: "navy",
    accentColor: "#2563eb",
    planType: "civil_plan",
    planLabel: "Civil & Architectural Plan",
    defaultApprovalRemark: "Civil Infrastructure & Building Plan sanction granted under Development Control Regulations.",
    filterType: "zone",
    filterTitle: "Industrial Clusters",
    filterOptions: [
      { id: "all", label: "All Maharashtra" },
      { id: "Chakan", label: "Chakan (Pune)" },
      { id: "Ranjangaon", label: "Ranjangaon (Pune)" },
      { id: "Butibori", label: "Butibori (Nagpur)" },
      { id: "Taloja", label: "Taloja (Raigad)" },
      { id: "Waluj", label: "Waluj (Sambhajinagar)" }
    ],
    checklist: [
      "Civil site layout and boundary setbacks verified",
      "Floor Space Index (FSI / FAR) within statutory 1.0 limit",
      "Internal arterial roads and heavy vehicle turning radii verified",
      "Stormwater drainage, rainwater harvesting, and utility ties verified"
    ],
    calculator: "fsi",
    calculatorTitle: "Floor Space Index (FSI) & Coverage Calculator",
    calculatorSub: "Verify architectural floor space index, ground coverage, and required marginal setbacks."
  },

  dish: {
    deptCode: "dish",
    name: "Directorate of Industrial Safety & Health",
    shortName: "DISH",
    title: "Factory Safety & Occupational Health Console",
    phase: "Phase 2 Simultaneous",
    badgeClass: "saffron",
    accentColor: "#d97706",
    planType: "factory_safety_plan",
    planLabel: "Factory Safety Blueprint",
    defaultApprovalRemark: "Factory Safety Blueprint approved under the Factories Act 1948.",
    filterType: "hazard",
    filterTitle: "Hazard Classifications",
    filterOptions: [
      { id: "all", label: "All Hazard Levels" },
      { id: "Chemical Hazard", label: "☣️ Chemical Hazard" },
      { id: "Mechanical Hazard", label: "⚙️ Mechanical Hazard" },
      { id: "High-temperature", label: "🔥 Thermal Hazard" },
      { id: "General Industrial", label: "📦 General Industrial" }
    ],
    checklist: [
      "Machinery layout and machine guarding distances verified",
      "Chemical and hazardous material containment secondary bunds verified",
      "Worker air space (minimum 14.2 m³ per shift worker) verified",
      "Emergency panic hardware, exit doors, and muster stations verified"
    ],
    calculator: "workers",
    calculatorTitle: "Factory Ventilation & Worker Air Space Calculator",
    calculatorSub: "Compute factory floor volumetric capacity under Section 16 of the Factories Act 1948."
  },

  fire: {
    deptCode: "fire",
    name: "Directorate of Maharashtra Fire Services",
    shortName: "Fire Services",
    title: "Fire Prevention & Life Safety Clearance Console",
    phase: "Phase 2 Simultaneous",
    badgeClass: "ruby",
    accentColor: "#dc2626",
    planType: "fire_safety_plan",
    planLabel: "Fire Safety & Hydrant Layout",
    defaultApprovalRemark: "Provisional Fire Safety Clearance Certificate issued under Maharashtra Fire Act.",
    filterType: "fire_risk",
    filterTitle: "Fire Hazard Risk",
    filterOptions: [
      { id: "all", label: "All Fire Classes" },
      { id: "high", label: "🔴 High Fire Hazard" },
      { id: "medium", label: "🟠 Medium Fire Hazard" },
      { id: "low", label: "🟢 Low Fire Hazard" }
    ],
    checklist: [
      "Ring-main fire hydrant network and landing valves verified",
      "Dedicated static underground water storage reservoir sized properly",
      "Fire pump rating (minimum 2280 LPM @ 7 bar) and standby diesel pump verified",
      "6-meter all-round clear perimeter access for fire brigade tenders verified"
    ],
    calculator: "fireWater",
    calculatorTitle: "Fire Water Storage & Hydrant Pump Sizing Calculator",
    calculatorSub: "Compute statutory underground static reservoir capacity and fire pump ratings."
  }
};

if (typeof window !== "undefined") {
  window.DEPARTMENT_CONFIG = DEPARTMENT_CONFIG;
}

