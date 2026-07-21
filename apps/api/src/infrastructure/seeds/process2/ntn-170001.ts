import {
  toCaseId,
  toPartyId,
  type AbsenceComponent,
  type AbsenceConditionDetails,
  type CaseDocument,
  type CaseEForm,
  type CaseLookup,
  type CaseMapNode,
  type CaseOwnership,
  type CaseSummary,
  type LookupContent,
  type Process2Dossier,
  type Process2PartyProfile,
} from "@fineos/contracts";
import type {
  AbsenceCaseSeedRow,
  AbsencePeriodSeedRow,
  NotificationSeedRow,
  PartySeedRow,
  Process2CaseSeed,
} from "./types";

// Fifth Third Bank employee, Delaware work state, successful absence-only
// case markup (DEC_01-04 yes, DEC_05 not reached because no GDC track is
// activated, END_DONE with only the absence track).
const NOTIFICATION_ID = toCaseId("NTN-170001");
const ABSENCE_CASE_ID = toCaseId("NTN-170001-ABS-01");
const EMPLOYEE_PARTY_ID = toPartyId("PTY-90142");

const CONDITION_DESCRIPTION = "Post-surgical recovery following appendectomy";
const LAST_DAY_WORKED = "2026-03-02";
const PERIOD_START = "2026-03-03";
const PERIOD_END = "2026-04-13";
const WORK_STATE = "DE";
const EMPLOYER = "Fifth Third Bank National Association";

const conditionDetails: AbsenceConditionDetails = {
  leaveReason: "serious_health_condition",
  workState: WORK_STATE,
  description: CONDITION_DESCRIPTION,
  fields: [
    { key: "leaveReason", label: "Leave Reason", value: "Serious Health Condition - Employee" },
    { key: "workState", label: "Work State", value: WORK_STATE },
    { key: "conditionDescription", label: "Condition Description", value: CONDITION_DESCRIPTION },
    { key: "expectedDuration", label: "Expected Duration", value: "6 weeks" },
  ],
};

const partyProfile: Process2PartyProfile = {
  partyId: EMPLOYEE_PARTY_ID,
  fullName: "Marcus Bailey",
  customerNumber: "90142",
  gender: "Male",
  maritalStatus: "Married",
  preferredLanguage: "English",
  identifiers: [
    { type: "SSN", value: "***-**-4471", maskedValue: "***-**-4471" },
    { type: "Employee ID", value: "FTB-90142" },
  ],
  addresses: [
    {
      type: "Home",
      line1: "482 Market Street",
      city: "Wilmington",
      region: WORK_STATE,
      postalCode: "19801",
      country: "USA",
      effectiveFrom: "2016-04-11",
    },
  ],
  profilePanels: [
    {
      id: "personal-details",
      title: "Personal Details",
      fields: [
        { key: "dateOfBirth", label: "Date of Birth", value: "06/14/1985" },
        { key: "gender", label: "Gender", value: "Male" },
        { key: "maritalStatus", label: "Marital Status", value: "Married" },
        { key: "preferredLanguage", label: "Preferred Language", value: "English" },
        { key: "nationalId", label: "National ID", value: "***-**-4471" },
      ],
    },
  ],
  contactPanels: [
    {
      id: "contact-details",
      title: "Contact Details",
      fields: [
        { key: "homePhone", label: "Home Phone", value: "(302) 555-0199" },
        { key: "mobilePhone", label: "Mobile Phone", value: "(302) 555-0148" },
        { key: "email", label: "Email", value: "marcus.bailey@example.com" },
        { key: "preferredContact", label: "Preferred Contact Method", value: "Phone" },
      ],
    },
  ],
  communicationPreferences: [
    {
      id: "communication-preferences",
      title: "Communication Preferences",
      fields: [
        { key: "preferredLanguage", label: "Preferred Language", value: "English" },
        { key: "correspondenceMethod", label: "Correspondence Method", value: "Electronic" },
        { key: "doNotContact", label: "Do Not Contact", value: "No" },
      ],
    },
  ],
  occupationEmploymentPanels: [
    {
      id: "occupation-employment",
      title: "Occupation & Employment",
      fields: [
        { key: "employer", label: "Employer", value: EMPLOYER },
        { key: "jobTitle", label: "Job Title", value: "Branch Operations Manager" },
        { key: "dateOfHire", label: "Date of Hire", value: "04/11/2016" },
        { key: "workState", label: "Work State", value: WORK_STATE },
        { key: "employmentStatus", label: "Employment Status", value: "Active" },
      ],
    },
  ],
};

const summary: CaseSummary = {
  title: `${NOTIFICATION_ID} — Marcus Bailey`,
  status: "SUBMITTED",
  bands: [
    { label: "Employer", value: EMPLOYER },
    { label: "Customer Instructions", value: "No" },
    { label: "Open Tasks", value: "Yes (1)" },
  ],
  sidebarFacts: [
    { key: "leaveReason", label: "Leave Reason", value: "Serious Health Condition - Employee" },
    { key: "workState", label: "Work State", value: WORK_STATE },
  ],
};

const ownership: CaseOwnership = {
  bands: [
    { label: "Assigned To", value: "Eligibility Specialist Team / Eligibility Specialist" },
    { label: "In Department", value: "Eligibility Specialist Team" },
  ],
  sidebarFacts: [
    { key: "adminGroup", label: "Admin Group", value: "Eligibility Specialist Team" },
  ],
};

// Notification + Absence only: the fork/join in the case-execution AOP only
// activates the absence track for this scenario, so the case map has no GDC
// child node.
const caseMap: CaseMapNode = {
  id: NOTIFICATION_ID,
  type: "notification",
  label: `Notification ${NOTIFICATION_ID}`,
  status: "SUBMITTED",
  participants: [{ name: "Marcus Bailey", role: "Requester", partyId: EMPLOYEE_PARTY_ID }],
  route: `/cases/${NOTIFICATION_ID}/general`,
  children: [
    {
      id: ABSENCE_CASE_ID,
      type: "absence_case",
      label: `Absence Case ${ABSENCE_CASE_ID}`,
      status: "OPEN",
      participants: [{ name: "Marcus Bailey", role: "Employee", partyId: EMPLOYEE_PARTY_ID }],
      route: `/cases/${ABSENCE_CASE_ID}/absence-hub`,
    },
  ],
};

const documents: readonly CaseDocument[] = [
  {
    id: "DOC-170001-01",
    icon: "doc",
    caseType: "Notification",
    createdDate: "2026-02-25",
    createdBy: "System",
    status: "Completed",
    documentType: "Notification Confirmation",
    description: `Notification confirmation generated for ${NOTIFICATION_ID}.`,
    group: "Notification",
    delivery: "Electronic",
    title: "Notification Confirmation",
  },
  {
    id: "DOC-170001-02",
    icon: "doc",
    caseType: "Absence",
    createdDate: "2026-02-25",
    createdBy: "Marcus Bailey",
    status: "Ordered",
    documentType: "eForm",
    description: "Employee Absence Request eForm submitted with the notification.",
    group: "Absence",
    delivery: "Electronic",
    title: "Absence eForm",
    eFormKind: "absence",
  },
  {
    id: "DOC-170001-03",
    icon: "pdf",
    caseType: "Absence",
    createdDate: "2026-02-27",
    createdBy: "Fifth Third Bank National Association HR",
    status: "Completed",
    documentType: "Employer Statement",
    description: "Employer statement confirming leave dates and the Delaware work state.",
    group: "Absence",
    delivery: "Fax",
    title: "Employer Statement",
  },
  {
    id: "DOC-170001-04",
    icon: "pdf",
    caseType: "Absence",
    createdDate: "2026-03-01",
    createdBy: "Attending Physician",
    status: "Completed",
    documentType: "Medical Certification",
    description: `Certification of ${CONDITION_DESCRIPTION.toLowerCase()}.`,
    group: "Absence",
    delivery: "Fax",
    title: "Medical Certification",
  },
];

const eForms: readonly CaseEForm[] = [
  {
    id: "EFORM-170001-01",
    kind: "absence",
    title: "Employee Absence Request",
    rows: [
      { question: "Reason for absence", answer: "Serious Health Condition - Employee" },
      { question: "Medical condition", answer: CONDITION_DESCRIPTION },
      { question: "First day of absence", answer: "03/03/2026" },
      { question: "Expected return to work date", answer: "04/13/2026" },
      { question: "Work state", answer: WORK_STATE },
    ],
  },
];

// ponytail: deterministic lookup fixture only, never wired to an actual GDC
// diagnosis for this absence-only case; kept so the ICD-10 lookup routes
// still render fully even though no GDC/provider row exists to consume it.
const uKnow: LookupContent = {
  title: "uKnow — Post-Surgical Aftercare Coding Guidance",
  paragraphs: [
    "Resources to locate the appropriate ICD-10 code for post-surgical recovery are listed below.",
    "Aftercare following digestive system surgery, including appendectomy recovery, is coded to category Z48.81-.",
  ],
  panels: [
    {
      id: "uknow-guidance",
      title: "GetAnswer",
      fields: [
        { key: "primaryCandidate", label: "Primary Candidate", value: "Z48.815 — Encounter for aftercare following surgery on the digestive system" },
        { key: "secondaryCandidate", label: "Secondary Candidate", value: "K35.80 — Unspecified acute appendicitis" },
      ],
    },
  ],
  links: [
    { label: "ICD 10 Data", route: "/lookups/icd10data" },
    { label: "Google", route: "/lookups/google" },
    { label: "ICD Codes: Reference Sheet", route: "/lookups/icd-reference" },
    { label: "Common ICD-10 Codes Chart", route: "/lookups/icd-chart" },
  ],
  tables: [],
};

const google: LookupContent = {
  title: "what is the icd 10 code for post-surgical recovery after appendectomy",
  paragraphs: [
    "ICD-10-CM aftercare codes for digestive-system surgery recovery fall under the Z48.81- category.",
  ],
  panels: [
    {
      id: "google-overview",
      title: "AI Overview",
      fields: [
        { key: "z48815", label: "Z48.815", value: "Encounter for aftercare following surgery on the digestive system" },
        { key: "k3580", label: "K35.80", value: "Unspecified acute appendicitis, without perforation or gangrene" },
      ],
    },
  ],
  links: [],
  tables: [],
};

const icd10Data: LookupContent = {
  title: "ICD10Data.com — Z48.815 and K35.80",
  paragraphs: [
    "ICD10Data.com is a free reference for the fast lookup of current ICD-10-CM diagnosis codes.",
    "Z48.815 covers aftercare following surgery on the digestive system, including appendectomy recovery.",
  ],
  panels: [],
  links: [{ label: "Common ICD-10 Codes Chart", route: "/lookups/icd-chart" }],
  tables: [],
};

const icdReference: LookupContent = {
  title: "ICD Codes: Reference Sheet",
  paragraphs: ["Attachments supporting the post-surgical aftercare diagnosis reference."],
  panels: [],
  links: [{ label: "Common ICD-10 Codes Chart", route: "/lookups/icd-chart" }],
  tables: [
    {
      id: "reference-attachments",
      columns: ["File"],
      rows: [{ id: "attachment-01", cells: ["Common ICD-10 Codes Chart"] }],
    },
  ],
};

const chart: LookupContent = {
  title: "Common ICD-10 Codes Chart",
  paragraphs: [
    "The chart below shows the ICD-10 codes applicable to post-surgical aftercare and related digestive-system conditions.",
  ],
  panels: [],
  links: [],
  tables: [
    {
      id: "aftercare-chart",
      columns: ["Condition", "ICD10", "Definition"],
      rows: [
        { id: "row-01", cells: ["Post-Surgical Aftercare (Digestive System)", "Z48.815", "Encounter for aftercare following surgery on the digestive system"] },
        { id: "row-02", cells: ["Acute Appendicitis, Unspecified", "K35.80", "Unspecified acute appendicitis, without perforation or gangrene"] },
      ],
    },
  ],
};

const lookup: CaseLookup = {
  query: "post-surgical recovery following appendectomy icd-10 code",
  candidates: [
    { code: "Z48.815", description: "Encounter for aftercare following surgery on the digestive system", category: "Aftercare", evidenceIds: ["EVID-170001-01"] },
    { code: "K35.80", description: "Unspecified acute appendicitis, without perforation or gangrene", category: "Digestive", evidenceIds: ["EVID-170001-02"] },
  ],
  evidence: [
    { id: "EVID-170001-01", source: "uKnow", excerpt: "Aftercare following digestive system surgery is coded to the Z48.81- category.", supportedCodes: ["Z48.815"], route: "/lookups/uknow" },
    { id: "EVID-170001-02", source: "ICD10Data.com", excerpt: "K35.80 covers unspecified acute appendicitis without perforation or gangrene.", supportedCodes: ["K35.80"], route: "/lookups/icd10data" },
  ],
  uKnow,
  google,
  icd10Data,
  icdReference,
  chart,
};

const absence: AbsenceComponent = {
  caseId: ABSENCE_CASE_ID,
  employeePartyId: EMPLOYEE_PARTY_ID,
  status: "OPEN",
  hub: {
    decisionProgress: "Adjudication",
    firstNotifiedOn: "Wednesday, February 25th 2026",
    returnToWork: {
      expectedDate: "04/13/2026",
      actualDate: "-",
      intention: "Returning to full-time work",
    },
    calendar: {
      title: "Absence Calendar",
      month: "March 2026",
      entries: [
        { id: "CAL-170001-01", label: "Continuous Leave", status: "Approved", range: "03/03/2026 - 04/13/2026" },
      ],
    },
    sharedNotes: `Employee approved for continuous leave following ${CONDITION_DESCRIPTION.toLowerCase()}; return to work pending physician clearance.`,
  },
  leavePanels: [
    {
      id: "leave-header",
      title: "Leave Request Details",
      fields: [
        { key: "leaveRequestedDate", label: "Leave Requested Date", value: "02/25/2026" },
        { key: "earliestLastDayWorked", label: "Earliest Last Day Worked", value: "03/02/2026" },
        { key: "newLeaveTimelyReporting", label: "New Leave Timely Reporting", value: "None" },
      ],
    },
  ],
  leaveRequests: [
    {
      id: "LR-170001-01",
      requestedFrom: PERIOD_START,
      requestedThrough: PERIOD_END,
      reason: "Serious Health Condition - Employee",
      qualifiers: ["Not Work Related", "Sickness"],
    },
  ],
  leavePlans: [
    { name: "Fed FMLA", selectionMethod: "Automatic", applicability: "Applicable", evaluation: "Undecided" },
  ],
  periods: [
    { lastDayWorked: LAST_DAY_WORKED, startDate: PERIOD_START, endDate: PERIOD_END, status: "Pending", pattern: "Continuous" },
  ],
  condition: conditionDetails,
  employmentPanels: [
    {
      id: "member-details",
      title: "Member Details",
      fields: [
        { key: "employer", label: "Employer", value: `${EMPLOYER} (Member ID: 90142)` },
        { key: "masterPlan", label: "Master Plan", value: `${EMPLOYER} Main Master Plan` },
      ],
    },
    {
      id: "occupation-details",
      title: "Occupation Details",
      fields: [
        { key: "dateOfHire", label: "Date of Hire", value: "04/11/2016" },
        { key: "jobTitle", label: "Job Title", value: "Branch Operations Manager" },
        { key: "hoursPerWeek", label: "Hours Worked per Week", value: "40" },
        { key: "employeeId", label: "Employee ID", value: "90142" },
        { key: "employmentStatus", label: "Employment Status", value: "Active" },
        { key: "workState", label: "Work State", value: WORK_STATE },
      ],
    },
  ],
};

const dossier: Process2Dossier = {
  caseId: NOTIFICATION_ID,
  intakeType: "leave",
  scope: "leave_only",
  componentScope: "absence_only",
  party: partyProfile,
  summary,
  ownership,
  caseMap,
  documents,
  eForms,
  tasks: [
    {
      id: "TASK-170001-01",
      name: "Verify employment details",
      status: "open",
      priority: "high",
      assignedTo: "Eligibility Specialist Team",
      dueDate: "2026-03-02",
    },
  ],
  alerts: [
    {
      id: "ALERT-170001-01",
      severity: "warning",
      message: "Absence case requires adjudication.",
    },
  ],
  nextActions: [
    {
      id: "ACTION-170001-01",
      title: "Complete employment verification",
      description: "Verify Marcus Bailey's employment details before adjudication.",
      targetDate: "2026-03-02",
      status: "Open",
      route: `/cases/${ABSENCE_CASE_ID}/employment-details`,
    },
  ],
  lookup,
  absence,
};

const party: PartySeedRow<Process2PartyProfile> = {
  id: EMPLOYEE_PARTY_ID,
  fullName: "Marcus Bailey",
  partyType: "insured",
  details: partyProfile,
  customerNumber: "90142",
  dateOfBirth: "1985-06-14",
  employer: EMPLOYER,
  phone: "(302) 555-0148",
  homePhone: "(302) 555-0199",
  email: "marcus.bailey@example.com",
};

const notification: NotificationSeedRow = {
  id: NOTIFICATION_ID,
  partyId: EMPLOYEE_PARTY_ID,
  source: "Phone",
  notificationDate: "2026-02-25",
  intakeType: "leave",
  status: "SUBMITTED",
  scope: "leave_only",
};

const absenceCase: AbsenceCaseSeedRow = {
  id: ABSENCE_CASE_ID,
  notificationId: NOTIFICATION_ID,
  employeePartyId: EMPLOYEE_PARTY_ID,
  status: "OPEN",
  leaveReason: "serious_health_condition",
  conditionDescription: CONDITION_DESCRIPTION,
  workState: WORK_STATE,
};

const absencePeriods: readonly AbsencePeriodSeedRow[] = [
  { id: "AP-170001-01", absenceCaseId: ABSENCE_CASE_ID, lastDayWorked: LAST_DAY_WORKED, startDate: PERIOD_START, endDate: PERIOD_END },
];

// DEC_05 (medical provider details) belongs to the GDC track only and is
// omitted because this scenario never activates that track. LGC_02
// (diagnosis code) is likewise omitted for the same reason.
export const ntn170001Seed: Process2CaseSeed = {
  party,
  notification,
  dossier,
  scenario: {
    scenarioId: "SCN-NTN-170001-ABS-ONLY-SUCCESS",
    title: "Marcus Bailey / Fifth Third Bank — successful absence-only case markup",
    decisions: { DEC_01: "yes", DEC_02: "yes", DEC_03: "yes", DEC_04: "yes" },
    logic: { LGC_01: "absence_only", LGC_03: conditionDetails },
    terminal: { kind: "completed", status: "COMPLETED", activatedTracks: ["absence"] },
  },
  absenceCase,
  absencePeriods,
};
