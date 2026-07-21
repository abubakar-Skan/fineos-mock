import {
  toCaseId,
  toPartyId,
  type AbsenceCalendar,
  type AbsenceComponent,
  type AbsenceConditionDetails,
  type AbsenceHub,
  type CaseAlert,
  type CaseDocument,
  type CaseEForm,
  type CaseId,
  type CaseLookup,
  type CaseMapNode,
  type CaseNextAction,
  type CaseOwnership,
  type CaseSummary,
  type CaseTask,
  type DossierField,
  type DossierPanel,
  type GdcComponent,
  type LeavePlan,
  type LeaveRequest,
  type LookupContent,
  type PartyAddress,
  type PartyId,
  type PartyIdentifier,
  type Process2Dossier,
  type Process2PartyProfile,
  type ProviderSearch,
  type ScenarioExpectation,
} from "@fineos/contracts";
import type {
  AbsenceCaseSeedRow,
  AbsencePeriodSeedRow,
  GdcCaseSeedRow,
  NotificationSeedRow,
  PartySeedRow,
  Process2CaseSeed,
} from "./types";

// NTN-170004 — Elena Ruiz / Fifth Third Bank National Association.
// Intake Summary captured a serious-health-condition leave reason but left the
// condition description blank, so DEC_04 answers "no" and ACT_22 escalates the
// run to END_CONDITIONS_NOT_MET before ACT_23/ACT_24/FORK_02 run. That is why
// component scope (LGC_01), diagnosis (LGC_02/LGC_03), DEC_05, and the GDC
// provider/diagnosis are all omitted below rather than defaulted or nulled:
// the run never reaches the steps that would produce them.
const CASE_ID: CaseId = toCaseId("NTN-170004");
const ABSENCE_CASE_ID: CaseId = toCaseId("NTN-170004-ABS-01");
const GDC_CASE_ID: CaseId = toCaseId("NTN-170004-GDC-02");
const PARTY_ID: PartyId = toPartyId("PTY-91042");

const EMPLOYER = "Fifth Third Bank National Association";
const NOTIFICATION_DATE = "2026-02-10";
const PERIOD_START = "2026-02-10";
const PERIOD_END = "2026-03-20";
const LAST_DAY_WORKED = "2026-02-09";
const WORK_STATE = "OH";
const MISSING_CONDITION_MESSAGE =
  "Send the case to manual review because the required condition description is unavailable.";

const field = (key: string, label: string, value: string): DossierField => ({ key, label, value });

const panel = (id: string, title: string, fields: readonly DossierField[]): DossierPanel => ({
  id,
  title,
  fields,
});

const partyIdentifiers: readonly PartyIdentifier[] = [
  { type: "Social Security Number", value: "114-55-4471", maskedValue: "xxxxx4471" },
];

const partyAddresses: readonly PartyAddress[] = [
  {
    type: "Mailing",
    line1: "482 Vine Street",
    city: "Cincinnati",
    region: "OH",
    postalCode: "45202",
    country: "USA",
    effectiveFrom: "2024-03-01",
  },
];

const profilePanels: readonly DossierPanel[] = [
  panel("name", "Name", [field("name", "Name", "Elena Ruiz"), field("verified", "Verified", "Yes")]),
  panel("identification", "Personal Identification", [
    field("idType", "Identification number type", "Social Security Number"),
    field("idNumber", "Identification number", "114-55-4471"),
    field("dob", "Date of birth", "06/14/1985"),
    field("gender", "Gender", "Female"),
    field("maritalStatus", "Marital status", "Married"),
  ]),
  panel("additional", "Additional Information", [
    field("partyType", "Party type", "Insured"),
    field("occupation", "Occupation", "Branch Operations Specialist"),
  ]),
  panel("nationality", "Nationality", [
    field("nationality", "Nationality", "United States"),
    field("countryOfBirth", "Country of birth", "United States"),
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
  panel("occupations", "Occupations", [field("current", "Current", "Branch Operations Specialist")]),
];

const contactPanels: readonly DossierPanel[] = [
  panel("mobile", "Mobile", [
    field("number", "Number", "(513) 555-0148"),
    field("status", "Status", "Verified"),
  ]),
  panel("email", "Email", [
    field("email", "Email", "elena.ruiz@example.com"),
    field("status", "Status", "Verified"),
  ]),
];

const communicationPreferences: readonly DossierPanel[] = [
  panel("writtenCorrespondence", "Written Correspondence", [
    field("goPaperless", "Go paperless", "Yes"),
    field("sendVia", "Send notification of correspondence via", "Email"),
  ]),
  panel("notificationUpdates", "Notification of Updates", [
    field("sms", "Notify on update via SMS", "No"),
    field("email", "Notify on update via Email", "Yes"),
    field("sendTo", "Send email to", "elena.ruiz@example.com"),
  ]),
  panel("directCommunication", "Direct Communication", [
    field("preferredMethod", "Preferred contact method", "Email"),
  ]),
];

const occupationEmploymentPanels: readonly DossierPanel[] = [
  panel("memberDetails", "Member Details", [
    field("employer", "Employer", `${EMPLOYER} (Member ID: 91042)`),
    field("masterPlan", "Master Plan", `${EMPLOYER} Main Master Plan`),
  ]),
  panel("occupationDetails", "Occupation Details", [
    field("jobTitle", "Job Title", "Branch Operations Specialist"),
    field("dateOfHire", "Date of Hire", "09/10/2018"),
    field("employmentStatus", "Employment Status", "Active"),
    field("hoursPerWeek", "Hours worked per week", "40"),
  ]),
];

const partyProfile: Process2PartyProfile = {
  partyId: PARTY_ID,
  fullName: "Elena Ruiz",
  customerNumber: "91042",
  gender: "Female",
  maritalStatus: "Married",
  preferredLanguage: "English",
  identifiers: partyIdentifiers,
  addresses: partyAddresses,
  profilePanels,
  contactPanels,
  communicationPreferences,
  occupationEmploymentPanels,
};

const partySeedRow: PartySeedRow<Process2PartyProfile> = {
  id: PARTY_ID,
  fullName: "Elena Ruiz",
  partyType: "insured",
  details: partyProfile,
  customerNumber: "91042",
  dateOfBirth: "1985-06-14",
  employer: EMPLOYER,
  phone: "(513) 555-0148",
  email: "elena.ruiz@example.com",
};

const notificationSeedRow: NotificationSeedRow = {
  id: CASE_ID,
  partyId: PARTY_ID,
  source: "Phone",
  notificationDate: NOTIFICATION_DATE,
  intakeType: "leave_and_gdc",
  status: "SUBMITTED",
  scope: "leave_and_gdc",
};

// conditionDescription is omitted: Intake Summary (ACT_21) captured no value,
// which is exactly what drives DEC_04 to "no".
const absenceCaseSeedRow: AbsenceCaseSeedRow = {
  id: ABSENCE_CASE_ID,
  notificationId: CASE_ID,
  employeePartyId: PARTY_ID,
  status: "OPEN",
  leaveReason: "serious_health_condition",
  workState: WORK_STATE,
};

const absencePeriodSeedRow: AbsencePeriodSeedRow = {
  id: "AP-170004-01",
  absenceCaseId: ABSENCE_CASE_ID,
  lastDayWorked: LAST_DAY_WORKED,
  startDate: PERIOD_START,
  endDate: PERIOD_END,
};

// providerPartyId/diagnosisCode are omitted: ACT_29/DEC_05 never run because
// FORK_02 never activates the GDC track for this case.
const gdcCaseSeedRow: GdcCaseSeedRow = {
  id: GDC_CASE_ID,
  notificationId: CASE_ID,
  claimantPartyId: PARTY_ID,
  status: "OPEN",
};

const caseSummary: CaseSummary = {
  title: `Notification ${CASE_ID}`,
  status: "Open",
  bands: [
    { label: "Employer", value: EMPLOYER },
    { label: "Leave Reason", value: "Serious Health Condition - Employee" },
    { label: "Work State", value: WORK_STATE },
  ],
  sidebarFacts: [
    field("notificationDate", "Notification Date", "02/10/2026"),
    field("automationStatus", "Automation Status", "Escalated — Conditions Not Met"),
  ],
};

const caseOwnership: CaseOwnership = {
  bands: [
    { label: "Assigned To", value: "Eligibility Specialist Team / Eligibility Specialist" },
    { label: "In Department", value: "Eligibility Specialist Team" },
  ],
  sidebarFacts: [field("adminGroup", "Admin Group", "Unknown")],
};

const caseMap: CaseMapNode = {
  id: CASE_ID,
  type: "notification",
  label: "Notification",
  status: "SUBMITTED",
  participants: [
    { name: "Elena Ruiz", role: "Requester", partyId: PARTY_ID },
    { name: EMPLOYER, role: "Employer" },
  ],
  children: [
    {
      id: ABSENCE_CASE_ID,
      type: "absence_case",
      label: "Absence Case",
      status: "OPEN",
      participants: [
        { name: "Elena Ruiz", role: "Employee", partyId: PARTY_ID },
        { name: EMPLOYER, role: "Employer" },
      ],
      route: `/cases/${ABSENCE_CASE_ID}/absence-hub`,
    },
    {
      id: GDC_CASE_ID,
      type: "gdc_case",
      label: "Group Disability Claim",
      status: "OPEN",
      participants: [{ name: "Elena Ruiz", role: "Claimant", partyId: PARTY_ID }],
      route: `/cases/${GDC_CASE_ID}/claim-hub`,
    },
  ],
};

const documents: readonly CaseDocument[] = [
  {
    id: "DOC-170004-01", icon: "pdf", caseType: "Absence Case", createdDate: NOTIFICATION_DATE,
    createdBy: "Elena Ruiz", status: "Completed", documentType: "Intake Summary",
    description: "intake-summary.pdf", group: "System Generated", delivery: "Unknown", title: "Intake Summary",
  },
  {
    id: "DOC-170004-02", icon: "pdf", caseType: "Absence Case", createdDate: NOTIFICATION_DATE,
    createdBy: "Elena Ruiz", status: "Unknown", documentType: "QuestionPathAbsence Eform",
    description: "Condition description left blank.", group: "System Generated", delivery: "Unknown",
    title: "QuestionPathAbsence Eform", eFormKind: "absence",
  },
  {
    id: "DOC-170004-03", icon: "pdf", caseType: "Group Disability Claim", createdDate: NOTIFICATION_DATE,
    createdBy: "Elena Ruiz", status: "Completed", documentType: "Intake Summary",
    description: "intake-summary.pdf", group: "System Generated", delivery: "Unknown", title: "Intake Summary",
  },
  {
    id: "DOC-170004-04", icon: "pdf", caseType: "Group Disability Claim", createdDate: NOTIFICATION_DATE,
    createdBy: "Elena Ruiz", status: "Unknown", documentType: "QuestionPathClaim Eform",
    description: "", group: "System Generated", delivery: "Unknown", title: "QuestionPathClaim Eform",
    eFormKind: "claim",
  },
];

// The blank answer below is the deliberate reproduction of the missing
// condition description: the row exists on the eForm, its value is "".
const eForms: readonly CaseEForm[] = [
  {
    id: "EFORM-170004-ABS",
    kind: "absence",
    title: "QuestionPathAbsenceEform",
    rows: [
      { question: "Event Date", answer: "02/10/2026" },
      { question: "Event Type", answer: "Sickness" },
      { question: "Expected RTW Date", answer: "03/20/2026" },
      { question: "Absence Type", answer: "2" },
      { question: "Absence Frequency", answer: "Continuous" },
      { question: "Can you provide a brief description of the reason for your leave of absence?", answer: "" },
      { question: "Leave Reason", answer: "Serious Health Condition - Employee" },
      { question: "Reason Qualifier1", answer: "Not Work Related" },
      { question: "Reason Qualifier2", answer: "Sickness" },
    ],
  },
  {
    id: "EFORM-170004-GDC",
    kind: "claim",
    title: "QuestionPathClaimEform",
    rows: [
      { question: "Event Date", answer: "02/10/2026" },
      { question: "Accident/Sickness", answer: "Sickness" },
      { question: "Last Day Worked", answer: LAST_DAY_WORKED },
    ],
  },
];

const notPerformedLookup = (title: string): LookupContent => ({
  title,
  paragraphs: [
    "Lookup was not performed: execution escalated at ACT_22 (DEC_04 = no) before the diagnosis step ACT_29 was reached.",
  ],
  panels: [],
  links: [],
  tables: [],
});

const lookup: CaseLookup = {
  query: "",
  candidates: [],
  evidence: [],
  uKnow: notPerformedLookup("uKnow"),
  google: notPerformedLookup("Google-style Search"),
  icd10Data: notPerformedLookup("ICD-10 Data"),
  icdReference: notPerformedLookup("ICD Reference"),
  chart: notPerformedLookup("Diagnosis Chart"),
};

const absenceHub: AbsenceHub = {
  decisionProgress: "Adjudication",
  firstNotifiedOn: NOTIFICATION_DATE,
  returnToWork: { expectedDate: PERIOD_END, actualDate: "", intention: "Returning to full time work" },
  calendar: {
    title: "Absence Calendar",
    month: "February 2026",
    entries: [
      { id: "AP-170004-01", label: "Absence Period", status: "Pending", range: `${PERIOD_START} to ${PERIOD_END}` },
    ],
  } satisfies AbsenceCalendar,
  sharedNotes: "",
};

const leaveRequests: readonly LeaveRequest[] = [
  {
    id: "LR-170004-01",
    requestedFrom: PERIOD_START,
    requestedThrough: PERIOD_END,
    reason: "serious_health_condition",
    qualifiers: ["Not Work Related", "Sickness"],
  },
];

const leavePlans: readonly LeavePlan[] = [
  { name: "Fed FMLA", selectionMethod: "Automatic", applicability: "Applicable", evaluation: "Undecided" },
];

// description is "" — the deliberate absence-row reproduction of the blank
// Intake Summary field that causes DEC_04 to evaluate "no".
const absenceCondition: AbsenceConditionDetails = {
  leaveReason: "serious_health_condition",
  workState: WORK_STATE,
  description: "",
  fields: [
    field("conditionDescription", "Condition Description", ""),
    field("reasonQualifier", "Reason Qualifier", "Sickness"),
  ],
};

const absence: AbsenceComponent = {
  caseId: ABSENCE_CASE_ID,
  employeePartyId: PARTY_ID,
  status: "OPEN",
  hub: absenceHub,
  leavePanels: [
    panel("leaveRequest", "Leave Requests", [
      field("requestedFrom", "Requested From", PERIOD_START),
      field("requestedThrough", "Requested Through", PERIOD_END),
      field("reason", "Reason", "Serious Health Condition - Employee"),
    ]),
  ],
  leaveRequests,
  leavePlans,
  periods: [
    { lastDayWorked: LAST_DAY_WORKED, startDate: PERIOD_START, endDate: PERIOD_END, status: "Pending", pattern: "Continuous" },
  ],
  condition: absenceCondition,
  employmentPanels: occupationEmploymentPanels,
};

const providerSearch: ProviderSearch = { criteria: [], candidates: [] };

const gdcTasks: readonly CaseTask[] = [
  {
    id: "TASK-170004-01",
    name: "Confirm medical condition description",
    status: "open",
    priority: "high",
    assignedTo: "Eligibility Specialist Team",
    dueDate: "2026-02-17",
  },
];

const gdcAlerts: readonly CaseAlert[] = [
  { id: "ALERT-170004-01", severity: "error", message: MISSING_CONDITION_MESSAGE },
];

const gdcNextActions: readonly CaseNextAction[] = [
  {
    id: "NA-170004-01",
    title: "Provide medical condition description",
    description:
      "Automation escalated before the Absence/GDC fork because Intake Summary captured no condition description for the serious health condition leave reason.",
    targetDate: "2026-02-17",
    status: "open",
    route: `/cases/${ABSENCE_CASE_ID}/leave-details`,
  },
];

// incident/surgery/returnToWork/medicalSummary stay populated with the
// non-medical intake facts that were captured; the Provider and Diagnosis
// rows are simply not added to medicalSummary — DEC_05/ACT_29/ACT_30 never
// ran, so there is nothing determined to report for either field.
const gdc: GdcComponent = {
  caseId: GDC_CASE_ID,
  claimantPartyId: PARTY_ID,
  status: "OPEN",
  claimPanels: [panel("claimDecision", "Claim Decision", [field("timeToDecision", "Time to Decision", "Pending")])],
  incident: panel("incident", "Incident", [
    field("lastDayWorked", "Last Day Worked", LAST_DAY_WORKED),
    field("accidentSickness", "Accident/Sickness", "Sickness"),
    field("condition", "Condition", ""),
    field("dateFirstUnableToWork", "Date First Unable to Work", PERIOD_START),
  ]),
  surgery: panel("surgery", "Surgery", [field("expectedSurgeryDate", "Expected (first) Surgery Date", "-")]),
  returnToWork: panel("returnToWork", "Return To Work", [
    field("expectedReturn", "Expected return to work date", PERIOD_END),
    field("actualReturn", "Actual return to work date", "-"),
  ]),
  medicalSummary: panel("medicalSummary", "Medical", [
    field("firstTreatment", "Date of First Treatment", "-"),
    field("lifeExpectancy", "Life Expectancy", "Unknown"),
  ]),
  medicalPanels: [],
  diagnoses: [],
  providers: [],
  providerSearch,
  tasks: gdcTasks,
  alerts: gdcAlerts,
  nextActions: gdcNextActions,
};

// componentScope is omitted: ACT_24 (the step that resolves it, ahead of
// FORK_02) never runs because ACT_22 escalates the case first.
const dossier: Process2Dossier = {
  caseId: CASE_ID,
  intakeType: "leave_and_gdc",
  scope: "leave_and_gdc",
  party: partyProfile,
  summary: caseSummary,
  ownership: caseOwnership,
  caseMap,
  documents,
  eForms,
  tasks: gdcTasks,
  alerts: gdcAlerts,
  nextActions: gdcNextActions,
  lookup,
  absence,
  gdc,
};

// decisions.DEC_05 and logic (LGC_01–LGC_03) are omitted: none of the steps
// that would produce them (ACT_24 component-scope resolution, ACT_29 diagnosis
// resolution, DEC_05 provider-details branch) run before ACT_22 escalates.
const scenario: ScenarioExpectation = {
  scenarioId: "NTN-170004-conditions-not-met",
  title: "Elena Ruiz / Fifth Third Bank — condition description omitted, automation escalates before the component fork",
  decisions: { DEC_01: "yes", DEC_02: "yes", DEC_03: "yes", DEC_04: "no" },
  logic: {},
  terminal: {
    kind: "escalated",
    status: "ESCALATED_CONDITIONS_NOT_MET",
    reason:
      "Case Search finds NTN-170004, leave_and_gdc intake is covered, and the leave reason is a serious health condition, but Intake Summary captured no condition description. ACT_22 escalates for manual review (END_CONDITIONS_NOT_MET) before ACT_24/FORK_02 activate the Absence and GDC tracks.",
  },
};

export const ntn170004Seed: Process2CaseSeed = {
  party: partySeedRow,
  notification: notificationSeedRow,
  dossier,
  scenario,
  absenceCase: absenceCaseSeedRow,
  absencePeriods: [absencePeriodSeedRow],
  gdcCase: gdcCaseSeedRow,
};
