"use strict";
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { User, Application, Document, Query, Inspection } = require("./models");
const {
  uploadsDir,
  ensureApplicationStatutoryDocuments,
  ensurePhysicalDocumentPdf,
} = require("../utils/helpers");

// Helper to generate sample PDF files for the statutory blueprints
function seedDummyPdf(docTitle, docFilename) {
  const storedName = `${docFilename.replace(/\.pdf$/, "")}_${Date.now()}_${Math.floor(Math.random() * 1000)}.pdf`;
  const filePath = path.join(uploadsDir, storedName);
  const content = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n4 0 obj<</Length 200>>stream\nBT\n/F1 16 Tf\n50 720 Td\n(GOVERNMENT OF MAHARASHTRA - SINGLE WINDOW SYSTEM) Tj\n0 -30 Td\n(ENTERPRISE: Sahyadri Precision Engineering Pvt Ltd) Tj\n0 -25 Td\n(DOCUMENT: ${docTitle}) Tj\n0 -25 Td\n(STATUTORY CLEARANCE: Verified & Digitally Authenticated) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000214 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n460\n%%EOF`;
  fs.writeFileSync(filePath, content);
  return { storedName, size: Buffer.byteLength(content) };
}

async function seedInitialData() {
  const hashApex = bcrypt.hashSync("Officer@123#", 10);
  const hashMidc = bcrypt.hashSync("Midc@123#", 10);
  const hashMpcb = bcrypt.hashSync("Mpcb@123#", 10);
  const hashFire = bcrypt.hashSync("Fire@123#", 10);
  const hashDish = bcrypt.hashSync("Dish@123#", 10);
  const hashApplicant = bcrypt.hashSync("Applicant@123#", 10);

  const officialSeeds = [
    {
      email: "officer@udyog.gov.in",
      role: "official",
      hash: hashApex,
      company: "Maharashtra State Innovation Society",
      dept: "Industries Department & State Innovation Society (Apex Authority)",
      person: "Shri R. K. Patil (Single Window Apex Officer)",
      district: "Mumbai City",
      phone: "022-22025112",
      dept_code: "msins",
      is_apex: 1,
    },
    {
      email: "midc.officer@udyog.gov.in",
      role: "official",
      hash: hashMidc,
      company: "Maharashtra Industrial Development Corporation",
      dept: "Civil & Infrastructure Engineering",
      person: "Er. Nilesh T. Kadam (Executive Engineer - Civil)",
      district: "Pune",
      phone: "020-25501234",
      dept_code: "midc",
      is_apex: 0,
    },
    {
      email: "mpcb.officer@udyog.gov.in",
      role: "official",
      hash: hashMpcb,
      company: "Maharashtra Pollution Control Board",
      dept: "Environmental Clearance Wing",
      person: "Dr. S. M. Deshmukh (Sub-Regional Officer - Environmental)",
      district: "Pune",
      phone: "020-25811627",
      dept_code: "mpcb",
      is_apex: 0,
    },
    {
      email: "fire.officer@udyog.gov.in",
      role: "official",
      hash: hashFire,
      company: "Directorate of Maharashtra Fire Services",
      dept: "Directorate of Maharashtra Fire Services",
      person: "Chief Fire Officer S. V. More",
      district: "Pune",
      phone: "020-26451101",
      dept_code: "fire",
      is_apex: 0,
    },
    {
      email: "dish.officer@udyog.gov.in",
      role: "official",
      hash: hashDish,
      company: "Directorate of Industrial Safety & Health",
      dept: "Factory Safety Inspection Wing",
      person: "Er. V. A. Shinde (Joint Director of Industrial Safety)",
      district: "Pune",
      phone: "020-24458899",
      dept_code: "dish",
      is_apex: 0,
    },
  ];

  for (const u of officialSeeds) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      await User.create({
        role: u.role,
        email: u.email,
        password_hash: u.hash,
        company_name: u.company,
        department: u.dept,
        contact_person: u.person,
        district: u.district,
        phone: u.phone,
        dept_code: u.dept_code,
        is_apex: u.is_apex,
        is_banned: 0,
      });
    } else {
      await User.updateOne(
        { _id: existing._id },
        {
          $set: {
            password_hash: u.hash,
            company_name: u.company,
            department: u.dept,
            contact_person: u.person,
            district: u.district,
            phone: u.phone,
            dept_code: u.dept_code,
            is_apex: u.is_apex,
          },
        },
      );
    }
  }

  // Demo Applicant: Enterprise User
  let applicant = await User.findOne({ email: "entrepreneur@mahindra-auto.in" });
  if (!applicant) {
    applicant = await User.create({
      role: "applicant",
      email: "entrepreneur@mahindra-auto.in",
      password_hash: hashApplicant,
      company_name: "Sahyadri Precision Engineering Pvt Ltd",
      registration_no: "27AABCS1429B1Z8",
      contact_person: "Anand K. Kulkarni",
      district: "Pune",
      phone: "+91 98230 45890",
      dept_code: null,
      is_apex: 0,
      is_banned: 0,
    });
  } else {
    await User.updateOne(
      { _id: applicant._id },
      { $set: { password_hash: hashApplicant } },
    );
  }

  // Sample Application for Demonstration
  const appCount = await Application.countDocuments();
  let appId1 = null;

  if (appCount === 0 && applicant) {
    const defaultClearances = JSON.stringify([
      {
        name: "Industrial Development Corporation Land Allotment & Building Plan",
        dept: "Maharashtra Industrial Development Corporation",
        status: "Approved",
        taskDept: "midc",
      },
      {
        name: "Consent to Establish (Orange Category)",
        dept: "Maharashtra Pollution Control Board",
        status: "Under Review",
        taskDept: "mpcb",
      },
      {
        name: "Provisional Life Safety Clearance Certificate",
        dept: "Directorate of Maharashtra Fire Services",
        status: "Under Review",
        taskDept: "fire",
      },
      {
        name: "Factory License & Safety Approval",
        dept: "Directorate of Industrial Safety & Health",
        status: "In Progress",
        taskDept: "dish",
      },
      {
        name: "High Tension Power Sanction",
        dept: "Maharashtra State Electricity Distribution Company",
        status: "Approved",
        taskDept: "msedcl",
      },
    ]);

    const parallelStatus = JSON.stringify({
      midc: {
        name: "Civil & Infrastructure Engineering",
        clearance:
          "Industrial Development Corporation Land Allotment & Building Plan",
        status: "Approved",
        remarks:
          "Plot No. B-42 Chakan Phase II validated. Building construction blueprints cleared.",
        officer: "Er. Nilesh T. Kadam",
        updated: new Date().toISOString(),
      },
      mpcb: {
        name: "Environmental Clearance Wing",
        clearance: "Consent to Establish (Orange Category)",
        status: "Under Review",
        remarks:
          "Water conservation scheme & effluent treatment plan under verification.",
        officer: "Dr. S. M. Deshmukh",
        updated: new Date().toISOString(),
      },
      fire: {
        name: "Directorate of Maharashtra Fire Services",
        clearance: "Provisional Life Safety Clearance Certificate",
        status: "Under Review",
        remarks: "Hydrant network and fire tender turning radius verified.",
        officer: "Chief Fire Officer S. V. More",
        updated: new Date().toISOString(),
      },
      dish: {
        name: "Factory Safety Inspection Wing",
        clearance: "Factory License & Safety Approval",
        status: "In Progress",
        remarks:
          "Machine guarding layouts & emergency egress pathways under scrutiny.",
        officer: "Er. V. A. Shinde",
        updated: new Date().toISOString(),
      },
      msedcl: {
        name: "State Electricity Distribution Power Sanction",
        clearance: "High Tension Power Sanction (450 kVA)",
        status: "Approved",
        remarks: "Load demand 450 kVA sanctioned at 11 kV feeder.",
        officer: "Superintending Engineer",
        updated: new Date().toISOString(),
      },
    });

    const seedStageStatuses = JSON.stringify({
      mpcb: {
        decision: "Approved",
        remarks:
          "Environmental Impact Assessment cleared. Effluent Treatment Plan verified. Consent to Establish granted under Orange Category.",
        officer: "Dr. S. M. Deshmukh",
        decided_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    });

    const appDoc = await Application.create({
      user_id: applicant._id,
      application_no: "MH/UDYOG/2026/00142",
      company_name: "Sahyadri Precision Engineering Pvt Ltd",
      registration_no: "27AABCS1429B1Z8",
      industry_category: "Light Engineering",
      land_size: 3.5,
      water_use: 25.0,
      electricity: 450.0,
      hazardous: 0,
      hazard_level: "Low Risk",
      location: "Plot B-42, Chakan Industrial Area Phase II, Khed",
      district: "Pune",
      project_cost: 14.5,
      employment_potential: 120,
      msme_category: "Small",
      risk_tier: "Orange",
      status: "In Progress",
      clearances_json: defaultClearances,
      parallel_status_json: parallelStatus,
      current_stage: "parallel_scrutiny",
      stage_statuses: seedStageStatuses,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    appId1 = appDoc._id;

    const envFile = seedDummyPdf(
      "Environmental Management & Effluent Treatment Scheme",
      "Chakan_Environmental_Plan.pdf",
    );
    const civilFile = seedDummyPdf(
      "Industrial Site Master Layout Plan",
      "Chakan_Site_Layout_Plan.pdf",
    );
    const safetyFile = seedDummyPdf(
      "Factory Safety & Machinery Layout Blueprint",
      "Chakan_Factory_Safety_Plan.pdf",
    );
    const fireFile = seedDummyPdf(
      "Fire Hydrant & Evacuation Layout Plan",
      "Chakan_Fire_Safety_Plan.pdf",
    );
    const landFile = seedDummyPdf(
      "Land Title Deed & Industrial Allotment Order",
      "Chakan_Land_Allotment_Deed.pdf",
    );
    const dprFile = seedDummyPdf(
      "Detailed Project Feasibility Report (DPR)",
      "Sahyadri_DPR_Feasibility_Report.pdf",
    );

    await Document.create([
      {
        application_id: appId1,
        user_id: applicant._id,
        document_type: "Environmental Management Plan",
        original_name: "Chakan_Environmental_Management_Effluent_Plan.pdf",
        stored_name: envFile.storedName,
        mime_type: "application/pdf",
        size: envFile.size,
        verification_status: "Verified",
        officer_remarks:
          "Pollution Control Board Consent to Establish granted under Orange Category",
        plan_type: "environmental_plan",
        department: "mpcb",
      },
      {
        application_id: appId1,
        user_id: applicant._id,
        document_type: "Site Layout Plan",
        original_name: "Chakan_Industrial_Site_Plan_Rev2.pdf",
        stored_name: civilFile.storedName,
        mime_type: "application/pdf",
        size: civilFile.size,
        verification_status: "Verified",
        officer_remarks:
          "Meets setback standards and Industrial Development Corporation roadway alignment",
        plan_type: "civil_plan",
        department: "midc",
      },
      {
        application_id: appId1,
        user_id: applicant._id,
        document_type: "Factory Safety Blueprint",
        original_name: "Chakan_Factory_Safety_Hazard_Control.pdf",
        stored_name: safetyFile.storedName,
        mime_type: "application/pdf",
        size: safetyFile.size,
        verification_status: "Pending",
        officer_remarks:
          "Machine guarding layouts and secondary containment under Directorate of Industrial Safety & Health scrutiny",
        plan_type: "factory_safety_plan",
        department: "dish",
      },
      {
        application_id: appId1,
        user_id: applicant._id,
        document_type: "Fire Protection & Evacuation Plan",
        original_name: "Chakan_Fire_Hydrant_Evacuation_Plan.pdf",
        stored_name: fireFile.storedName,
        mime_type: "application/pdf",
        size: fireFile.size,
        verification_status: "Pending",
        officer_remarks:
          "Static water tank & pump pressure specs under Directorate of Fire Services scrutiny",
        plan_type: "fire_safety_plan",
        department: "fire",
      },
      {
        application_id: appId1,
        user_id: applicant._id,
        document_type: "Land Title Deed / Industrial Allotment Letter",
        original_name: "Chakan_Land_Allotment_Deed.pdf",
        stored_name: landFile.storedName,
        mime_type: "application/pdf",
        size: landFile.size,
        verification_status: "Verified",
        officer_remarks: "MIDC Land Allotment Order verified",
        plan_type: "civil_plan",
        department: "midc",
      },
      {
        application_id: appId1,
        user_id: applicant._id,
        document_type: "Detailed Project Feasibility Report (DPR)",
        original_name: "Sahyadri_DPR_Feasibility_Report.pdf",
        stored_name: dprFile.storedName,
        mime_type: "application/pdf",
        size: dprFile.size,
        verification_status: "Verified",
        officer_remarks: "Project investment & feasibility appraised",
        plan_type: "supporting_doc",
        department: "msins",
      },
    ]);

    const officerUser = await User.findOne({ email: "officer@udyog.gov.in" });
    if (officerUser) {
      await Query.create({
        application_id: appId1,
        officer_id: officerUser._id,
        message:
          "Please specify the exact designated hazardous waste storage shed coordinates according to Pollution Control Board Schedule II.",
        applicant_reply:
          "Updated the layout blueprint with marked secondary containment and certified storage shed.",
        status: "Resolved",
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        resolved_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      });

      await Inspection.create({
        application_id: appId1,
        officer_id: officerUser._id,
        department: "Directorate of Industrial Safety & Health",
        scheduled_date: new Date(Date.now() + 3 * 86400000)
          .toISOString()
          .split("T")[0],
        inspector_name: "Er. V. A. Shinde (Joint Director of Safety)",
        status: "Scheduled",
        notes:
          "Combined joint inspection with Directorate of Fire Services for machine guarding and egress clearance.",
      });
    }
  }

  // Ensure demo application has all 4 departmental documents seeded
  const app1 = await Application.findOne({
    application_no: "MH/UDYOG/2026/00142",
  });
  if (app1) {
    const existingDocs = await Document.find({ application_id: app1._id }).lean();
    const hasEnv = existingDocs.some(
      (d) => d.plan_type === "environmental_plan" || d.department === "mpcb",
    );
    const hasCivil = existingDocs.some(
      (d) => d.plan_type === "civil_plan" || d.department === "midc",
    );
    const hasSafety = existingDocs.some(
      (d) => d.plan_type === "factory_safety_plan" || d.department === "dish",
    );
    const hasFire = existingDocs.some(
      (d) => d.plan_type === "fire_safety_plan" || d.department === "fire",
    );

    if (!hasEnv) {
      const f = seedDummyPdf(
        "Environmental Management & Effluent Treatment Scheme",
        "Chakan_Environmental_Plan.pdf",
      );
      await Document.create({
        application_id: app1._id,
        user_id: app1.user_id,
        document_type: "Environmental Management Plan",
        original_name: "Chakan_Environmental_Management_Effluent_Plan.pdf",
        stored_name: f.storedName,
        mime_type: "application/pdf",
        size: f.size,
        verification_status: "Verified",
        officer_remarks:
          "Pollution Control Board Consent to Establish granted under Orange Category",
        plan_type: "environmental_plan",
        department: "mpcb",
      });
    }
    if (!hasCivil) {
      const f = seedDummyPdf(
        "Industrial Site Master Layout Plan",
        "Chakan_Site_Layout_Plan.pdf",
      );
      await Document.create({
        application_id: app1._id,
        user_id: app1.user_id,
        document_type: "Site Layout Plan",
        original_name: "Chakan_Industrial_Site_Plan_Rev2.pdf",
        stored_name: f.storedName,
        mime_type: "application/pdf",
        size: f.size,
        verification_status: "Verified",
        officer_remarks:
          "Meets setback standards and Industrial Development Corporation roadway alignment",
        plan_type: "civil_plan",
        department: "midc",
      });
    }
    if (!hasSafety) {
      const f = seedDummyPdf(
        "Factory Safety & Machinery Layout Blueprint",
        "Chakan_Factory_Safety_Plan.pdf",
      );
      await Document.create({
        application_id: app1._id,
        user_id: app1.user_id,
        document_type: "Factory Safety Blueprint",
        original_name: "Chakan_Factory_Safety_Hazard_Control.pdf",
        stored_name: f.storedName,
        mime_type: "application/pdf",
        size: f.size,
        verification_status: "Pending",
        officer_remarks:
          "Machine guarding layouts and secondary containment under Directorate of Industrial Safety & Health scrutiny",
        plan_type: "factory_safety_plan",
        department: "dish",
      });
    }
    if (!hasFire) {
      const f = seedDummyPdf(
        "Fire Hydrant & Evacuation Layout Plan",
        "Chakan_Fire_Safety_Plan.pdf",
      );
      await Document.create({
        application_id: app1._id,
        user_id: app1.user_id,
        document_type: "Fire Protection & Evacuation Plan",
        original_name: "Chakan_Fire_Hydrant_Evacuation_Plan.pdf",
        stored_name: f.storedName,
        mime_type: "application/pdf",
        size: f.size,
        verification_status: "Pending",
        officer_remarks:
          "Static water tank & pump pressure specs under Directorate of Fire Services scrutiny",
        plan_type: "fire_safety_plan",
        department: "fire",
      });
    }
    const hasSupporting = existingDocs.some(
      (d) =>
        d.plan_type === "supporting_doc" ||
        ![
          "environmental_plan",
          "civil_plan",
          "factory_safety_plan",
          "fire_safety_plan",
        ].includes(d.plan_type),
    );
    if (!hasSupporting) {
      const fLand = seedDummyPdf(
        "Land Title Deed & Industrial Allotment Order",
        "Chakan_Land_Allotment_Deed.pdf",
      );
      const fDpr = seedDummyPdf(
        "Detailed Project Feasibility Report (DPR)",
        "Sahyadri_DPR_Feasibility_Report.pdf",
      );
      await Document.create([
        {
          application_id: app1._id,
          user_id: app1.user_id,
          document_type: "Land Title Deed / Industrial Allotment Letter",
          original_name: "Chakan_Land_Allotment_Deed.pdf",
          stored_name: fLand.storedName,
          mime_type: "application/pdf",
          size: fLand.size,
          verification_status: "Verified",
          officer_remarks: "MIDC Land Allotment Order verified",
          plan_type: "civil_plan",
          department: "midc",
        },
        {
          application_id: app1._id,
          user_id: app1.user_id,
          document_type: "Detailed Project Feasibility Report (DPR)",
          original_name: "Sahyadri_DPR_Feasibility_Report.pdf",
          stored_name: fDpr.storedName,
          mime_type: "application/pdf",
          size: fDpr.size,
          verification_status: "Verified",
          officer_remarks: "Project investment & feasibility appraised",
          plan_type: "supporting_doc",
          department: "msins",
        },
      ]);
    }
  }

  // Ensure ALL existing applications in the database have complete statutory documents and valid PDFs on disk
  try {
    const allApps = await Application.find().lean();
    for (const a of allApps) {
      await ensureApplicationStatutoryDocuments(a, a.user_id);
      const docs = await Document.find({ application_id: a._id });
      for (const d of docs) {
        const healed = ensurePhysicalDocumentPdf(d, a);
        if (d.stored_name !== healed.storedName || d.size !== healed.size) {
          await Document.updateOne(
            { _id: d._id },
            { $set: { stored_name: healed.storedName, size: healed.size } }
          );
        }
      }
    }
  } catch (err) {
    console.error("Error during statutory document health pass:", err);
  }
}

module.exports = { seedInitialData };

