const fs = require('fs');
const path = require('path');

function escapePdfText(t) {
  return String(t).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildStatutoryPdf({
  deptCode,
  deptName,
  portalSub,
  title,
  docNo,
  themeColor, // [r, g, b] (0..1)
  sections
}) {
  let stream = '';

  // Top header banner background
  const [r, g, b] = themeColor;
  stream += `${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} rg\n`;
  stream += `0 710 612 82 re f\n`;

  // Gold accent line under header
  stream += `0.85 0.55 0.13 rg\n`;
  stream += `0 706 612 4 re f\n`;

  // Top header text
  stream += `BT\n`;
  stream += `/F2 13 Tf\n`;
  stream += `1 1 1 rg\n`;
  stream += `40 762 Td\n`;
  stream += `(GOVERNMENT OF MAHARASHTRA · ${escapePdfText(deptName.toUpperCase())}) Tj\n`;
  stream += `/F1 9 Tf\n`;
  stream += `0 -17 Td\n`;
  stream += `(${escapePdfText(portalSub)}) Tj\n`;
  stream += `/F2 11 Tf\n`;
  stream += `0 -18 Td\n`;
  stream += `(${escapePdfText(title)}) Tj\n`;
  stream += `ET\n`;

  // Right-aligned reference box
  stream += `BT\n`;
  stream += `/F2 8 Tf\n`;
  stream += `1 1 1 rg\n`;
  stream += `440 762 Td\n`;
  stream += `(STATUTORY TEMPLATE) Tj\n`;
  stream += `/F1 8 Tf\n`;
  stream += `0 -14 Td\n`;
  stream += `(REF: ${escapePdfText(docNo)}) Tj\n`;
  stream += `0 -13 Td\n`;
  stream += `(MAHARASHTRA EoDB 2026) Tj\n`;
  stream += `ET\n`;

  // Body content sections
  let currentY = 675;
  for (const sec of sections) {
    // Section box header
    stream += `0.93 0.95 0.98 rg\n`;
    stream += `40 ${currentY - 18} 532 20 re f\n`;
    stream += `0.7 0.75 0.85 RG 0.75 w\n`;
    stream += `40 ${currentY - 18} 532 20 re S\n`;

    // Section title
    stream += `BT\n`;
    stream += `/F2 9.5 Tf\n`;
    stream += `${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} rg\n`;
    stream += `48 ${currentY - 13} Td\n`;
    stream += `(${escapePdfText(sec.heading)}) Tj\n`;
    stream += `ET\n`;

    currentY -= 28;

    for (const item of sec.items) {
      if (item.type === 'keyval') {
        stream += `BT\n`;
        stream += `/F2 8.5 Tf\n`;
        stream += `0.15 0.2 0.3 rg\n`;
        stream += `50 ${currentY} Td\n`;
        stream += `(${escapePdfText(item.label)}:) Tj\n`;
        stream += `/F1 8.5 Tf\n`;
        stream += `0.2 0.25 0.25 rg\n`;
        stream += `150 0 Td\n`;
        stream += `(${escapePdfText(item.val)}) Tj\n`;
        stream += `ET\n`;
        currentY -= 13;
      } else if (item.type === 'bullet') {
        stream += `BT\n`;
        stream += `/F1 8 Tf\n`;
        stream += `0.2 0.2 0.2 rg\n`;
        stream += `50 ${currentY} Td\n`;
        stream += `(· ${escapePdfText(item.text)}) Tj\n`;
        stream += `ET\n`;
        currentY -= 12;
      }
    }
    currentY -= 8;
  }

  // Official Stamp / Certification Box
  stream += `0.96 0.98 0.96 rg\n`;
  stream += `40 45 532 40 re f\n`;
  stream += `0.2 0.6 0.3 RG 1 w\n`;
  stream += `40 45 532 40 re S\n`;
  stream += `BT\n`;
  stream += `/F2 8 Tf\n`;
  stream += `0.1 0.45 0.2 rg\n`;
  stream += `50 72 Td\n`;
  stream += `([VERIFIED STATUTORY BLUEPRINT TEMPLATE - MAHARASHTRA RIGHT TO SERVICES ACT]) Tj\n`;
  stream += `/F1 7.5 Tf\n`;
  stream += `0.25 0.3 0.3 rg\n`;
  stream += `0 -12 Td\n`;
  stream += `(Applicants may use this statutory layout template as a standardized reference when preparing department submissions.) Tj\n`;
  stream += `0 -10 Td\n`;
  stream += `(All specifications comply with Maharashtra Industrial Development & Single-Window Clearance Regulations 2026.) Tj\n`;
  stream += `ET\n`;

  // Footer bar
  stream += `0.92 0.94 0.96 rg\n`;
  stream += `0 0 612 32 re f\n`;
  stream += `0.7 0.75 0.8 RG 0.5 w\n`;
  stream += `0 32 612 0.5 re S\n`;
  stream += `BT\n`;
  stream += `/F1 7.5 Tf\n`;
  stream += `0.35 0.4 0.45 rg\n`;
  stream += `40 12 Td\n`;
  stream += `(UdyogSamyog Single Window Portal · Maharashtra Industrial Development · Statutory Template ID: ${escapePdfText(docNo)}) Tj\n`;
  stream += `380 0 Td\n`;
  stream += `(Official Public Document · Page 1 of 1) Tj\n`;
  stream += `ET\n`;

  const streamBuf = Buffer.from(stream, 'utf8');

  // Objects
  const obj1 = '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n';
  const obj2 = '2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n';
  const obj3 = '3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 5 0 R/F2 6 0 R>>>>/Contents 4 0 R>>\nendobj\n';
  const obj4Header = `4 0 obj\n<</Length ${streamBuf.length}>>\nstream\n`;
  const obj4Footer = '\nendstream\nendobj\n';
  const obj5 = '5 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>\nendobj\n';
  const obj6 = '6 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>\nendobj\n';

  const head = Buffer.from('%PDF-1.4\n', 'utf8');
  const b1 = Buffer.from(obj1, 'utf8');
  const b2 = Buffer.from(obj2, 'utf8');
  const b3 = Buffer.from(obj3, 'utf8');
  const b4h = Buffer.from(obj4Header, 'utf8');
  const b4f = Buffer.from(obj4Footer, 'utf8');
  const b5 = Buffer.from(obj5, 'utf8');
  const b6 = Buffer.from(obj6, 'utf8');

  const o1 = head.length;
  const o2 = o1 + b1.length;
  const o3 = o2 + b2.length;
  const o4 = o3 + b3.length;
  const o5 = o4 + b4h.length + streamBuf.length + b4f.length;
  const o6 = o5 + b5.length;
  const xrefOffset = o6 + b6.length;

  function pad(n) {
    return String(n).padStart(10, '0');
  }

  const xref = 'xref\n0 7\n' +
    '0000000000 65535 f \n' +
    pad(o1) + ' 00000 n \n' +
    pad(o2) + ' 00000 n \n' +
    pad(o3) + ' 00000 n \n' +
    pad(o4) + ' 00000 n \n' +
    pad(o5) + ' 00000 n \n' +
    pad(o6) + ' 00000 n \n' +
    `trailer\n<</Size 7/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const xBuf = Buffer.from(xref, 'utf8');
  return Buffer.concat([head, b1, b2, b3, b4h, streamBuf, b4f, b5, b6, xBuf]);
}

const sampleDefs = [
  // 1. MPCB Sample
  {
    fileName: 'MPCB_Environmental_Management_Plan_Sample.pdf',
    deptCode: 'MPCB',
    deptName: 'Maharashtra Pollution Control Board',
    portalSub: 'Water (Prevention & Control of Pollution) Act 1974 · Air Act 1981 Compliance',
    title: 'Statutory Environmental Management Plan (EMP) & ETP Scheme',
    docNo: 'MH-MPCB-EMP-2026-SMP',
    themeColor: [0.08, 0.40, 0.20], // Forest Green
    sections: [
      {
        heading: '1. Industrial Classification & Pollution Categorization',
        items: [
          { type: 'keyval', label: 'Pollution Category', val: 'RED / ORANGE (Manufacturing & Chemical Processing)' },
          { type: 'keyval', label: 'Gross Capital Investment', val: 'INR 45.00 Crores (Plant, Land & Machinery)' },
          { type: 'keyval', label: 'Water Requirement', val: '75.00 Kilo-Litres / Day (KLPD) via MIDC Supply' },
          { type: 'keyval', label: 'Industrial Effluent', val: '45.00 KLPD (Treated via Onsite ETP to Zero Discharge)' }
        ]
      },
      {
        heading: '2. Effluent Treatment Plant (ETP) & Zero Liquid Discharge Specifications',
        items: [
          { type: 'bullet', text: 'Primary Treatment: Oil & Grease Trap, Equalization Tank with pH dosing system (pH 6.5 - 8.5)' },
          { type: 'bullet', text: 'Secondary Treatment: Extended Aeration Activated Sludge system, Secondary Clarifier' },
          { type: 'bullet', text: 'Tertiary Treatment: Dual Media Filter, Activated Carbon Filter, Ultra-Filtration (UF)' },
          { type: 'bullet', text: 'Reverse Osmosis (RO) with Mechanical Vapor Recompression Evaporator for Zero Liquid Discharge' }
        ]
      },
      {
        heading: '3. Air Pollution Control Measures (APCM) & Stack Heights',
        items: [
          { type: 'bullet', text: 'Boiler / Furnace Stack: Minimum 30.0 meters AGL with sampling porthole & platform conforming to CPCB norms' },
          { type: 'bullet', text: 'Bag Filter Dust Collector efficiency: >= 99.5% for Particulate Matter (PM < 50 mg/Nm3)' },
          { type: 'bullet', text: 'Continuous Online Emission Monitoring System (OCEMS) connected to MPCB Central Cloud Server' }
        ]
      },
      {
        heading: '4. Hazardous Waste Management & Statutory Undertaking',
        items: [
          { type: 'bullet', text: 'Hazardous Waste Authorization under HWM Rules 2016 (Schedule I Categories 5.1 & 35.3)' },
          { type: 'bullet', text: 'Dedicated 120 sq.m impervious concrete floor storage shed with containment bund wall' },
          { type: 'bullet', text: 'Disposal through authorized Common Hazardous Waste Treatment Facility (CHWTSDF Taloja/Ranjangaon)' }
        ]
      }
    ]
  },

  // 2. MIDC Site Master Layout
  {
    fileName: 'MIDC_Site_Master_Layout_Blueprint_Sample.pdf',
    deptCode: 'MIDC',
    deptName: 'Maharashtra Industrial Development Corporation',
    portalSub: 'Civil Engineering & Building Architecture Directorate · MIDC DCR 2023',
    title: 'Statutory Site Master Layout & Civil Infrastructure Blueprint',
    docNo: 'MH-MIDC-CIVIL-2026-SMP',
    themeColor: [0.10, 0.25, 0.55], // Cobalt Blue
    sections: [
      {
        heading: '1. Industrial Plot Allotment & Land Demarcation Parameters',
        items: [
          { type: 'keyval', label: 'Industrial Area', val: 'Chakan Industrial Estate Phase II, Taluka Khed, Pune' },
          { type: 'keyval', label: 'Plot Number', val: 'Plot No. C-44/2 (Industrial Zone Class A)' },
          { type: 'keyval', label: 'Total Plot Area', val: '12,500.00 sq. meters (approx. 3.09 Acres)' },
          { type: 'keyval', label: 'Permissible FSI / FAR', val: '1.50 (Permissible Built-up: 18,750.00 sq.m)' },
          { type: 'keyval', label: 'Proposed Built-up', val: '11,200.00 sq.m (Ground + Mezzanine + First Floor)' }
        ]
      },
      {
        heading: '2. Mandatory Setbacks & Internal Arterial Roads',
        items: [
          { type: 'bullet', text: 'Front Setback: 9.00 meters from 30m wide MIDC main arterial road' },
          { type: 'bullet', text: 'Rear Setback: 6.00 meters continuous unobstructed heavy vehicle corridor' },
          { type: 'bullet', text: 'Side Setbacks: 6.00 meters on East and West boundaries for fire tender circulation' },
          { type: 'bullet', text: 'Heavy Container Truck Entry/Exit: Dual 12m wide R.C.C. gates with 15m radius turning circle' }
        ]
      },
      {
        heading: '3. Green Belt & Environmental Sustainability Provisions',
        items: [
          { type: 'bullet', text: 'Mandatory 33% Green Cover: 4,125 sq.m landscaped with native tree species around perimeter' },
          { type: 'bullet', text: 'Rainwater Harvesting: 4 percolation pits with 50,000 Litres underground recharge reservoir' },
          { type: 'bullet', text: 'Solar Rooftop Provision: 150 kWp structural capacity integrated on PEB factory shed' }
        ]
      },
      {
        heading: '4. Structural Engineer & Architect Declaration',
        items: [
          { type: 'bullet', text: 'Designed in conformity with Bureau of Indian Standards IS 456:2000 and IS 1893:2016 (Zone III)' },
          { type: 'bullet', text: 'Signed & Certified by Registered Structural Engineer (COA Reg: CA/2012/58914)' }
        ]
      }
    ]
  },

  // 3. DISH Factory Safety
  {
    fileName: 'DISH_Factory_Safety_Hazard_Control_Sample.pdf',
    deptCode: 'DISH',
    deptName: 'Directorate of Industrial Safety & Health',
    portalSub: 'The Factories Act 1948 · Maharashtra Factories Rules 1963 · Factory Plan Approval',
    title: 'Statutory Factory Safety Layout & Hazard Mitigation Scheme',
    docNo: 'MH-DISH-SAFE-2026-SMP',
    themeColor: [0.60, 0.20, 0.10], // Deep Rust/Amber
    sections: [
      {
        heading: '1. Occupational Health & Factory Structural Safety Audit',
        items: [
          { type: 'keyval', label: 'Maximum Daily Workers', val: '220 Persons (180 Male, 40 Female across 3 shifts)' },
          { type: 'keyval', label: 'Total Connected Power', val: '650 kVA (HT Substation 11 kV / 415 V)' },
          { type: 'keyval', label: 'Ventilation & Airflow', val: 'Mechanical Exhaust 12 Air Changes/Hr with natural ridge monitors' },
          { type: 'keyval', label: 'Working Space / Worker', val: '18.5 cubic meters per worker (Exceeds Sec 16 statutory 14.2 m3)' }
        ]
      },
      {
        heading: '2. Machinery Guarding & Hazardous Area Zoning',
        items: [
          { type: 'bullet', text: 'Interlocking safety guards & light curtains on all CNC power presses and automated stamping lines' },
          { type: 'bullet', text: 'Flameproof Electrical Fixtures (Ex-d rated) installed in solvent storage and chemical mixing bays' },
          { type: 'bullet', text: 'Emergency Stop Wire Pull Switched spanning entire conveyor belt perimeter with audible warning sirens' },
          { type: 'bullet', text: 'Dual Pressure Relief Valves on steam boilers tested as per Indian Boiler Regulations (IBR 1950)' }
        ]
      },
      {
        heading: '3. Chemical Spill Containment & Occupational Welfare Facilities',
        items: [
          { type: 'bullet', text: 'Bundy Wall Capacity: 110% of largest liquid bulk chemical storage tank' },
          { type: 'bullet', text: 'Emergency Eye Wash & Drench Showers situated within 10 meters of chemical handling workstations' },
          { type: 'bullet', text: 'Occupational Health Centre (OHC) equipped with 2 stretchers, oxygen cylinder & full-time certified nurse' },
          { type: 'bullet', text: 'Personal Protective Equipment (PPE) Matrix: Mandatory helmet, safety shoes, nitrile gloves & respirator' }
        ]
      },
      {
        heading: '4. Statutory Safety Committee & Certified Inspection Seal',
        items: [
          { type: 'bullet', text: 'Constituted Joint Safety Committee as per Section 41-G of The Factories Act 1948' },
          { type: 'bullet', text: 'Approved by Qualified Safety Officer (Govt. of Maharashtra Post-Graduate Safety Diploma)' }
        ]
      }
    ]
  },

  // 4. FIRE Hydrant & Evacuation
  {
    fileName: 'FIRE_Hydrant_Evacuation_Scheme_Sample.pdf',
    deptCode: 'FIRE',
    deptName: 'Directorate of Maharashtra Fire Services',
    portalSub: 'Maharashtra Fire Prevention & Life Safety Measures Act 2006 · NBC 2016 Part IV',
    title: 'Statutory Fire Hydrant, Sprinkler & Life Evacuation Scheme',
    docNo: 'MH-FIRE-EVAC-2026-SMP',
    themeColor: [0.70, 0.12, 0.12], // Fire Engine Red
    sections: [
      {
        heading: '1. Fire Resistance Classification & Building Profile',
        items: [
          { type: 'keyval', label: 'Occupancy Classification', val: 'Industrial Group G (Sub-division G-2 Moderate Hazard)' },
          { type: 'keyval', label: 'Building Height', val: '12.50 meters (Single floor high-bay with Mezzanine office)' },
          { type: 'keyval', label: 'Fire Rating of Structure', val: '2 Hours Fire Rated R.C.C. & fire-retardant structural steel' },
          { type: 'keyval', label: 'Dedicated Fire Water Tank', val: '150,000 Litres Static Underground Water Reservoir' }
        ]
      },
      {
        heading: '2. Fire Hydrant Network & Automatic Fire Suppression',
        items: [
          { type: 'bullet', text: 'Main Electrical Fire Pump: 2,850 LPM @ 7 kg/cm2 head with standby Diesel Engine Fire Pump' },
          { type: 'bullet', text: 'Jockey Pump: 180 LPM @ 7.5 kg/cm2 for continuous ring-main pressurization' },
          { type: 'bullet', text: '150mm diameter external ring main with 8 external landing valves spaced within 45m distance' },
          { type: 'bullet', text: 'Automatic Quick-Response Quartzoid Bulb Sprinkler System (68 deg C) covering full shop floor' }
        ]
      },
      {
        heading: '3. Evacuation Corridors, Exits & Assembly Points',
        items: [
          { type: 'bullet', text: 'Travel distance to nearest fire exit: <= 22.5 meters from any point on shop floor' },
          { type: 'bullet', text: 'Exit Doors: 6 fire exit outward-swinging panic-bar doors (2.0m width each, 2 hr fire rated)' },
          { type: 'bullet', text: 'Two Independent Emergency Evacuation Assembly Grounds located in north open green yard' },
          { type: 'bullet', text: 'Self-luminous Photoluminescent Exit Signage with 90-minute battery backup emergency spotlights' }
        ]
      },
      {
        heading: '4. Fire Safety Officer Certification & Provisional Endorsement',
        items: [
          { type: 'bullet', text: 'Complies with Maharashtra Fire Prevention Regulations 2006 Table 7 Schedule I specifications' },
          { type: 'bullet', text: 'Form A License issued by Licensed Fire Agency certified under Directorate of Fire Services' }
        ]
      }
    ]
  },

  // 5. MIDC Land Allotment Deed
  {
    fileName: 'MIDC_Land_Allotment_Deed_Sample.pdf',
    deptCode: 'MIDC-REV',
    deptName: 'Maharashtra Industrial Development Corporation',
    portalSub: 'Land Revenue & Estates Department · Industrial Allotment Protocol',
    title: 'Statutory Plot Allotment Letter & 95-Year Registered Lease Deed',
    docNo: 'MH-MIDC-DEED-2026-SMP',
    themeColor: [0.15, 0.25, 0.45], // Navy Slate
    sections: [
      {
        heading: '1. Industrial Plot Allotment Details & Identification',
        items: [
          { type: 'keyval', label: 'Allottee Enterprise', val: 'M/s Industrial Enterprise Maharashtra Pvt Ltd' },
          { type: 'keyval', label: 'Industrial Estate', val: 'Chakan Industrial Park, Phase II, Pune District' },
          { type: 'keyval', label: 'Demarcated Plot Area', val: '12,500.00 sq. meters (Plot No. C-44/2)' },
          { type: 'keyval', label: 'Lease Tenure', val: '95 Years Long-Term Renewable Statutory Lease' },
          { type: 'keyval', label: 'Allotment Rate', val: 'INR 4,250 per sq. meter as sanctioned by MIDC Board' }
        ]
      },
      {
        heading: '2. Boundary Demarcation Schedule',
        items: [
          { type: 'bullet', text: 'North Boundary: Abutting MIDC 30.0-meter wide main arterial road' },
          { type: 'bullet', text: 'South Boundary: Adjacent to Industrial Plot No. C-44/3' },
          { type: 'bullet', text: 'East Boundary: Adjoining 15-meter wide green corridor buffer' },
          { type: 'bullet', text: 'West Boundary: Adjacent to Industrial Plot No. C-44/1' }
        ]
      },
      {
        heading: '3. Development & Construction Milestones',
        items: [
          { type: 'bullet', text: 'Physical possession handed over with peg-marking certified by MIDC Land Surveyor' },
          { type: 'bullet', text: 'Commencement of civil construction within 12 months from date of possession' },
          { type: 'bullet', text: 'Attainment of commercial production within 36 months under MIDC Industrial Policy norms' }
        ]
      },
      {
        heading: '4. Executive Seal & Revenue Attestation',
        items: [
          { type: 'bullet', text: 'Executed under Common Seal of MIDC, Udyog Bhavan, Mahakali Caves Road, Andheri (E), Mumbai' },
          { type: 'bullet', text: 'Registered with Sub-Registrar of Assurances, Government of Maharashtra' }
        ]
      }
    ]
  },

  // 6. MSINS Detailed Project Report (DPR)
  {
    fileName: 'MSINS_Project_Feasibility_Report_DPR_Sample.pdf',
    deptCode: 'MSINS',
    deptName: 'Maharashtra State Innovation Society',
    portalSub: 'Department of Industries, Energy & Labour · Single Window Feasibility Cell',
    title: 'Statutory Detailed Project Report (DPR) & Investment Appraisal',
    docNo: 'MH-MSINS-DPR-2026-SMP',
    themeColor: [0.35, 0.15, 0.45], // Royal Purple
    sections: [
      {
        heading: '1. Executive Project Summary & Enterprise Profile',
        items: [
          { type: 'keyval', label: 'Enterprise Name', val: 'TechInnovate Industries Maharashtra Ltd' },
          { type: 'keyval', label: 'Sector / Sub-Sector', val: 'Advanced Engineering, Green Tech & Automated Manufacturing' },
          { type: 'keyval', label: 'Proposed Investment', val: 'INR 48.50 Crores Fixed Capital Investment (FCI)' },
          { type: 'keyval', label: 'Target Employment', val: '185 Direct Technicians & Engineers + 90 Indirect Jobs' }
        ]
      },
      {
        heading: '2. Capital Outlay & Financial Architecture',
        items: [
          { type: 'keyval', label: 'Land & Site Development', val: 'INR 6.50 Crores (Lease premium & boundary infrastructure)' },
          { type: 'keyval', label: 'Building & Civil Works', val: 'INR 14.50 Crores (Factory shed, admin block & utilities)' },
          { type: 'keyval', label: 'Plant & Advanced Machinery', val: 'INR 22.00 Crores (Automated CNC lines & testing lab)' },
          { type: 'keyval', label: 'Working Capital Margin', val: 'INR 5.50 Crores' }
        ]
      },
      {
        heading: '3. Socio-Economic Impact & Local Employment Generation',
        items: [
          { type: 'bullet', text: 'Over 75% local domicile employment quota guaranteed under Maharashtra State Policy' },
          { type: 'bullet', text: 'Tie-up with local Industrial Training Institutes (ITI Chakan & Pimpri) for apprentice skilling' },
          { type: 'bullet', text: 'Zero Carbon Footprint initiative: 40% energy from captive rooftop solar + green wheeling' }
        ]
      },
      {
        heading: '4. Incentive Package Eligibility under Package Scheme of Incentives (PSI 2019)',
        items: [
          { type: 'bullet', text: 'Category Zone B / C Industrial Area: 60% Gross SGST reimbursement for 7 years' },
          { type: 'bullet', text: 'Electricity Duty Exemption for 7 years + 5% Interest Subsidy on Term Loans' },
          { type: 'bullet', text: 'Single-Window expedited deemed approvals guaranteed under Maharashtra EoDB Act' }
        ]
      }
    ]
  }
];

// Target directories:
// 1. root /sample-pdfs/
// 2. public/sample-pdfs/
const rootDir = path.resolve(__dirname, '..');
const dir1 = path.join(rootDir, 'sample-pdfs');
const dir2 = path.join(rootDir, 'public', 'sample-pdfs');

if (!fs.existsSync(dir1)) fs.mkdirSync(dir1, { recursive: true });
if (!fs.existsSync(dir2)) fs.mkdirSync(dir2, { recursive: true });

console.log('Generating statutory sample PDFs for every department...');

for (const def of sampleDefs) {
  const pdfBuf = buildStatutoryPdf(def);
  const p1 = path.join(dir1, def.fileName);
  const p2 = path.join(dir2, def.fileName);
  fs.writeFileSync(p1, pdfBuf);
  fs.writeFileSync(p2, pdfBuf);
  console.log(`✓ Created: ${def.fileName} (${pdfBuf.length} bytes) in sample-pdfs/ and public/sample-pdfs/`);
}

console.log('All 6 sample PDFs generated successfully!');
