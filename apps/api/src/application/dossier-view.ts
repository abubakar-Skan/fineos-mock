import type {
  AbsenceComponent,
  CaseLookup,
  CaseMapNode,
  GdcComponent,
  LookupContent,
  Process2Dossier,
  Process2PartyProfile,
} from "@fineos/contracts";
import type {
  AbsenceCaseRecord,
  ComponentCases,
  GdcCaseRecord,
  NotificationRecord,
  PartyRecord,
} from "./ports";

// Builds a coherent, entirely DB-derived dossier for notifications that were
// generated at runtime (no persisted Process 2 dossier). Seeded cases return
// their stored dossier and never reach here.
export const synthesizeDossier = (
  notification: NotificationRecord,
  components: ComponentCases,
  claimant: PartyRecord,
): Process2Dossier => ({
  caseId: notification.id,
  intakeType: notification.intakeType ?? "leave",
  party: partyProfile(claimant),
  summary: { title: `Notification ${notification.id}`, status: notification.status, bands: [], sidebarFacts: [] },
  ownership: { bands: [], sidebarFacts: [] },
  caseMap: caseMap(notification, components, claimant),
  documents: [],
  eForms: [],
  tasks: [],
  alerts: [],
  nextActions: [],
  lookup: emptyLookup(),
  absence: components.absence ? absenceComponent(components.absence) : undefined,
  gdc: components.gdc ? gdcComponent(components.gdc) : undefined,
});

const partyProfile = (claimant: PartyRecord): Process2PartyProfile => {
  const details = claimant.details;
  if (details && "profilePanels" in details) return details;
  return minimalProfile(claimant);
};

const minimalProfile = (claimant: PartyRecord): Process2PartyProfile => ({
  partyId: claimant.id,
  fullName: claimant.fullName,
  customerNumber: claimant.customerNumber ?? "—",
  gender: "Unknown",
  maritalStatus: "Unknown",
  preferredLanguage: "English",
  identifiers: [],
  addresses: [],
  profilePanels: [],
  contactPanels: [],
  communicationPreferences: [],
  occupationEmploymentPanels: [],
});

const caseMap = (
  notification: NotificationRecord,
  components: ComponentCases,
  claimant: PartyRecord,
): CaseMapNode => ({
  id: notification.id,
  type: "notification",
  label: "Notification",
  status: notification.status,
  participants: [{ name: claimant.fullName, role: "Requester", partyId: claimant.id }],
  route: `/cases/${notification.id}/general`,
  children: [...absenceNodes(components, claimant), ...gdcNodes(components, claimant)],
});

const absenceNodes = (components: ComponentCases, claimant: PartyRecord): readonly CaseMapNode[] =>
  components.absence
    ? [{ id: components.absence.id, type: "absence_case", label: "Absence Case", status: components.absence.status, participants: [{ name: claimant.fullName, role: "Employee", partyId: claimant.id }], route: `/cases/${components.absence.id}/absence-hub` }]
    : [];

const gdcNodes = (components: ComponentCases, claimant: PartyRecord): readonly CaseMapNode[] =>
  components.gdc
    ? [{ id: components.gdc.id, type: "gdc_case", label: "Group Disability Claim", status: components.gdc.status, participants: [{ name: claimant.fullName, role: "Claimant", partyId: claimant.id }], route: `/cases/${components.gdc.id}/claim-hub` }]
    : [];

const absenceComponent = (record: AbsenceCaseRecord): AbsenceComponent => ({
  caseId: record.id,
  employeePartyId: record.employeePartyId,
  status: record.status,
  hub: {
    decisionProgress: record.status,
    firstNotifiedOn: "-",
    returnToWork: { expectedDate: "-", actualDate: "-", intention: "-" },
    calendar: { title: "Absence Calendar", month: "-", entries: absenceEntries(record) },
    sharedNotes: "-",
  },
  leavePanels: [],
  leaveRequests: [],
  leavePlans: [],
  periods: record.periods.map((period) => ({ lastDayWorked: period.lastDayWorked, startDate: period.startDate, endDate: period.endDate, status: "Pending", pattern: "Continuous" })),
  condition: {
    leaveReason: leaveReason(record.leaveReason),
    workState: record.workState ?? "-",
    description: record.conditionDescription ?? "-",
    fields: [],
  },
  employmentPanels: [],
});

const absenceEntries = (record: AbsenceCaseRecord) =>
  record.periods.map((period, index) => ({ id: `${record.id}-${index}`, label: "Leave", status: "Pending", range: `${period.startDate} - ${period.endDate}` }));

const leaveReason = (value: string | undefined) =>
  value === "serious_health_condition" || value === "pregnancy" ? value : "other";

const gdcComponent = (record: GdcCaseRecord): GdcComponent => ({
  caseId: record.id,
  claimantPartyId: record.claimantPartyId,
  status: record.status,
  claimPanels: [],
  incident: { id: "incident", title: "Incident", fields: [] },
  surgery: { id: "surgery", title: "Surgery", fields: [] },
  returnToWork: { id: "return-to-work", title: "Return To Work", fields: [] },
  medicalSummary: { id: "medical", title: "Medical", fields: [] },
  medicalPanels: [],
  diagnoses: gdcDiagnoses(record),
  providers: [],
  providerSearch: { criteria: [], candidates: [] },
  tasks: [],
  alerts: [],
  nextActions: [],
});

const gdcDiagnoses = (record: GdcCaseRecord) =>
  record.diagnosisCode
    ? [{ level: "Primary", type: "ICD-10-CM", code: record.diagnosisCode, description: "-", severity: "N/A", effectiveFrom: "N/A", effectiveTo: "N/A" }]
    : [];

const emptyLookup = (): CaseLookup => ({
  query: "",
  candidates: [],
  evidence: [],
  uKnow: emptyContent("uKnow"),
  google: emptyContent("Google"),
  icd10Data: emptyContent("ICD10Data"),
  icdReference: emptyContent("ICD Reference"),
  chart: emptyContent("ICD Chart"),
});

const emptyContent = (title: string): LookupContent => ({ title, paragraphs: [], panels: [], links: [], tables: [] });
