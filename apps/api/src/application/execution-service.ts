import {
  createDiagnosisCode,
  toCaseId,
  type ApiResult,
  type CaseId,
  type ComponentScope,
  type ConditionDescriptionPresence,
  type DiagnosisCodePresence,
  type DraftComponentScope,
  type ExecutionError,
  type ExecutionInput,
  type ExecutionOutcome,
  type ExecutionStatus,
  type ExecutionTrack,
  type IntakeComponentScope,
  type IntakeType,
  type LeaveReason,
  type PartyId,
  type Process2Dossier,
  type RecentCaseRow,
} from "@fineos/contracts";
import { executeCase } from "../domain/case-execution";
import { apiErr, apiOk } from "./api-result";
import { synthesizeDossier } from "./dossier-view";
import { validateProvider, type ProviderError } from "./provider-validation";
import type {
  AbsenceCaseRecord,
  CaseRepository,
  CaseSummaryRecord,
  ComponentCases,
  ExecutionRunRecord,
  GdcCaseRecord,
  NotificationRecord,
  NotificationRepository,
  PartyRecord,
  PartyRepository,
} from "./ports";

const VALID_OVERRIDES: readonly ExecutionStatus[] = [
  "COMPLETED", "ESCALATED_CASE_NOT_FOUND", "ESCALATED_INELIGIBLE_INTAKE",
  "ESCALATED_CONDITIONS_NOT_MET",
];

const INTAKE_BY_SCOPE: Record<IntakeComponentScope, IntakeType> = {
  leave_only: "leave",
  gdc_only: "gdc",
  leave_and_gdc: "leave_and_gdc",
};

const COMPONENT_BY_SCOPE: Record<IntakeComponentScope, ComponentScope> = {
  leave_only: "absence_only",
  gdc_only: "gdc_only",
  leave_and_gdc: "absence_and_gdc",
};

const TRACKS_BY_SCOPE: Record<ComponentScope, readonly ExecutionTrack[]> = {
  absence_only: ["absence"],
  gdc_only: ["gdc"],
  absence_and_gdc: ["absence", "gdc"],
};

export interface ExecutionDecisions {
  readonly conditionDescription?: string;
  readonly diagnosisCode?: string;
  readonly providerDecision?: ProviderDecision;
  readonly override?: string;
}

export type ProviderDecision =
  | { readonly kind: "attach"; readonly providerPartyId: PartyId }
  | { readonly kind: "skip" };

export interface ExecutionResult extends ExecutionOutcome {
  readonly runId: string;
}

export interface CaseNotificationView {
  readonly id: CaseId;
  readonly partyId: PartyId;
  readonly source: string;
  readonly notificationDate: string;
  readonly scope: DraftComponentScope;
  readonly status: "DRAFT" | "SUBMITTED";
}

export interface CaseDetails {
  readonly dossier: Process2Dossier;
  readonly notification: CaseNotificationView;
  readonly absence: AbsenceCaseRecord | undefined;
  readonly gdc: GdcCaseRecord | undefined;
  readonly claimant: PartyRecord;
  readonly provider: PartyRecord | null;
}

export interface ExecutionDeps {
  readonly notifications: NotificationRepository;
  readonly cases: CaseRepository;
  readonly parties: PartyRepository;
}

type ExecuteError =
  | "case_not_found" | "execution_in_progress" | "case_already_terminal"
  | "invalid_decision_override" | "missing_diagnosis_code" | ProviderError;

export interface ExecutionService {
  searchCases(term: string): ApiResult<readonly CaseSummaryRecord[], never>;
  recentCases(): ApiResult<readonly RecentCaseRow[], never>;
  getCase(id: string): ApiResult<CaseDetails, "case_not_found">;
  execute(id: string, decisions: ExecutionDecisions): ApiResult<ExecutionResult, ExecuteError>;
  getRun(id: string, runId: string): ApiResult<ExecutionRunRecord, "case_not_found">;
}

export const createExecutionService = (deps: ExecutionDeps): ExecutionService => ({
  searchCases: (term) => apiOk(deps.cases.search(term)),
  recentCases: () => apiOk(deps.cases.recent()),
  getCase: (id) => getCase(deps, id),
  execute: (id, decisions) => execute(deps, id, decisions),
  getRun: (id, runId) => getRun(deps, id, runId),
});

const getCase = (
  deps: ExecutionDeps,
  id: string,
): ApiResult<CaseDetails, "case_not_found"> => {
  const caseId = toCaseId(id);
  const notification = deps.notifications.findById(caseId);
  if (!notification) return caseNotFound(id);
  const claimant = deps.parties.findById(notification.partyId);
  if (!claimant) return caseNotFound(id);
  const components = deps.cases.findComponentCases(caseId);
  return apiOk(caseDetails(deps, notification, components, claimant));
};

const caseDetails = (
  deps: ExecutionDeps, notification: NotificationRecord,
  components: ComponentCases, claimant: PartyRecord,
): CaseDetails => ({
  dossier: notification.dossier ?? synthesizeDossier(notification, components, claimant),
  notification: notificationView(notification),
  claimant, absence: components.absence, gdc: components.gdc,
  provider: findProvider(deps, components.gdc),
});

const notificationView = (notification: NotificationRecord): CaseNotificationView => ({
  id: notification.id,
  partyId: notification.partyId,
  source: notification.source,
  notificationDate: notification.notificationDate,
  scope: notification.scope,
  status: notification.status,
});

const findProvider = (deps: ExecutionDeps, gdc?: GdcCaseRecord): PartyRecord | null =>
  gdc?.providerPartyId ? deps.parties.findById(gdc.providerPartyId) ?? null : null;

const getRun = (
  deps: ExecutionDeps,
  id: string,
  runId: string,
): ApiResult<ExecutionRunRecord, "case_not_found"> => {
  const run = deps.cases.findRun(runId);
  if (!run || run.caseId !== toCaseId(id)) return caseNotFound(id);
  return apiOk(run);
};

const execute = (
  deps: ExecutionDeps,
  id: string,
  decisions: ExecutionDecisions,
): ApiResult<ExecutionResult, ExecuteError> => {
  const override = validateOverride(decisions.override);
  if (!override.ok) return override;
  const notification = deps.notifications.findById(toCaseId(id));
  if (!notification) return caseNotFound(id);
  const provider = validateExecutionProvider(deps.parties, decisions.providerDecision);
  if (!provider.ok) return provider;
  const terminal = guardTerminal(deps, notification.id);
  if (!terminal.ok) return terminal;
  return evaluateAndRun(
    deps, notification, { ...decisions, providerDecision: provider.value }, override.value,
  );
};

const validateExecutionProvider = (
  parties: PartyRepository,
  decision: ProviderDecision | undefined,
): ApiResult<ProviderDecision | undefined, ProviderError> => {
  if (!decision || decision.kind === "skip") return apiOk(decision);
  const provider = validateProvider(parties, decision.providerPartyId);
  return provider.ok ? apiOk(decision) : provider;
};

const guardTerminal = (
  deps: ExecutionDeps,
  caseId: CaseId,
): ApiResult<undefined, "case_already_terminal"> => {
  const latest = deps.cases.findLatestRun(caseId);
  return latest && latest.status !== "IN_FLIGHT"
    ? apiErr("case_already_terminal", `Case ${caseId} already reached a terminal run.`)
    : apiOk(undefined);
};

const evaluateAndRun = (
  deps: ExecutionDeps,
  notification: NotificationRecord,
  decisions: ExecutionDecisions,
  override: ExecutionStatus | undefined,
): ApiResult<ExecutionResult, ExecuteError> => {
  const components = deps.cases.findComponentCases(notification.id);
  const outcome = resolveOutcome(notification, components, decisions, override);
  if (!outcome.ok) return outcome;
  return persistRun(deps, notification.id, components, decisions, outcome.value);
};

const persistRun = (
  deps: ExecutionDeps,
  caseId: CaseId,
  components: ComponentCases,
  decisions: ExecutionDecisions,
  outcome: ExecutionOutcome,
): ApiResult<ExecutionResult, "execution_in_progress"> => {
  const started = deps.cases.startExecution(caseId);
  if (!started.ok) return apiErr("execution_in_progress", started.error.message);
  commit(deps, started.value.id, outcome, components, decisions);
  return apiOk({ ...outcome, runId: started.value.id });
};

const resolveOutcome = (
  notification: NotificationRecord,
  components: ComponentCases,
  decisions: ExecutionDecisions,
  override: ExecutionStatus | undefined,
): ApiResult<ExecutionOutcome, "missing_diagnosis_code" | "case_not_found"> => {
  if (override) return apiOk(overrideOutcome(notification, override));
  const result = executeCase(buildInput(notification, components, decisions));
  return result.ok ? apiOk(result.value) : executionFailure(result.error);
};

const executionFailure = (
  error: ExecutionError,
): ApiResult<never, "missing_diagnosis_code" | "case_not_found"> =>
  error.kind === "MISSING_DIAGNOSIS_CODE"
    ? apiErr("missing_diagnosis_code", error.message)
    : caseNotFound("");

const overrideOutcome = (
  notification: NotificationRecord,
  status: ExecutionStatus,
): ExecutionOutcome => {
  if (status !== "COMPLETED") return escalated(notification.id, status);
  const tracks = TRACKS_BY_SCOPE[toComponentScope(notification)];
  return completed(notification.id, tracks, tracks.includes("gdc"));
};

const buildInput = (
  notification: NotificationRecord,
  components: ComponentCases,
  decisions: ExecutionDecisions,
): ExecutionInput => ({
  caseId: notification.id,
  caseFound: (components.absence ?? components.gdc) !== undefined,
  intakeType: notification.intakeType ?? INTAKE_BY_SCOPE[toScope(notification)],
  leaveReason: mapLeaveReason(components.absence?.leaveReason),
  conditionDescription: conditionPresence(savedCondition(notification, components, decisions)),
  componentScope: toComponentScope(notification),
  diagnosisCode: diagnosisPresence(
    decisions.diagnosisCode ?? components.gdc?.diagnosisCode ?? undefined,
  ),
  providerAttached: hasProvider(components.gdc, decisions),
});

const savedCondition = (
  notification: NotificationRecord,
  components: ComponentCases,
  decisions: ExecutionDecisions,
): string | undefined =>
  decisions.conditionDescription
  ?? components.absence?.conditionDescription
  ?? notification.conditionDescription;

const toScope = (notification: NotificationRecord): IntakeComponentScope =>
  notification.scope.kind === "selected" ? notification.scope.value : "leave_only";

const toComponentScope = (notification: NotificationRecord): ComponentScope =>
  COMPONENT_BY_SCOPE[toScope(notification)];

const commit = (
  deps: ExecutionDeps,
  runId: string,
  outcome: ExecutionOutcome,
  components: ComponentCases,
  decisions: ExecutionDecisions,
): void => {
  deps.cases.commitOutcome({
    runId,
    status: outcome.status,
    gdcCaseId: outcome.diagnosisUpdated && components.gdc ? components.gdc.id : null,
    diagnosisCode: decisions.diagnosisCode ?? null,
    providerPartyId: attachedProvider(decisions.providerDecision),
  });
};

const attachedProvider = (decision: ProviderDecision | undefined): PartyId | null =>
  decision?.kind === "attach" ? decision.providerPartyId : null;

const validateOverride = (
  override: string | undefined,
): ApiResult<ExecutionStatus | undefined, "invalid_decision_override"> => {
  if (override === undefined) return apiOk(undefined);
  if (isOverride(override)) return apiOk(override);
  return apiErr("invalid_decision_override", `Decision override ${override} is not recognized.`);
};

const isOverride = (value: string): value is ExecutionStatus =>
  (VALID_OVERRIDES as readonly string[]).includes(value);

const mapLeaveReason = (reason: string | undefined): LeaveReason => {
  if (reason === "serious_health_condition") return reason;
  if (reason === "pregnancy") return reason;
  return "other";
};

const conditionPresence = (value: string | undefined): ConditionDescriptionPresence =>
  value ? { kind: "provided", value } : { kind: "missing" };

const diagnosisPresence = (value: string | undefined): DiagnosisCodePresence => {
  if (!value) return { kind: "missing" };
  const created = createDiagnosisCode(value);
  return created.ok ? { kind: "provided", value: created.value } : { kind: "missing" };
};

const hasProvider = (
  gdc: GdcCaseRecord | undefined,
  decisions: ExecutionDecisions,
): boolean => {
  if (decisions.providerDecision?.kind === "skip") return false;
  if (decisions.providerDecision?.kind === "attach") return true;
  return (gdc?.providerPartyId ?? null) !== null;
};

const completed = (
  caseId: CaseId,
  tracks: readonly ExecutionTrack[],
  gdc: boolean,
): ExecutionOutcome => ({
  caseId, status: "COMPLETED", activatedTracks: tracks,
  diagnosisUpdated: gdc, providerUpdated: gdc,
});

const escalated = (caseId: CaseId, status: ExecutionStatus): ExecutionOutcome => ({
  caseId, status, activatedTracks: [], diagnosisUpdated: false, providerUpdated: false,
});

const caseNotFound = (id: string) => apiErr("case_not_found", `Case ${id} was not found.`);
