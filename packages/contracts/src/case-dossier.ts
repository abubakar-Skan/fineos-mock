import type {
  CaseId,
  ComponentScope,
  DiagnosisCode,
  ExecutionStatus,
  ExecutionTrack,
  IntakeType,
  LeaveReason,
} from "./case-execution";
import type { IntakeComponentScope } from "./notification";
import type { PartyId } from "./party";

export interface DossierField {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly route?: string;
}

export interface DossierPanel {
  readonly id: string;
  readonly title: string;
  readonly fields: readonly DossierField[];
}

export interface DossierBand {
  readonly label: string;
  readonly value: string;
}

export interface DossierTableRow {
  readonly id: string;
  readonly cells: readonly string[];
}

export interface DossierTable {
  readonly id: string;
  readonly columns: readonly string[];
  readonly rows: readonly DossierTableRow[];
}

export interface PartyIdentifier {
  readonly type: string;
  readonly value: string;
  readonly maskedValue?: string;
}

export interface PartyAddress {
  readonly type: string;
  readonly line1: string;
  readonly city: string;
  readonly region: string;
  readonly postalCode: string;
  readonly country: string;
  readonly line2?: string;
  readonly effectiveFrom?: string;
  readonly effectiveTo?: string;
}

export interface Process2PartyProfile {
  readonly partyId: PartyId;
  readonly fullName: string;
  readonly customerNumber: string;
  readonly gender: string;
  readonly maritalStatus: string;
  readonly preferredLanguage: string;
  readonly identifiers: readonly PartyIdentifier[];
  readonly addresses: readonly PartyAddress[];
  readonly profilePanels: readonly DossierPanel[];
  readonly contactPanels: readonly DossierPanel[];
  readonly communicationPreferences: readonly DossierPanel[];
  readonly occupationEmploymentPanels: readonly DossierPanel[];
}

export type CaseDocumentIcon = "doc" | "pdf";

export type CaseEFormKind = "notification" | "claim" | "absence";

export interface CaseDocument {
  readonly id: string;
  readonly icon: CaseDocumentIcon;
  readonly caseType: string;
  readonly createdDate: string;
  readonly createdBy: string;
  readonly status: string;
  readonly documentType: string;
  readonly description: string;
  readonly group: string;
  readonly delivery: string;
  readonly title: string;
  readonly eFormKind?: CaseEFormKind;
}

export interface EFormAnswer {
  readonly question: string;
  readonly answer: string;
}

export interface CaseEForm {
  readonly id: string;
  readonly kind: CaseEFormKind;
  readonly title: string;
  readonly rows: readonly EFormAnswer[];
}

export type CaseNodeType =
  | "notification"
  | "absence_case"
  | "gdc_case"
  | "benefit";

export interface CaseMapParticipant {
  readonly name: string;
  readonly role: string;
  readonly partyId?: PartyId;
}

export interface CaseMapNode {
  readonly id: string;
  readonly type: CaseNodeType;
  readonly label: string;
  readonly status: string;
  readonly participants: readonly CaseMapParticipant[];
  readonly route?: string;
  readonly children?: readonly CaseMapNode[];
}

export interface CaseOwnership {
  readonly bands: readonly DossierBand[];
  readonly sidebarFacts: readonly DossierField[];
}

export interface CaseSummary {
  readonly title: string;
  readonly status: string;
  readonly bands: readonly DossierBand[];
  readonly sidebarFacts: readonly DossierField[];
}

export interface AbsenceOverdue {
  readonly label: string;
  readonly days: number;
  readonly date: string;
}

export interface ReturnToWorkDetails {
  readonly expectedDate: string;
  readonly actualDate: string;
  readonly intention: string;
}

export interface AbsenceCalendarEntry {
  readonly id: string;
  readonly label: string;
  readonly status: string;
  readonly range: string;
}

export interface AbsenceCalendar {
  readonly title: string;
  readonly month: string;
  readonly entries: readonly AbsenceCalendarEntry[];
}

export interface AbsenceHub {
  readonly decisionProgress: string;
  readonly firstNotifiedOn: string;
  readonly returnToWork: ReturnToWorkDetails;
  readonly calendar: AbsenceCalendar;
  readonly sharedNotes: string;
  readonly overdue?: AbsenceOverdue;
}

export interface LeaveRequest {
  readonly id: string;
  readonly requestedFrom: string;
  readonly requestedThrough: string;
  readonly reason: string;
  readonly qualifiers: readonly string[];
}

export interface LeavePlan {
  readonly name: string;
  readonly selectionMethod: string;
  readonly applicability: string;
  readonly evaluation: string;
}

export interface AbsencePeriodDossier {
  readonly lastDayWorked: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: string;
  readonly pattern: string;
}

export interface AbsenceConditionDetails {
  readonly leaveReason: LeaveReason;
  readonly workState: string;
  readonly description: string;
  readonly fields: readonly DossierField[];
}

export interface AbsenceComponent {
  readonly caseId: CaseId;
  readonly employeePartyId: PartyId;
  readonly status: string;
  readonly hub: AbsenceHub;
  readonly leavePanels: readonly DossierPanel[];
  readonly leaveRequests: readonly LeaveRequest[];
  readonly leavePlans: readonly LeavePlan[];
  readonly periods: readonly AbsencePeriodDossier[];
  readonly condition: AbsenceConditionDetails;
  readonly employmentPanels: readonly DossierPanel[];
}

export interface DiagnosisEntry {
  readonly level: string;
  readonly type: string;
  readonly code: string;
  readonly description: string;
  readonly severity: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string;
}

export interface ProviderCertification {
  readonly group: string;
  readonly type: string;
  readonly status: string;
  readonly effectiveFrom?: string;
  readonly effectiveTo?: string;
}

export interface ProviderDetails {
  readonly partyId: PartyId;
  readonly fullName: string;
  readonly customerNumber: string;
  readonly nationalProviderIdentifier: string;
  readonly providerType: string;
  readonly serviceGroup: string;
  readonly approvalIndicator: string;
  readonly approvalStartDate: string;
  readonly approvalEndDate: string;
  readonly certifications: readonly ProviderCertification[];
  readonly panels: readonly DossierPanel[];
}

export interface ProviderSearch {
  readonly criteria: readonly DossierField[];
  readonly candidates: readonly ProviderDetails[];
}

export type TaskStatus = "open" | "in_progress" | "completed";

export type TaskPriority = "low" | "medium" | "high";

export interface CaseTask {
  readonly id: string;
  readonly name: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly assignedTo?: string;
  readonly dueDate?: string;
}

export type AlertSeverity = "info" | "warning" | "error";

export interface CaseAlert {
  readonly id: string;
  readonly severity: AlertSeverity;
  readonly message: string;
}

export interface CaseNextAction {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly targetDate: string;
  readonly status: string;
  readonly route?: string;
}

export interface GdcComponent {
  readonly caseId: CaseId;
  readonly claimantPartyId: PartyId;
  readonly status: string;
  readonly claimPanels: readonly DossierPanel[];
  readonly incident: DossierPanel;
  readonly surgery: DossierPanel;
  readonly returnToWork: DossierPanel;
  readonly medicalSummary: DossierPanel;
  readonly medicalPanels: readonly DossierPanel[];
  readonly diagnoses: readonly DiagnosisEntry[];
  readonly providers: readonly ProviderDetails[];
  readonly providerSearch: ProviderSearch;
  readonly tasks: readonly CaseTask[];
  readonly alerts: readonly CaseAlert[];
  readonly nextActions: readonly CaseNextAction[];
}

export interface DiagnosisCandidate {
  readonly code: string;
  readonly description: string;
  readonly category?: string;
  readonly evidenceIds: readonly string[];
}

export interface LookupEvidence {
  readonly id: string;
  readonly source: string;
  readonly excerpt: string;
  readonly supportedCodes: readonly string[];
  readonly route?: string;
}

export interface LookupLink {
  readonly label: string;
  readonly route: string;
}

export interface LookupContent {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly panels: readonly DossierPanel[];
  readonly links: readonly LookupLink[];
  readonly tables: readonly DossierTable[];
}

export interface CaseLookup {
  readonly query: string;
  readonly candidates: readonly DiagnosisCandidate[];
  readonly evidence: readonly LookupEvidence[];
  readonly uKnow: LookupContent;
  readonly google: LookupContent;
  readonly icd10Data: LookupContent;
  readonly icdReference: LookupContent;
  readonly chart: LookupContent;
}

export type PartyProfileDetails = Process2PartyProfile | ProviderDetails;

export type RecentCaseKind = "notification" | "absence" | "gdc";

export interface RecentCaseRow {
  readonly caseId: CaseId;
  readonly kind: RecentCaseKind;
  readonly label: string;
  readonly description: string;
  readonly partyName: string;
}

export interface Process2Dossier {
  readonly caseId: CaseId;
  readonly intakeType: IntakeType;
  readonly scope?: IntakeComponentScope;
  readonly componentScope?: ComponentScope;
  readonly party: Process2PartyProfile;
  readonly summary: CaseSummary;
  readonly ownership: CaseOwnership;
  readonly caseMap: CaseMapNode;
  readonly documents: readonly CaseDocument[];
  readonly eForms: readonly CaseEForm[];
  readonly tasks: readonly CaseTask[];
  readonly alerts: readonly CaseAlert[];
  readonly nextActions: readonly CaseNextAction[];
  readonly lookup: CaseLookup;
  readonly absence?: AbsenceComponent;
  readonly gdc?: GdcComponent;
}

export type EscalationStatus = Exclude<ExecutionStatus, "COMPLETED">;

export type BinaryDecision = "yes" | "no";

export interface ExpectedProcess2Decisions {
  readonly DEC_01: BinaryDecision;
  readonly DEC_02?: BinaryDecision;
  readonly DEC_03?: BinaryDecision;
  readonly DEC_04?: BinaryDecision;
  readonly DEC_05?: BinaryDecision;
}

export interface ExpectedProcess2Logic {
  readonly LGC_01?: ComponentScope;
  readonly LGC_02?: DiagnosisCode;
  readonly LGC_03?: AbsenceConditionDetails;
}

export type ExpectedTerminal =
  | {
      readonly kind: "completed";
      readonly status: "COMPLETED";
      readonly activatedTracks: readonly ExecutionTrack[];
    }
  | {
      readonly kind: "escalated";
      readonly status: EscalationStatus;
      readonly reason: string;
    };

export interface ScenarioExpectation {
  readonly scenarioId: string;
  readonly title: string;
  readonly decisions: ExpectedProcess2Decisions;
  readonly logic: ExpectedProcess2Logic;
  readonly terminal: ExpectedTerminal;
}
