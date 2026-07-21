import { toCaseId, toPartyId } from "@fineos/contracts";
import type {
  CaseDocument,
  CaseEForm,
  CaseMapNode,
  CaseOwnership,
  CaseSummary,
  DossierPanel,
  LookupContent,
  PartyAddress,
  PartyIdentifier,
  Process2Dossier,
  Process2PartyProfile,
  ScenarioExpectation,
} from "@fineos/contracts";
import type { Process2CaseSeed } from "./types";

// Derek Osei / ACEDEX: submitted with intake type "accommodation_only", which
// selects neither Leave nor GDC. Case Search finds it (DEC_01: yes) but its
// intake type is not covered for automation (DEC_02: no), so the AOP escalates
// at ACT_18 straight to END_INELIGIBLE_INTAKE without ever reaching ACT_19+
// (intake summary), the component fork, or any absence/GDC/provider record.

const CASE_ID = toCaseId("NTN-170003");
const PARTY_ID = toPartyId("PTY-84021");
const EMPLOYER = "ACEDEX";
const NOTIFICATION_DATE = "2026-01-20";

const identifiers = (): readonly PartyIdentifier[] => [
  { type: "Social Security Number", value: "146-58-4471", maskedValue: "XXX-XX-4471" },
];

const addresses = (): readonly PartyAddress[] => [
  {
    type: "Home",
    line1: "48 Ridge Avenue",
    city: "Newark",
    region: "NJ",
    postalCode: "07104",
    country: "USA",
    effectiveFrom: "2021-09-01",
  },
];

const profilePanels = (): readonly DossierPanel[] => [
  {
    id: "party-profile",
    title: "Party Profile",
    fields: [
      { key: "name-verified", label: "Name / Verified", value: "Derek Osei / Yes" },
      { key: "identification", label: "Identification", value: "Social Security Number · XXX-XX-4471" },
      { key: "dob-age-gender", label: "DOB / Age / Gender", value: "03/11/1985 / 41 / Male" },
      { key: "party-type", label: "Party type", value: "Insured" },
      { key: "marital-nationality", label: "Marital status / Nationality", value: "Married / Unknown" },
      { key: "occupation", label: "Occupation", value: `Current: Warehouse Supervisor | ${EMPLOYER}` },
      { key: "home-address", label: "Home address", value: "48 Ridge Avenue, Newark NJ 07104" },
    ],
  },
];

const contactPanels = (): readonly DossierPanel[] => [
  {
    id: "contact-details",
    title: "Contact Details",
    fields: [
      { key: "mobile", label: "Mobile", value: "(973) 555-0142 — Verified" },
      { key: "email", label: "Email", value: "derek_osei.o91fk2@mailosaur.io — Verified" },
      { key: "home-phone", label: "Home phone", value: "(973) 555-0198 — Verified" },
      { key: "actions", label: "Actions", value: "+ Add phone number / email / website" },
    ],
  },
];

const communicationPreferences = (): readonly DossierPanel[] => [
  {
    id: "communication-preferences",
    title: "Communication Preferences",
    fields: [
      { key: "written-correspondence", label: "Written correspondence", value: "Go paperless: Yes · sent via email (derek_osei.o91fk2@mailosaur.io)" },
      { key: "notification-updates", label: "Notification of updates", value: "Notify via SMS: No · Notify via Email: Yes" },
      { key: "direct-communication", label: "Direct communication", value: "Preferred contact method: Email" },
    ],
  },
];

const occupationEmploymentPanels = (): readonly DossierPanel[] => [
  {
    id: "occupation-details",
    title: "Occupation Details",
    fields: [
      { key: "job-title", label: "Job title", value: "Warehouse Supervisor" },
      { key: "employment-status", label: "Employment status", value: "Active" },
      { key: "date-of-hire", label: "Date of hire", value: "03/04/2018" },
      { key: "occupation-category", label: "Occupation category", value: "Unknown" },
      { key: "hours-per-week", label: "Hours worked per week", value: "40" },
      { key: "employee-id", label: "Employee ID", value: "44210091" },
      { key: "verification", label: "Verification", value: "Verified" },
    ],
  },
  {
    id: "member-details",
    title: "Member Details",
    fields: [
      { key: "employer", label: "Employer", value: `${EMPLOYER} (Member ID 44210091)` },
      { key: "master-plan", label: "Master Plan", value: `${EMPLOYER} Main Master Plan` },
      { key: "options", label: "Options", value: "+ Create new Member · Delete Member" },
    ],
  },
];

const buildProfile = (): Process2PartyProfile => ({
  partyId: PARTY_ID,
  fullName: "Derek Osei",
  customerNumber: "84021",
  gender: "Male",
  maritalStatus: "Married",
  preferredLanguage: "English",
  identifiers: identifiers(),
  addresses: addresses(),
  profilePanels: profilePanels(),
  contactPanels: contactPanels(),
  communicationPreferences: communicationPreferences(),
  occupationEmploymentPanels: occupationEmploymentPanels(),
});

// Both documents evidence ACT_03 (Enter Notification Details) only: DEC_02 (no)
// escalates the case at ACT_18, before ACT_19 (Store Intake Summary Fields) or
// any Leave/GDC section ever runs, so no intake-summary or component eForm exists.
const documents = (): readonly CaseDocument[] => [
  {
    id: "DOC-170003-01",
    icon: "doc",
    caseType: "Notification",
    createdDate: NOTIFICATION_DATE,
    createdBy: "Requester",
    status: "Completed",
    documentType: "Notification Details",
    description: "Notification source, date, and requester details captured for ACT_03 evidence.",
    group: "Notification",
    delivery: "Electronic",
    title: "Notification Details",
  },
  {
    id: "DOC-170003-02",
    icon: "doc",
    caseType: "Notification",
    createdDate: NOTIFICATION_DATE,
    createdBy: "System Generated",
    status: "Completed",
    documentType: "eForm",
    description: "Ordered notification-details answers supporting ACT_03 evidence.",
    group: "Notification",
    delivery: "Electronic",
    title: "QuestionPathNotification Eform",
    eFormKind: "notification",
  },
];

const eForms = (): readonly CaseEForm[] => [
  {
    id: "EFORM-170003-01",
    kind: "notification",
    title: "QuestionPathNotification eForm — captured answers",
    rows: [
      { question: "Notification Source", answer: "Phone" },
      { question: "Notification Date", answer: "01/20/2026" },
      { question: "Requester Name", answer: "Derek Osei" },
      { question: "Requester Relationship", answer: "Self" },
    ],
  },
];

const notReached = (title: string): LookupContent => ({
  title,
  paragraphs: [],
  panels: [],
  links: [],
  tables: [],
});

const lookup = (): Process2Dossier["lookup"] => ({
  query: "",
  candidates: [],
  evidence: [],
  uKnow: notReached("uKnow — not reached (no GDC component)"),
  google: notReached("Google-style search — not reached (no GDC component)"),
  icd10Data: notReached("ICD-10 data — not reached (no GDC component)"),
  icdReference: notReached("ICD reference — not reached (no GDC component)"),
  chart: notReached("Diagnosis chart — not reached (no GDC component)"),
});

const summary = (): CaseSummary => ({
  title: "NTN-170003 — Derek Osei",
  status: "Escalated – Manual Review (Ineligible Intake Type)",
  bands: [
    { label: "Requester", value: "Derek Osei" },
    { label: "Date", value: "01/20/2026" },
    { label: "Intake Type", value: "Accommodation Only" },
    { label: "Status", value: "Escalated – Manual Review" },
  ],
  sidebarFacts: [
    { key: "case-exists", label: "Case Search", value: "Case ID found (DEC_01: yes)." },
    { key: "intake-covered", label: "Intake Coverage", value: "Not covered for automation (DEC_02: no)." },
  ],
});

const ownership = (): CaseOwnership => ({
  bands: [
    { label: "Assigned To", value: "Eligibility Specialist Team / Eligibility Specialist" },
    { label: "In Department", value: "Eligibility Specialist Team" },
  ],
  sidebarFacts: [
    { key: "ownership-note", label: "Note", value: "Automation coverage ends at ACT_18; remaining review is manual." },
  ],
});

const caseMap = (): CaseMapNode => ({
  id: "NTN-170003",
  type: "notification",
  label: "NTN-170003 — Notification",
  status: "Escalated – Manual Review",
  participants: [
    { name: "Derek Osei", role: "Requester", partyId: PARTY_ID },
    { name: EMPLOYER, role: "Employer" },
  ],
});

const tasks = (): Process2Dossier["tasks"] => [
  {
    id: "TASK-170003-01",
    name: "Manually review ineligible accommodation-only intake",
    status: "open",
    priority: "high",
    assignedTo: "Eligibility Specialist Team",
    dueDate: "2026-01-21",
  },
];

const alerts = (): Process2Dossier["alerts"] => [
  {
    id: "ALERT-170003-01",
    severity: "warning",
    message: "Accommodation-only intake is ineligible for automated case markup and requires manual review.",
  },
];

const nextActions = (): Process2Dossier["nextActions"] => [
  {
    id: "ACTION-170003-01",
    title: "Complete manual intake review",
    description: "Review the accommodation request outside the automated Leave and GDC process.",
    targetDate: "2026-01-21",
    status: "Open",
  },
];

const buildDossier = (profile: Process2PartyProfile): Process2Dossier => ({
  caseId: CASE_ID,
  intakeType: "accommodation_only",
  party: profile,
  summary: summary(),
  ownership: ownership(),
  caseMap: caseMap(),
  documents: documents(),
  eForms: eForms(),
  tasks: tasks(),
  alerts: alerts(),
  nextActions: nextActions(),
  lookup: lookup(),
});

const buildScenario = (): ScenarioExpectation => ({
  scenarioId: "NTN-170003",
  title: "Derek Osei / ACEDEX — accommodation-only intake ineligible for automation",
  decisions: { DEC_01: "yes", DEC_02: "no" },
  logic: {},
  terminal: {
    kind: "escalated",
    status: "ESCALATED_INELIGIBLE_INTAKE",
    reason: "Intake type 'accommodation_only' is not covered for automated case markup (DEC_02: no); escalated at ACT_18 for manual review.",
  },
});

const profile = buildProfile();

export const ntn170003Seed: Process2CaseSeed = {
  party: {
    id: PARTY_ID,
    fullName: "Derek Osei",
    partyType: "insured",
    details: profile,
    customerNumber: "84021",
    dateOfBirth: "1985-03-11",
    employer: EMPLOYER,
    phone: "(973) 555-0142",
    homePhone: "(973) 555-0198",
    email: "derek_osei.o91fk2@mailosaur.io",
  },
  notification: {
    id: CASE_ID,
    partyId: PARTY_ID,
    source: "Phone",
    notificationDate: NOTIFICATION_DATE,
    intakeType: "accommodation_only",
    status: "SUBMITTED",
  },
  dossier: buildDossier(profile),
  scenario: buildScenario(),
};
