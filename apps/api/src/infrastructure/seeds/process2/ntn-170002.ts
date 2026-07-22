import {
  createDiagnosisCode,
  toCaseId,
  toPartyId,
  type CaseDocument,
  type CaseEForm,
  type CaseLookup,
  type CaseMapNode,
  type CaseOwnership,
  type CaseSummary,
  type DiagnosisCandidate,
  type DiagnosisCode,
  type DiagnosisEntry,
  type DossierPanel,
  type DossierTable,
  type GdcComponent,
  type LookupContent,
  type LookupEvidence,
  type PartyAddress,
  type PartyIdentifier,
  type Process2Dossier,
  type Process2PartyProfile,
  type ProviderDetails,
  type ProviderSearch,
} from "@fineos/contracts";
import type { PartyType } from "../../../application/ports";
import type { Process2CaseSeed } from "./types";

// Carla Nguyen / ACEDEX: a covered GDC-only intake that completes end to end
// (DEC_01..DEC_05 all resolved, no escalation) with a non-serious leave reason
// (DEC_03 = no, so DEC_04 never fires) and no medical provider ever attached
// (DEC_05 = no). There is no Absence component, so `dossier.absence` and
// `absenceCase`/`absencePeriods` are omitted rather than nulled out.

const CASE_ID = toCaseId("NTN-170002");
const GDC_CASE_ID = toCaseId("NTN-170002-GDC-02");
const CARLA_PARTY_ID = toPartyId("PTY-CARLA");
const TRAVIS_PARTY_ID = toPartyId("PTY-TRAVIS");
const PRIMARY_DIAGNOSIS_CODE = "M25.561";

const primaryDiagnosisCode = (): DiagnosisCode => {
  const result = createDiagnosisCode(PRIMARY_DIAGNOSIS_CODE);
  if (!result.ok) throw new Error("Seed diagnosis code must be valid");
  return result.value;
};

const carlaIdentifiers = (): readonly PartyIdentifier[] => [
  { type: "Social Security Number", value: "552-41-0093", maskedValue: "XXX-XX-0093" },
];

const carlaAddresses = (): readonly PartyAddress[] => [
  {
    type: "Home",
    line1: "48 Birchwood Lane",
    city: "Newark",
    region: "DE",
    postalCode: "19711",
    country: "USA",
    effectiveFrom: "2019-06-10",
  },
];

const carlaProfilePanels = (): readonly DossierPanel[] => [
  {
    id: "identity",
    title: "Identity",
    fields: [
      { key: "nameVerified", label: "Name / Verified", value: "Carla Nguyen / Yes" },
      { key: "identification", label: "Identification", value: "Social Security Number · 552-41-0093" },
      { key: "dobAgeGender", label: "DOB / Age / Gender", value: "04/22/1986 / 39 / Female" },
      { key: "partyType", label: "Party type", value: "Insured" },
      { key: "maritalNationality", label: "Marital status / Nationality", value: "Married / Unknown" },
    ],
  },
];

const carlaContactPanels = (): readonly DossierPanel[] => [
  {
    id: "contact-details",
    title: "Contact Details",
    fields: [
      { key: "mobile", label: "Mobile", value: "(302) 555-0148 — Verified" },
      { key: "email", label: "Email", value: "carla_nguyen.gd45xk@mailosaur.io — Verified" },
      { key: "homePhone", label: "Home phone", value: "(302) 555-0199 — Verified" },
    ],
  },
];

const carlaCommunicationPreferences = (): readonly DossierPanel[] => [
  {
    id: "communication-preferences",
    title: "Communication Preferences",
    fields: [
      { key: "writtenCorrespondence", label: "Written correspondence", value: "Go paperless: Yes · sent via email" },
      { key: "notificationOfUpdates", label: "Notification of updates", value: "Notify via SMS: No · Notify via Email: Yes" },
      { key: "directCommunication", label: "Direct communication", value: "Preferred contact method: Email" },
    ],
  },
];

const carlaOccupationPanels = (): readonly DossierPanel[] => [
  {
    id: "occupation",
    title: "Occupation",
    fields: [
      { key: "employer", label: "Employer", value: "ACEDEX (Member ID 34129087)" },
      { key: "dateOfHire", label: "Date of Hire", value: "06/10/2019" },
      { key: "employmentStatus", label: "Employment Status", value: "Active" },
      { key: "jobTitle", label: "Job Title", value: "Senior Claims Analyst" },
      { key: "daysWorkedPerWeek", label: "Days worked per week", value: "5.00" },
    ],
  },
];

const carlaProfile = (): Process2PartyProfile => ({
  partyId: CARLA_PARTY_ID,
  fullName: "Carla Nguyen",
  customerNumber: "84512",
  gender: "Female",
  maritalStatus: "Married",
  preferredLanguage: "English",
  identifiers: carlaIdentifiers(),
  addresses: carlaAddresses(),
  profilePanels: carlaProfilePanels(),
  contactPanels: carlaContactPanels(),
  communicationPreferences: carlaCommunicationPreferences(),
  occupationEmploymentPanels: carlaOccupationPanels(),
});

const caseSummary = (): CaseSummary => ({
  title: "NTN-170002 — Carla Nguyen",
  status: "Open",
  bands: [
    { label: "Employer", value: "ACEDEX" },
    { label: "Intake Type", value: "Group Disability Claim" },
    { label: "Component Scope", value: "GDC Only" },
  ],
  sidebarFacts: [
    { key: "caseId", label: "Case ID", value: "NTN-170002" },
    { key: "claimant", label: "Claimant", value: "Carla Nguyen" },
    { key: "status", label: "Status", value: "Open" },
  ],
});

const caseOwnership = (): CaseOwnership => ({
  bands: [
    { label: "Assigned To", value: "Eligibility Specialist Team / Eligibility Specialist" },
    { label: "In Department", value: "Eligibility Specialist Team" },
  ],
  sidebarFacts: [{ key: "owner", label: "Owner", value: "Eligibility Specialist Team" }],
});

const caseMap = (): CaseMapNode => ({
  id: CASE_ID,
  type: "notification",
  label: "NTN-170002 — Notification (Submitted)",
  status: "Submitted",
  participants: [
    { name: "Carla Nguyen", role: "Requester", partyId: CARLA_PARTY_ID },
    { name: "ACEDEX", role: "Employer" },
  ],
  route: "/cases/NTN-170002",
  children: [
    {
      id: GDC_CASE_ID,
      type: "gdc_case",
      label: "NTN-170002-GDC-02 — Group Disability Claim (Open)",
      status: "Open",
      participants: [{ name: "Carla Nguyen", role: "Claimant", partyId: CARLA_PARTY_ID }],
      route: "/cases/NTN-170002-GDC-02",
    },
  ],
});

const caseDocuments = (): readonly CaseDocument[] => [
  {
    id: "DOC-170002-01",
    icon: "pdf",
    caseType: "Notification",
    createdDate: "2026-03-02",
    createdBy: "System",
    status: "Completed",
    documentType: "Intake Summary",
    description: "System generated intake summary",
    group: "Notification",
    delivery: "Electronic",
    title: "Intake Summary (System Generated)",
  },
  {
    id: "DOC-170002-02",
    icon: "doc",
    caseType: "Group Disability Claim",
    createdDate: "2026-03-02",
    createdBy: "System",
    status: "Completed",
    documentType: "eForm",
    description: "Captured QuestionPathClaim answers",
    group: "Group Disability Claim",
    delivery: "Electronic",
    title: "QuestionPathClaim eForm",
    eFormKind: "claim",
  },
  {
    id: "DOC-170002-03",
    icon: "pdf",
    caseType: "Group Disability Claim",
    createdDate: "2026-03-02",
    createdBy: "Eligibility Specialist",
    status: "Completed",
    documentType: "Policy Info",
    description: "ACEDEX group disability policy provisions",
    group: "Group Disability Claim",
    delivery: "Electronic",
    title: "Policy Provisions Document",
  },
];

const claimEForm = (): CaseEForm => ({
  id: "EFORM-170002-CLAIM",
  kind: "claim",
  title: "QuestionPathClaim eForm",
  rows: [
    { question: "Event Date", answer: "02/24/2026" },
    { question: "Event Type", answer: "Sickness" },
    { question: "Expected RTW Date", answer: "Not applicable — no absence period" },
    { question: "Absence Type / Frequency", answer: "Not applicable" },
    { question: "Reason for claim", answer: "Right knee pain, evaluated outpatient" },
    { question: "Leave Reason", answer: "Other — not a serious health condition" },
    { question: "Reason Qualifier 1 / 2", answer: "Not Work Related / Sickness" },
    { question: "Surgery or procedure", answer: "Right knee arthroscopy (outpatient)" },
  ],
});

const diagnosisCandidates = (): readonly DiagnosisCandidate[] => [
  { code: "M25.561", description: "Pain in right knee", category: "Musculoskeletal", evidenceIds: ["EV-01", "EV-02"] },
  { code: "M25.562", description: "Pain in left knee", category: "Musculoskeletal", evidenceIds: ["EV-02"] },
  { code: "M79.604", description: "Pain in unspecified limb, right leg", category: "Musculoskeletal", evidenceIds: ["EV-01"] },
];

const diagnosisEvidence = (): readonly LookupEvidence[] => [
  {
    id: "EV-01",
    source: "uKnow (KMS Lighthouse)",
    excerpt: "Preferred resources for ICD-10 coding point to ICD10Data.com and the Common ICD-10 Codes chart for joint-pain claims.",
    supportedCodes: ["M25.561", "M79.604"],
    route: "/lookups/uknow",
  },
  {
    id: "EV-02",
    source: "ICD10Data.com",
    excerpt: "M25.561 Pain in right knee — billable ICD-10-CM diagnosis code.",
    supportedCodes: ["M25.561", "M25.562"],
    route: "/lookups/icd10-data",
  },
];

const uKnowContent = (): LookupContent => ({
  title: "UNUM Inside / uKnow (KMS Lighthouse)",
  paragraphs: ["Non-FINEOS exception. The internal knowledge base points to the ICD-10 resources used below."],
  panels: [
    {
      id: "uknow-search",
      title: "GetAnswer",
      fields: [
        { key: "topNav", label: "Top nav", value: "Inside · Glossary · Mainframe Password Reset · uKnow Help" },
        { key: "search", label: "Search", value: "“resources to locate icd 10 codes for knee pain” — 8,214 results in 0.71s" },
        { key: "preferredResources", label: "Preferred resources", value: "ICD 10 Data · Google · Common ICD-10 Codes & Medical Category" },
      ],
    },
  ],
  links: [
    { label: "ICD10Data.com", route: "/lookups/icd10-data" },
    { label: "Common ICD-10 Codes & Medical Category", route: "/lookups/chart" },
  ],
  tables: [],
});

const googleContent = (): LookupContent => ({
  title: "Google search",
  paragraphs: ["Non-FINEOS exception. The specialist cross-references Google, ICD10Data.com and the Common ICD-10 chart."],
  panels: [
    {
      id: "google-search",
      title: "Search",
      fields: [
        { key: "query", label: "Query", value: "“what is the ICD 10 diagnosis code for right knee pain”" },
        { key: "keyCodes", label: "Key codes (AI overview)", value: "M25.561 right knee · M25.562 left knee · M79.604 right leg" },
        { key: "source", label: "Source", value: "ICD10Data.com — Pain in Joint ICD-10 Codes" },
      ],
    },
  ],
  links: [{ label: "ICD10Data.com", route: "/lookups/icd10-data" }],
  tables: [],
});

const icd10DataTable = (): DossierTable => ({
  id: "icd10-knee-codes",
  columns: ["Code", "Description"],
  rows: [
    { id: "r1", cells: ["M25.561", "Pain in right knee"] },
    { id: "r2", cells: ["M25.562", "Pain in left knee"] },
    { id: "r3", cells: ["M79.604", "Pain in unspecified limb, right leg"] },
  ],
});

const icd10DataContent = (): LookupContent => ({
  title: "ICD10Data.com",
  paragraphs: ["Free 2026 ICD-10-CM/PCS coding reference (Codes · Indexes · Conversion · DRG · Rules)."],
  panels: [],
  links: [],
  tables: [icd10DataTable()],
});

const icdReferenceContent = (): LookupContent => ({
  title: "ICD Codes: Reference Sheet",
  paragraphs: ["Internal doc — Acquisition & Servicing › Underwriting › OMEGA System › Claims Data."],
  panels: [
    {
      id: "icd-reference",
      title: "Reference",
      fields: [{ key: "selectedCode", label: "Selected code", value: "M25.561 — Pain in right knee" }],
    },
  ],
  links: [],
  tables: [],
});

const chartTable = (): DossierTable => ({
  id: "common-icd10-chart",
  columns: ["Code", "Description"],
  rows: [
    { id: "c1", cells: ["Z00.0", "Annual Physical"] },
    { id: "c2", cells: ["M25.561", "Pain in right knee"] },
    { id: "c3", cells: ["M79.604", "Pain in unspecified limb, right leg"] },
  ],
});

const chartContent = (): LookupContent => ({
  title: "Common ICD-10 Codes Chart",
  paragraphs: ["Test scenario: the looked-up knee codes and the code finally entered are internally coherent."],
  panels: [],
  links: [],
  tables: [chartTable()],
});

const caseLookup = (): CaseLookup => ({
  query: "resources to locate icd 10 codes for knee pain",
  candidates: diagnosisCandidates(),
  evidence: diagnosisEvidence(),
  uKnow: uKnowContent(),
  google: googleContent(),
  icd10Data: icd10DataContent(),
  icdReference: icdReferenceContent(),
  chart: chartContent(),
});

const claimHubPanels = (): readonly DossierPanel[] => [
  {
    id: "claim-summary",
    title: "Claim Hub — Claim Summary",
    fields: [
      {
        key: "tabs",
        label: "Tabs",
        value: "Claim Hub · General Claim · Case History · Medical · Occupation · Tasks · Documents · Contacts · Insured · Outstanding Requirements",
      },
      { key: "claimDecision", label: "Claim Decision", value: "Time to Decision: 2 days" },
      { key: "nextActionsCount", label: "Next Actions (1)", value: "Attach medical provider" },
    ],
  },
];

const incidentPanel = (): DossierPanel => ({
  id: "incident",
  title: "Incident",
  fields: [
    { key: "lastDayWorked", label: "Last Day Worked", value: "02/23/2026" },
    { key: "accidentSickness", label: "Accident/Sickness", value: "Sickness" },
    { key: "dateOfIncident", label: "Date of Incident", value: "02/20/2026" },
    { key: "dateFirstUnableToWork", label: "Date First Unable to Work", value: "Not applicable — no work stoppage" },
    { key: "numberOfDependents", label: "Number of Dependents", value: "1" },
  ],
});

const surgeryPanel = (): DossierPanel => ({
  id: "surgery",
  title: "Surgery",
  fields: [
    { key: "surgeryOrProcedure", label: "Surgery or Procedure", value: "Right knee arthroscopy (outpatient)" },
    { key: "surgeryDate", label: "Surgery Date", value: "02/25/2026" },
    { key: "typeOfSurgery", label: "Type of Surgery", value: "Medically Necessary" },
  ],
});

const returnToWorkPanel = (): DossierPanel => ({
  id: "return-to-work",
  title: "Return to Work",
  fields: [
    { key: "expectedReturnToWork", label: "Expected Return to Work", value: "Not applicable — continuous full duty" },
    { key: "actualReturnToWork", label: "Actual Return to Work", value: "Not applicable — did not stop work" },
    { key: "intentionToReturn", label: "Intention to Return", value: "Remained at full duty throughout the claim" },
  ],
});

const medicalSummaryPanel = (): DossierPanel => ({
  id: "medical-summary",
  title: "Medical Summary",
  fields: [
    { key: "provider", label: "Provider", value: "Not yet attached — search in progress" },
    { key: "dateOfFirstTreatment", label: "Date of First Treatment", value: "02/24/2026" },
    { key: "diagnosis", label: "Diagnosis", value: "M25.561: Pain in right knee" },
  ],
});

const medicalDetailsPanels = (): readonly DossierPanel[] => [
  {
    id: "medical-details",
    title: "Medical Details",
    fields: [
      { key: "dateFirstUnableToWork", label: "Date First Unable To Work", value: "Not applicable — no absence period" },
      { key: "dateOfFirstTreatment", label: "Date of First Treatment", value: "02/24/2026" },
      { key: "condition", label: "Condition", value: "Sickness" },
      { key: "conditionCategory", label: "Condition Category", value: "Other Condition" },
      { key: "typeOfSurgery", label: "Type of Surgery", value: "Medically Necessary" },
      { key: "lifeExpectancy", label: "Life Expectancy", value: "Unknown" },
      { key: "primaryDiagnosis", label: "Primary Diagnosis", value: "M25.561: Pain in right knee" },
    ],
  },
];

// ACT_15 target starts empty: the diagnosis below is manually persisted
// through the target-state endpoint, not seeded. dossier.lookup.candidates
// (including PRIMARY_DIAGNOSIS_CODE) remains as source evidence for entry.
const gdcDiagnoses = (): readonly DiagnosisEntry[] => [];

const travisCertifications = () => [
  { group: "Unknown", type: "Unknown", status: "Active", effectiveFrom: "2026-01-29" },
];

const travisPanels = (): readonly DossierPanel[] => [
  {
    id: "provider-details",
    title: "Provider Details (Travis Larson, Cust# 607440 — read-only)",
    fields: [
      { key: "nationalProviderIdentifier", label: "National Provider Identifier", value: "0" },
      { key: "providerType", label: "Provider Type", value: "Unknown" },
      { key: "approvalStartDate", label: "Approval Start Date", value: "01/29/2026" },
      { key: "note", label: "Note", value: "Application is operating in read-only mode." },
    ],
  },
];

const travisProviderDetails = (): ProviderDetails => ({
  partyId: TRAVIS_PARTY_ID,
  fullName: "Travis Larson",
  customerNumber: "607440",
  nationalProviderIdentifier: "0",
  providerType: "Unknown",
  serviceGroup: "Unknown",
  approvalIndicator: "Approved",
  approvalStartDate: "2026-01-29",
  approvalEndDate: "2099-12-31",
  certifications: travisCertifications(),
  panels: travisPanels(),
});

const providerSearchCriteria = (): DossierPanel["fields"] => [
  { key: "searchBy", label: "Search by", value: "Person / Organization / Both (Person)" },
  { key: "firstLastName", label: "First / Last Name", value: "Travis / Larson" },
  { key: "certificationGroupType", label: "Certification Group / Type", value: "Unknown / Unknown" },
];

const providerSearch = (): ProviderSearch => ({
  criteria: providerSearchCriteria(),
  candidates: [travisProviderDetails()],
});

const gdcTasks = () => [
  {
    id: "TASK-170002-01",
    name: "Verify medical provider details",
    status: "open" as const,
    priority: "medium" as const,
    assignedTo: "Eligibility Specialist",
    dueDate: "2026-03-09",
  },
];

const gdcAlerts = () => [
  { id: "ALERT-170002-01", severity: "warning" as const, message: "Medical provider not yet attached to the GDC case." },
];

const gdcNextActions = () => [
  {
    id: "NA-170002-01",
    title: "Attach medical provider",
    description: "Search and attach the treating provider once details are confirmed.",
    targetDate: "2026-03-09",
    status: "open",
    route: "/cases/NTN-170002-GDC-02/provider",
  },
];

const gdcComponent = (): GdcComponent => ({
  caseId: GDC_CASE_ID,
  claimantPartyId: CARLA_PARTY_ID,
  status: "OPEN",
  claimPanels: claimHubPanels(),
  incident: incidentPanel(),
  surgery: surgeryPanel(),
  returnToWork: returnToWorkPanel(),
  medicalSummary: medicalSummaryPanel(),
  medicalPanels: medicalDetailsPanels(),
  diagnoses: gdcDiagnoses(),
  providers: [],
  providerSearch: providerSearch(),
  tasks: gdcTasks(),
  alerts: gdcAlerts(),
  nextActions: gdcNextActions(),
});

const dossier = (): Process2Dossier => ({
  caseId: CASE_ID,
  intakeType: "gdc",
  scope: "gdc_only",
  componentScope: "gdc_only",
  party: carlaProfile(),
  summary: caseSummary(),
  ownership: caseOwnership(),
  caseMap: caseMap(),
  documents: caseDocuments(),
  eForms: [claimEForm()],
  tasks: gdcTasks(),
  alerts: gdcAlerts(),
  nextActions: gdcNextActions(),
  lookup: caseLookup(),
  gdc: gdcComponent(),
});

const travisPartySeedRow = () => ({
  id: TRAVIS_PARTY_ID,
  fullName: "Travis Larson",
  partyType: "medical_provider" as PartyType,
  details: travisProviderDetails(),
  customerNumber: "607440",
});

export const ntn170002Seed: Process2CaseSeed = {
  party: {
    id: CARLA_PARTY_ID,
    fullName: "Carla Nguyen",
    partyType: "insured",
    details: carlaProfile(),
    customerNumber: "84512",
    dateOfBirth: "1986-04-22",
    employer: "ACEDEX",
    phone: "(302) 555-0148",
    homePhone: "(302) 555-0199",
    email: "carla_nguyen.gd45xk@mailosaur.io",
  },
  notification: {
    id: CASE_ID,
    partyId: CARLA_PARTY_ID,
    source: "Phone",
    notificationDate: "2026-03-02",
    intakeType: "gdc",
    status: "SUBMITTED",
    scope: "gdc_only",
  },
  dossier: dossier(),
  scenario: {
    scenarioId: "SC-NTN-170002",
    title: "Carla Nguyen — ACEDEX GDC-only case completes with a diagnosis and no attached provider",
    decisions: {
      DEC_01: "yes",
      DEC_02: "yes",
      DEC_03: "no",
      DEC_05: "no",
    },
    logic: {
      LGC_01: "gdc_only",
      LGC_02: primaryDiagnosisCode(),
    },
    terminal: {
      kind: "completed",
      status: "COMPLETED",
      activatedTracks: ["gdc"],
    },
  },
  // diagnosisCode is omitted: the ACT_15 target is manually persisted through
  // the target-state endpoint, not seeded.
  gdcCase: {
    id: GDC_CASE_ID,
    notificationId: CASE_ID,
    claimantPartyId: CARLA_PARTY_ID,
    status: "OPEN",
  },
  providers: [travisPartySeedRow()],
};
