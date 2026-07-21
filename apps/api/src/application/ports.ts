import type {
  CaseId,
  DomainResult,
  DraftComponentScope,
  ExecutionStatus,
  IntakeComponentScope,
  IntakeType,
  PartyId,
  PartyProfileDetails,
  Process2Dossier,
  RecentCaseRow,
  Submission,
} from "@fineos/contracts";

export type PartyType = "insured" | "medical_provider";

export type RunStatus = ExecutionStatus | "IN_FLIGHT";

export type PersistenceError =
  | { readonly kind: "DRAFT_NOT_FOUND"; readonly message: string }
  | { readonly kind: "EXECUTION_IN_PROGRESS"; readonly message: string };

export interface PartyRecord {
  readonly id: PartyId;
  readonly customerNumber: string | null;
  readonly fullName: string;
  readonly partyType: PartyType;
  readonly dateOfBirth: string | null;
  readonly employer: string | null;
  readonly phone: string | null;
  readonly homePhone: string | null;
  readonly email: string | null;
  readonly details: PartyProfileDetails | null;
}

export interface ContactInput {
  readonly phone: string | null;
  readonly email: string | null;
}

export interface ProviderInput {
  readonly firstName: string;
  readonly lastName: string;
}

export interface AbsencePeriodRecord {
  readonly id: string;
  readonly absenceCaseId: CaseId;
  readonly lastDayWorked: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface AbsenceCaseRecord {
  readonly id: CaseId;
  readonly notificationId: CaseId;
  readonly employeePartyId: PartyId;
  readonly leaveReason: string | undefined;
  readonly conditionDescription: string | undefined;
  readonly workState: string | undefined;
  readonly status: string;
  readonly periods: readonly AbsencePeriodRecord[];
}

export interface GdcCaseRecord {
  readonly id: CaseId;
  readonly notificationId: CaseId;
  readonly claimantPartyId: PartyId;
  readonly providerPartyId: PartyId | null;
  readonly diagnosisCode: string | null;
  readonly status: string;
}

export interface ExecutionRunRecord {
  readonly id: string;
  readonly caseId: CaseId;
  readonly status: RunStatus;
  readonly startedAt: string;
  readonly finishedAt: string | null;
}

export interface NotificationRecord {
  readonly id: CaseId;
  readonly partyId: PartyId;
  readonly source: string;
  readonly notificationDate: string;
  readonly scope: DraftComponentScope;
  readonly sections: Readonly<Record<string, unknown>>;
  readonly intakeType: IntakeType | undefined;
  readonly leaveReason: string | undefined;
  readonly conditionDescription: string | undefined;
  readonly workState: string | undefined;
  readonly absencePeriods: readonly AbsencePeriodInput[];
  readonly diagnosisCode: string | undefined;
  readonly providerPartyId: PartyId | undefined;
  readonly status: "DRAFT" | "SUBMITTED";
  // Parsed from sections_json when it holds a persisted Process 2 dossier; the
  // scenario_json column is never read here so evaluator metadata stays private.
  readonly dossier: Process2Dossier | null;
}

export interface SubmissionRecord {
  readonly notificationId: CaseId;
  readonly absenceCaseId: CaseId | null;
  readonly gdcCaseId: CaseId | null;
}

export interface NotificationDraftRow {
  readonly partyId: PartyId;
  readonly source: string;
  readonly notificationDate: string;
}

export interface CaseSummaryRecord {
  readonly caseId: CaseId;
  readonly partyName: string;
  readonly scope: DraftComponentScope;
  readonly status: "DRAFT" | "SUBMITTED";
}

export interface AbsencePeriodInput {
  readonly lastDayWorked: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface SectionSave {
  readonly key: string;
  readonly body: Readonly<Record<string, unknown>>;
  readonly source?: string;
  readonly notificationDate?: string;
  readonly scope?: IntakeComponentScope;
  readonly intakeType?: IntakeType;
  readonly leaveReason?: string;
  readonly conditionDescription?: string | null;
  readonly workState?: string;
  readonly absencePeriods?: readonly AbsencePeriodInput[];
  readonly diagnosisCode?: string;
  readonly providerPartyId?: PartyId;
}

export interface ComponentCases {
  readonly absence: AbsenceCaseRecord | undefined;
  readonly gdc: GdcCaseRecord | undefined;
}

export interface OutcomeCommit {
  readonly runId: string;
  readonly status: ExecutionStatus;
  readonly gdcCaseId: CaseId | null;
  readonly diagnosisCode: string | null;
  readonly providerPartyId: string | null;
}

export interface PartyRepository {
  findById(id: PartyId): PartyRecord | undefined;
  search(term: string): readonly PartyRecord[];
  updateContact(id: PartyId, contact: ContactInput): PartyRecord | undefined;
  createProvider(input: ProviderInput): PartyRecord;
}

export interface NotificationRepository {
  createDraft(input: NotificationDraftRow): CaseId;
  findById(id: CaseId): NotificationRecord | undefined;
  saveSection(id: CaseId, section: SectionSave): void;
  submit(id: CaseId, plan: Submission): DomainResult<SubmissionRecord, PersistenceError>;
}

export interface CaseRepository {
  findAbsenceCase(id: CaseId): AbsenceCaseRecord | undefined;
  findGdcCase(id: CaseId): GdcCaseRecord | undefined;
  findComponentCases(notificationId: CaseId): ComponentCases;
  search(term: string): readonly CaseSummaryRecord[];
  recent(): readonly RecentCaseRow[];
  startExecution(caseId: CaseId): DomainResult<ExecutionRunRecord, PersistenceError>;
  finishExecution(runId: string, status: ExecutionStatus): void;
  commitOutcome(commit: OutcomeCommit): void;
  findLatestRun(caseId: CaseId): ExecutionRunRecord | undefined;
  findRun(runId: string): ExecutionRunRecord | undefined;
}
