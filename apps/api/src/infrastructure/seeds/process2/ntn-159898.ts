import {
  createDiagnosisCode,
  toCaseId,
  toPartyId,
  type AbsenceConditionDetails,
  type CaseAlert,
  type CaseNextAction,
  type CaseTask,
  type DossierField,
  type DossierPanel,
  type ProviderDetails,
} from "@fineos/contracts";
import type { Process2CaseSeed } from "./types";

// David Hunter / ACEDEX / NTN-159898 case-execution reference. Source evidence
// is populated, while ACT_15/ACT_16 outputs start empty for the agent to enter.

const field = (key: string, label: string, value: string, route?: string): DossierField =>
  route ? { key, label, value, route } : { key, label, value };

const panel = (id: string, title: string, fields: readonly DossierField[]): DossierPanel =>
  ({ id, title, fields });

const diagnosis = createDiagnosisCode("M25.561");
if (!diagnosis.ok) throw new Error(diagnosis.error.message);
const expectedDiagnosisCode = diagnosis.value;

const partyId = toPartyId("PTY-77569");
const travisPartyId = toPartyId("PTY-TRAVIS");
const travisDrPartyId = toPartyId("PTY-TRAVIS-DR");
const notificationId = toCaseId("NTN-159898");
const absenceCaseId = toCaseId("NTN-159898-ABS-01");
const gdcCaseId = toCaseId("NTN-159898-GDC-02");

const employmentPanels = [
  panel("member-details", "Member Details", [
    field("employer", "Employer", "ACEDEX (Member ID: 23456868)"),
    field("masterPlan", "Master Plan", "ACEDEX Main Master Plan"),
  ]),
  panel("occupation-details", "Occupation Details", [
    field("employer", "Employer", "ACEDEX"),
    field("dateOfHire", "Date of Hire", "06/01/2015"),
    field("jobTitle", "Job Title", "Test Engineer"),
    field("employeeId", "Employee ID", "23456868"),
    field("hoursPerWeek", "Hours worked per week", "40"),
    field("daysPerWeek", "Days worked per week", "5.00"),
    field("employmentStatus", "Employment Status", "Active"),
  ]),
] as const satisfies readonly DossierPanel[];

const condition = {
  leaveReason: "serious_health_condition",
  workState: "NJ",
  description: "Torn ligament in knee, injured from football game",
  fields: [
    field("leaveReason", "Leave Reason", "Serious Health Condition - Employee"),
    field("workState", "Work State", "NJ"),
    field("conditionDescription", "Condition Description", "Torn ligament in knee, injured from football game"),
  ],
} as const satisfies AbsenceConditionDetails;

const providerPanels = [
  panel("other-provider-ids", "Other Provider IDs", [
    field("count", "Records", "0-0 of 0"),
  ]),
] as const satisfies readonly DossierPanel[];

const travisLarson = {
  partyId: travisPartyId,
  fullName: "Travis Larson",
  customerNumber: "607440",
  nationalProviderIdentifier: "0",
  providerType: "Unknown",
  serviceGroup: "Unknown",
  approvalIndicator: "—",
  approvalStartDate: "01/29/2026",
  approvalEndDate: "-",
  certifications: [],
  panels: providerPanels,
} as const satisfies ProviderDetails;

const travisLarsonDr = {
  partyId: travisDrPartyId,
  fullName: "Travis Larson R Dr",
  customerNumber: "607441",
  nationalProviderIdentifier: "0",
  providerType: "Unknown",
  serviceGroup: "Unknown",
  approvalIndicator: "—",
  approvalStartDate: "01/29/2026",
  approvalEndDate: "-",
  certifications: [],
  panels: providerPanels,
} as const satisfies ProviderDetails;

const eFormAnswers = [
  { question: "Event Date", answer: "01/08/2026" },
  { question: "Event Type", answer: "Sickness" },
  { question: "Expected RTW Date", answer: "01/23/2026" },
  { question: "Absence Type", answer: "2" },
  { question: "Absence Frequency", answer: "Continuous" },
  { question: "plan Type", answer: "return_date" },
  {
    question: "Can you provide a brief description of the reason for your leave of absence?",
    answer: "Torn ligament in knee, injured from football game",
  },
  { question: "Leave Reason", answer: "Serious Health Condition - Employee" },
  { question: "Reason Qualifier1", answer: "Not Work Related" },
  { question: "Reason Qualifier2", answer: "Sickness" },
  { question: "Please provide the name of your surgery or procedure", answer: "Knee Surgery" },
  { question: "Medical Provider", answer: "Travis Larson" },
] as const;

const tasks = [
  {
    id: "TASK-ELIGIBILITY",
    name: "Case Eligibility Document",
    status: "open",
    priority: "high",
    assignedTo: "Eligibility Specialist Team",
    dueDate: "01/06/2026",
  },
] as const satisfies readonly CaseTask[];

const alerts = [
  { id: "ALERT-ELIGIBILITY", severity: "error", message: "Case Eligibility Document failed." },
  { id: "ALERT-ESCALATION", severity: "error", message: "Escalation Failure determining 3rd party assignees." },
] as const satisfies readonly CaseAlert[];

const nextActions = [
  {
    id: "NA-AUTOMATION",
    title: "NTN-159898-GDC-02 - Automation",
    description: "Case Eligibility Document failed.",
    targetDate: "01/06/2026",
    status: "OVERDUE",
  },
  {
    id: "NA-ESCALATE",
    title: "NTN-159898-GDC-02 - Escalate",
    description: "Escalation Failure determining 3rd party assignees.",
    targetDate: "01/06/2026",
    status: "Open",
  },
] as const satisfies readonly CaseNextAction[];

export const ntn159898Seed = {
  party: {
    id: partyId,
    fullName: "David Hunter",
    partyType: "insured",
    customerNumber: "77569",
    dateOfBirth: "1980-10-20",
    employer: "ACEDEX",
    phone: "(207) 8182211",
    homePhone: "(207) 0012222",
    email: "david_hunter.aoa7wupt@mailosaur.io",
    details: {
      partyId,
      fullName: "David Hunter",
      customerNumber: "77569",
      gender: "Unknown",
      maritalStatus: "Unknown",
      preferredLanguage: "English",
      identifiers: [
        { type: "Social Security Number", value: "xxxxx7879" },
      ],
      addresses: [
        {
          type: "Home",
          line1: "162 Main Street",
          city: "Jersey City",
          region: "NJ",
          postalCode: "7030",
          country: "USA",
          effectiveFrom: "11/16/2022",
        },
      ],
      profilePanels: [
        panel("name", "Name", [
          field("name", "Name", "David Hunter"),
          field("verified", "Verified", "Yes"),
        ]),
        panel("personal-identification", "Personal Identification", [
          field("idType", "Identification number type", "Social Security Number"),
          field("idNumber", "Identification number", "xxxxx7879"),
          field("dateOfBirth", "Date of birth", "10/20/1980"),
          field("ageAttained", "Age attained", "45"),
          field("gender", "Gender", "Unknown"),
          field("maritalStatus", "Marital status", "Unknown"),
        ]),
        panel("additional-information", "Additional Information", [
          field("partyType", "Party type", "Insured"),
          field("occupation", "Occupation", "Unknown"),
        ]),
        panel("nationality", "Nationality", [
          field("nationality", "Nationality", "Unknown"),
          field("countryOfBirth", "Country of birth", "Unknown"),
        ]),
        panel("security", "Security", [
          field("securedClient", "Secured client", "No"),
          field("staffMember", "Staff member", "No"),
        ]),
        panel("languages", "Languages", [
          field("translation", "Correspondence translation required", "No"),
          field("interpreter", "Interpreter required", "No"),
          field("preferredLanguage", "Preferred language", "English"),
        ]),
        panel("occupations", "Occupations", [
          field("current", "Current", "Unknown"),
        ]),
      ],
      contactPanels: [
        panel("mobile", "Mobile", [
          field("number", "Number", "(207) 8182211"),
          field("status", "Status", "Verified"),
        ]),
        panel("email", "Email", [
          field("email", "Email", "david_hunter.aoa7wupt@mailosaur.io"),
          field("status", "Status", "Verified"),
        ]),
        panel("home-phone", "Home Phone", [
          field("number", "Number", "(207) 0012222"),
          field("status", "Status", "Verified"),
        ]),
      ],
      communicationPreferences: [
        panel("written-correspondence", "Written Correspondence", [
          field("goPaperless", "Go paperless", "Yes"),
          field("via", "Send notification of correspondence via", "Email"),
        ]),
        panel("notification-of-updates", "Notification of Updates", [
          field("sms", "Notify on update via SMS", "No"),
          field("emailUpdate", "Notify on update via Email", "Yes"),
          field("sendTo", "Send email to", "david_hunter.aoa7wupt@mailosaur.io"),
        ]),
        panel("direct-communication", "Direct Communication", [
          field("preferredMethod", "Preferred contact method", "Email"),
        ]),
      ],
      occupationEmploymentPanels: employmentPanels,
    },
  },
  notification: {
    id: notificationId,
    partyId,
    source: "Phone",
    notificationDate: "2026-01-06",
    intakeType: "leave_and_gdc",
    status: "SUBMITTED",
    scope: "leave_and_gdc",
  },
  dossier: {
    caseId: notificationId,
    intakeType: "leave_and_gdc",
    scope: "leave_and_gdc",
    componentScope: "absence_and_gdc",
    party: {
      partyId,
      fullName: "David Hunter",
      customerNumber: "77569",
      gender: "Unknown",
      maritalStatus: "Unknown",
      preferredLanguage: "English",
      identifiers: [{ type: "Social Security Number", value: "xxxxx7879" }],
      addresses: [
        {
          type: "Home",
          line1: "162 Main Street",
          city: "Jersey City",
          region: "NJ",
          postalCode: "7030",
          country: "USA",
          effectiveFrom: "11/16/2022",
        },
      ],
      profilePanels: [
        panel("name", "Name", [
          field("name", "Name", "David Hunter"),
          field("verified", "Verified", "Yes"),
        ]),
        panel("personal-identification", "Personal Identification", [
          field("idType", "Identification number type", "Social Security Number"),
          field("idNumber", "Identification number", "xxxxx7879"),
          field("dateOfBirth", "Date of birth", "10/20/1980"),
          field("ageAttained", "Age attained", "45"),
          field("gender", "Gender", "Unknown"),
          field("maritalStatus", "Marital status", "Unknown"),
        ]),
      ],
      contactPanels: [
        panel("mobile", "Mobile", [
          field("number", "Number", "(207) 8182211"),
          field("status", "Status", "Verified"),
        ]),
        panel("email", "Email", [
          field("email", "Email", "david_hunter.aoa7wupt@mailosaur.io"),
          field("status", "Status", "Verified"),
        ]),
        panel("home-phone", "Home Phone", [
          field("number", "Number", "(207) 0012222"),
          field("status", "Status", "Verified"),
        ]),
      ],
      communicationPreferences: [
        panel("written-correspondence", "Written Correspondence", [
          field("goPaperless", "Go paperless", "Yes"),
          field("via", "Send notification of correspondence via", "Email"),
        ]),
        panel("notification-of-updates", "Notification of Updates", [
          field("sms", "Notify on update via SMS", "No"),
          field("emailUpdate", "Notify on update via Email", "Yes"),
          field("sendTo", "Send email to", "david_hunter.aoa7wupt@mailosaur.io"),
        ]),
        panel("direct-communication", "Direct Communication", [
          field("preferredMethod", "Preferred contact method", "Email"),
        ]),
      ],
      occupationEmploymentPanels: employmentPanels,
    },
    summary: {
      title: "Notification NTN-159898",
      status: "SUBMITTED",
      bands: [
        { label: "Requester", value: "David Hunter" },
        { label: "Date", value: "01/06/2026" },
        { label: "Expected return to work date", value: "01/23/2026" },
        { label: "Actual return to work date", value: "-" },
      ],
      sidebarFacts: [field("adminGroup", "Admin Group", "Unknown")],
    },
    ownership: {
      bands: [
        { label: "Assigned To", value: "Eligibility Specialist Team / Eligibility Specialist" },
        { label: "In Department", value: "Eligibility Specialist Team" },
      ],
      sidebarFacts: [
        field("assignedTo", "Assigned To", "Eligibility Specialist Team / Eligibility Specialist"),
        field("inDepartment", "In Department", "Eligibility Specialist Team"),
      ],
    },
    caseMap: {
      id: "NTN-159898",
      type: "notification",
      label: "Notification",
      status: "SUBMITTED",
      participants: [
        { name: "David Hunter", role: "Requester", partyId },
        { name: "ACEDEX", role: "Employer" },
      ],
      children: [
        {
          id: "NTN-159898-ABS-01",
          type: "absence_case",
          label: "Absence Case",
          status: "ADJUDICATION",
          route: "/cases/NTN-159898/absence-hub",
          participants: [
            { name: "David Hunter", role: "Employee", partyId },
            { name: "ACEDEX", role: "Employer" },
            { name: "Travis Larson", role: "Medical Provider", partyId: travisPartyId },
          ],
        },
        {
          id: "NTN-159898-GDC-02",
          type: "gdc_case",
          label: "Group Disability Claim",
          status: "OPEN",
          route: "/cases/NTN-159898/claim-hub",
          participants: [
            { name: "David Hunter", role: "Claimant", partyId },
            { name: "ACEDEX", role: "Employer" },
            { name: "Travis Larson", role: "Medical Provider", partyId: travisPartyId },
            { name: "Travis Larson R Dr", role: "Medical Provider", partyId: travisDrPartyId },
            { name: "Dhanraj Venkatesan", role: "Medical Provider" },
            { name: "Dhanraj VI", role: "Medical Provider" },
          ],
        },
        {
          id: "NTN-159898-GDC-02-01",
          type: "benefit",
          label: "STD Benefit",
          status: "Approved",
          participants: [
            { name: "David Hunter", role: "Claimant", partyId },
            { name: "FIT Amount Payee", role: "Tax Payee" },
            { name: "SIT Payee", role: "Tax Payee" },
          ],
        },
      ],
    },
    documents: [
      {
        id: "DOC-01",
        icon: "doc",
        caseType: "STD Benefit",
        createdDate: "01/06/2026",
        createdBy: "System Administrator",
        status: "Completed",
        documentType: "Policy Provisions Document",
        description: "",
        group: "Claim Forms",
        delivery: "Unknown",
        title: "Policy Provisions #00308641",
      },
      {
        id: "DOC-02",
        icon: "doc",
        caseType: "STD Benefit",
        createdDate: "01/06/2026",
        createdBy: "Total Leave Assist Adm",
        status: "Completed",
        documentType: "STD Earnings and Tax",
        description: "Automated STD Earnings and Tax",
        group: "",
        delivery: "Unknown",
        title: "",
      },
      {
        id: "DOC-03",
        icon: "doc",
        caseType: "STD Benefit",
        createdDate: "01/06/2026",
        createdBy: "John Smith",
        status: "Unknown",
        documentType: "Policy Info",
        description: "",
        group: "",
        delivery: "Unknown",
        title: "",
      },
      {
        id: "DOC-04",
        icon: "pdf",
        caseType: "Absence Case",
        createdDate: "01/06/2026",
        createdBy: "Sibandu Mukherjee",
        status: "Draft",
        documentType: "Employment Details Verification",
        description: "",
        group: "",
        delivery: "Unknown",
        title: "",
      },
      {
        id: "DOC-05",
        icon: "pdf",
        caseType: "Group Disability Claim",
        createdDate: "01/06/2026",
        createdBy: "David Hunter",
        status: "Completed",
        documentType: "Intake Summary",
        description: "intake-summary.pdf",
        group: "System Generated",
        delivery: "Unknown",
        title: "Intake Summary",
      },
      {
        id: "DOC-06",
        icon: "pdf",
        caseType: "Absence Case",
        createdDate: "01/06/2026",
        createdBy: "David Hunter",
        status: "Completed",
        documentType: "Intake Summary",
        description: "intake-summary.pdf",
        group: "System Generated",
        delivery: "Unknown",
        title: "Intake Summary",
      },
      {
        id: "DOC-07",
        icon: "pdf",
        caseType: "Group Disability Claim",
        createdDate: "01/06/2026",
        createdBy: "David Hunter",
        status: "Unknown",
        documentType: "QuestionPathClaim Eform",
        description: "",
        group: "",
        delivery: "Unknown",
        title: "",
        eFormKind: "claim",
      },
      {
        id: "DOC-08",
        icon: "pdf",
        caseType: "Absence Case",
        createdDate: "01/06/2026",
        createdBy: "David Hunter",
        status: "Unknown",
        documentType: "QuestionPathAbsence Eform",
        description: "",
        group: "",
        delivery: "Unknown",
        title: "",
        eFormKind: "absence",
      },
    ],
    eForms: [
      {
        id: "NTN-159898-GDC-02-eform",
        kind: "claim",
        title: "QuestionPathClaimEform",
        rows: eFormAnswers,
      },
      {
        id: "NTN-159898-ABS-01-eform",
        kind: "absence",
        title: "QuestionPathAbsenceEform",
        rows: eFormAnswers,
      },
    ],
    tasks,
    alerts,
    nextActions,
    lookup: {
      query: "resources to locate icd 10 codes",
      candidates: [
        {
          code: "Z96.651",
          description: "Presence of right artificial knee joint",
          category: "Knee surgery",
          evidenceIds: ["ev-google"],
        },
        {
          code: "Z96.652",
          description: "Presence of left artificial knee joint",
          category: "Knee surgery",
          evidenceIds: ["ev-google"],
        },
        {
          code: "Z96.653",
          description: "Presence of artificial knee joint, bilateral",
          category: "Knee surgery",
          evidenceIds: ["ev-google"],
        },
        {
          code: "M25.561",
          description: "Pain in right knee",
          category: "Knee",
          evidenceIds: ["ev-icd10data"],
        },
        {
          code: "S83.511A",
          description: "Sprain of ACL of right knee, initial encounter",
          category: "Knee",
          evidenceIds: ["ev-icd10data"],
        },
      ],
      evidence: [
        {
          id: "ev-uknow",
          source: "UNUM Inside — uKnow",
          excerpt: "The preferred resources to locate the appropriate ICD 10 code(s) are listed below.",
          supportedCodes: [],
          route: "/lookups/uknow",
        },
        {
          id: "ev-google",
          source: "Google Search",
          excerpt: "ICD-10-CM codes for the presence of an artificial knee joint depend on the side of surgery.",
          supportedCodes: ["Z96.651", "Z96.652", "Z96.653"],
          route: "/lookups/google",
        },
        {
          id: "ev-icd10data",
          source: "ICD10Data.com",
          excerpt: "M25.561 is the ICD-10-CM diagnosis code for pain in the right knee.",
          supportedCodes: ["M25.561"],
          route: "/lookups/icd10data",
        },
      ],
      uKnow: {
        title: "resources to locate icd 10 codes",
        paragraphs: [
          "13060 results found in 0.95 seconds",
          "The preferred resources to locate the appropriate ICD 10 code(s) are listed below:",
        ],
        panels: [],
        links: [
          { label: "ICD 10 Data", route: "/lookups/icd10data" },
          { label: "Google", route: "/lookups/google" },
          { label: "ICD Codes: Reference Sheet", route: "/lookups/icd-reference" },
          { label: "Common ICD10 Codes & Medical Category", route: "/lookups/icd-chart" },
        ],
        tables: [],
      },
      google: {
        title: "what is the ICD 10 diagnosis code for knee surgery",
        paragraphs: [
          "ICD-10-CM codes for the presence of an artificial knee joint depend on the side of surgery.",
        ],
        panels: [
          panel("ai-overview", "AI Overview", [
            field("z96651", "Z96.651", "Presence of right artificial knee joint"),
            field("z96652", "Z96.652", "Presence of left artificial knee joint"),
            field("z96653", "Z96.653", "Presence of artificial knee joint, bilateral"),
          ]),
        ],
        links: [],
        tables: [],
      },
      icd10Data: {
        title: "The Web's Free 2026 ICD-10-CM/PCS Medical Coding Reference",
        paragraphs: [
          "ICD10Data.com is a free reference website designed for the fast lookup of all current American ICD-10-CM (diagnosis) and ICD-10-PCS (procedure) medical billing codes.",
          "The 2026 ICD-10-CM/PCS code sets are now fully loaded on ICD10Data.com. 2026 codes became effective on October 1, 2025, therefore all claims with a date of service on or after this date should use 2026 codes.",
        ],
        panels: [],
        links: [{ label: "Common ICD-10 Codes Chart", route: "/lookups/icd-chart" }],
        tables: [],
      },
      icdReference: {
        title: "ICD Codes: Reference Sheet",
        paragraphs: [],
        panels: [],
        links: [{ label: "Click here to view the file", route: "/lookups/icd-chart" }],
        tables: [
          {
            id: "attachments",
            columns: ["File"],
            rows: [{ id: "attachment-1", cells: ["Click here to view the file"] }],
          },
        ],
      },
      chart: {
        title: "Common ICD-10 Codes Chart",
        paragraphs: [
          "The first chart below shows the ICD-10 codes that apply to various wellness screenings.",
          "The second chart shows the appropriate ICD-10 codes for other common conditions (i.e., pregnancy, DOV, vision, etc.)",
        ],
        panels: [],
        links: [],
        tables: [
          {
            id: "wellness",
            columns: ["Wellness Tests", "ICD10", "Definition"],
            rows: [
              { id: "annual-physical", cells: ["Annual Physical", "Z00.0", "General adult medical examination"] },
              { id: "immunization", cells: ["Immunization", "Z23", "Encounter for immunization"] },
              { id: "allergy-shot", cells: ["Allergy Shot", "T78.40XA", "Allergy unspecified, initial encounter"] },
              { id: "flu-shot", cells: ["Flu Shot", "J10.1", "Influenza due to other identified influenza virus"] },
              { id: "bone-marrow", cells: ["Bone Marrow (Aspirate or Biopsy)", "R97.8", "Other abnormal tumor markers"] },
              { id: "breast-ultrasound", cells: ["Breast Ultrasound", "Z12.39", "Encounter for other screening for neoplasm of breast"] },
              { id: "ca-125", cells: ["CA 125 (Blood test for ovarian cancer)", "R97.1", "Cancer antigen 125"] },
              { id: "ca-15-3", cells: ["CA 15-3 or CA 27.29 (Blood test for breast cancer)", "R97.8", "Other abnormal tumor markers"] },
              { id: "cancer-vaccine", cells: ["Cancer Vaccine", "Z23", "Cancer Vaccine"] },
              { id: "carotid-doppler", cells: ["Carotid Doppler", "Z13.6", "Encounter for screening for cardiovascular disorders"] },
              { id: "cea", cells: ["CEA (Blood test for colon cancer)", "R97.0", "Elevated CEA"] },
              { id: "cervical-screening", cells: ["Cervical Screening", "Z12.4", "Encounter for screening for malignant neoplasm of cervix"] },
              { id: "chest-xray", cells: ["Chest X-ray", "R97.8", "Other abnormal tumor markers"] },
              { id: "cholesterol", cells: ["Cholesterol", "Z13.220", "Encounter for screening for lipid disorders"] },
              { id: "colonoscopy", cells: ["Colonoscopy", "Z12.11", "Screening for malignant neoplasm of colon"] },
            ],
          },
        ],
      },
    },
    absence: {
      caseId: absenceCaseId,
      employeePartyId: partyId,
      status: "ADJUDICATION",
      hub: {
        decisionProgress: "Adjudication",
        firstNotifiedOn: "Tuesday, January 6th 2026",
        returnToWork: {
          expectedDate: "01/23/2026",
          actualDate: "-",
          intention: "Returning to partial or full time work",
        },
        calendar: {
          title: "Absence Calendar",
          month: "February 2026",
          entries: [
            { id: "week-1", label: "1 2 3", status: "Pending", range: "From 01/23/2026 to 03/09/2026" },
            { id: "week-2", label: "8 9 10", status: "Pending", range: "From 01/23/2026 to 03/09/2026" },
            { id: "week-3", label: "15 16 17", status: "Pending", range: "From 01/23/2026 to 03/09/2026" },
            { id: "week-4", label: "22 23 24", status: "Pending", range: "From 01/23/2026 to 03/09/2026" },
          ],
        },
        sharedNotes: "-",
        overdue: { label: "Overdue", days: 23, date: "Tuesday, January 13th 2026" },
      },
      leavePanels: [
        panel("leave-header", "Leave", [
          field("leaveRequestedDate", "Leave Requested Date", "01/06/2026"),
          field("earliestLastDayWorked", "Earliest Last Day Worked", "01/07/2026"),
          field("timelyReporting", "New Leave Timely Reporting", "None"),
        ]),
      ],
      leaveRequests: [
        {
          id: "140440",
          requestedFrom: "01/08/2026",
          requestedThrough: "03/09/2026",
          reason: "Serious Health Condition - Employee",
          qualifiers: ["Not Work Related", "Sickness"],
        },
      ],
      leavePlans: [
        { name: "Fed FMLA", selectionMethod: "Automatic", applicability: "Applicable", evaluation: "Undecided" },
      ],
      periods: [
        {
          lastDayWorked: "01/07/2026",
          startDate: "01/08/2026",
          endDate: "03/09/2026",
          status: "Pending",
          pattern: "Continuous",
        },
      ],
      condition,
      employmentPanels,
    },
    gdc: {
      caseId: gdcCaseId,
      claimantPartyId: partyId,
      status: "OPEN",
      claimPanels: [
        panel("claim-decision", "Claim Decision", [field("timeToDecision", "Time to Decision", "3 days")]),
        panel("claimant", "Claimant", [
          field("name", "David Hunter", "David Hunter"),
          field("dateOfBirth", "Date Of Birth", "10/20/1980"),
          field("maritalStatus", "Marital Status", "Unknown"),
          field("identificationNumber", "Identification Number", "xxxxx7879 (Social Security Number)"),
          field("dependents", "Number of Dependents", "0"),
        ]),
        panel("return-to-work", "Return To Work", [
          field("expected", "Expected return to work date", "01/23/2026"),
          field("actual", "Actual return to work date", "-"),
        ]),
      ],
      incident: panel("incident", "Incident", [
        field("lastDayWorked", "Last Day Worked", "01/07/2026"),
        field("accidentSickness", "Accident/Sickness", "Sickness"),
        field("workRelated", "Work Related", "No"),
        field("condition", "Condition", "Sickness"),
        field("dateFirstUnableToWork", "Date First Unable to Work", "01/08/2026"),
        field("dismembermentLoss", "Dismemberment/Loss", "Unknown"),
      ]),
      surgery: panel("surgery", "Surgery", [
        field("expectedSurgeryDate", "Expected (first) Surgery Date", "01/08/2026"),
        field("actualSurgeryDate", "Actual (first) Surgery Date", "-"),
        field("outpatient", "Outpatient", "No"),
      ]),
      returnToWork: panel("gdc-return-to-work", "Return To Work", [
        field("expected", "Expected return to work date", "01/23/2026"),
        field("actual", "Actual return to work date", "-"),
      ]),
      medicalSummary: panel("medical-summary", "Medical", [
        field("provider", "Provider", "-"),
        field("firstTreatment", "Date of First Treatment", "01/07/2026"),
        field("lifeExpectancy", "Life Expectancy", "Unknown"),
        field("diagnosis", "Diagnosis", "-"),
      ]),
      medicalPanels: [
        panel("medical-details", "Medical Details", [
          field("firstUnable", "Date First Unable To Work", "01/08/2026"),
          field("firstTreatment", "Date of First Treatment", "01/07/2026"),
          field("condition", "Condition", "Sickness"),
          field("conditionCategory", "Condition Category", "Unknown"),
          field("expectedSurgeryDate", "Expected (first) Surgery Date", "01/08/2026"),
          field("typeOfSurgery", "Type of Surgery", "Medically Necessary"),
          field("lifeExpectancy", "Life Expectancy", "Unknown"),
          field("nameOfSurgery", "Name of Surgery or Procedure", "Knee Surgery"),
        ]),
      ],
      // ACT_15/ACT_16 targets start empty: the diagnosis and provider below are
      // manually persisted through the target-state endpoints, not seeded. The
      // lookup candidates and providerSearch candidates above remain as source
      // evidence for the manual entry.
      diagnoses: [],
      providers: [],
      providerSearch: {
        criteria: [
          field("first", "First Name", "Travis"),
          field("last", "Last Name", "Larson"),
          field("searchBy", "Search by", "Person"),
          field("currentRole", "Current Provider Role/Other ID", "Yes"),
          field("certificationGroup", "Certification Group", "Unknown"),
          field("certificationsType", "Certifications Type", "Unknown"),
        ],
        candidates: [travisLarson, travisLarsonDr],
      },
      tasks,
      alerts,
      nextActions,
    },
  },
  scenario: {
    scenarioId: "NTN-159898",
    title: "David Hunter — leave and GDC intake with both components activated",
    decisions: { DEC_01: "yes", DEC_02: "yes", DEC_03: "yes", DEC_04: "yes", DEC_05: "yes" },
    logic: { LGC_01: "absence_and_gdc", LGC_02: expectedDiagnosisCode, LGC_03: condition },
    terminal: { kind: "completed", status: "COMPLETED", activatedTracks: ["absence", "gdc"] },
  },
  absenceCase: {
    id: absenceCaseId,
    notificationId,
    employeePartyId: partyId,
    status: "ADJUDICATION",
    leaveReason: "serious_health_condition",
    conditionDescription: "Torn ligament in knee, injured from football game",
    workState: "NJ",
  },
  absencePeriods: [
    {
      id: "AP-159898-01",
      absenceCaseId,
      lastDayWorked: "2026-01-07",
      startDate: "2026-01-08",
      endDate: "2026-03-09",
    },
  ],
  // providerPartyId/diagnosisCode are omitted: ACT_15/ACT_16 targets are
  // manually persisted through the target-state endpoints, not seeded.
  gdcCase: {
    id: gdcCaseId,
    notificationId,
    claimantPartyId: partyId,
    status: "OPEN",
  },
  providers: [
    {
      id: travisPartyId,
      fullName: "Travis Larson",
      partyType: "medical_provider",
      customerNumber: "607440",
      details: travisLarson,
    },
  ],
} as const satisfies Process2CaseSeed;
