import {
  fail,
  succeed,
  type CaseId,
  type ComponentScope,
  type DomainResult,
  type ExecutionError,
  type ExecutionInput,
  type ExecutionOutcome,
  type ExecutionStatus,
  type ExecutionTrack,
  type IntakeType,
  type LeaveReason,
} from "@fineos/contracts";

// ponytail: AOP's kb_intake_coverage_rules (DEC_02) is not enumerated; assuming
// leave/gdc types are covered and accommodation-only is not. Upgrade path: replace
// this constant with the real coverage table once the KB source is available.
const COVERED_INTAKE_TYPES: readonly IntakeType[] = [
  "leave",
  "gdc",
  "leave_and_gdc",
];

const SERIOUS_LEAVE_REASONS: readonly LeaveReason[] = [
  "serious_health_condition",
  "pregnancy",
];

const TRACKS_BY_SCOPE: Record<ComponentScope, readonly ExecutionTrack[]> = {
  absence_only: ["absence"],
  gdc_only: ["gdc"],
  absence_and_gdc: ["absence", "gdc"],
};

type EscalationStatus = Exclude<ExecutionStatus, "COMPLETED">;

type EscalationDecision =
  | { readonly kind: "continue" }
  | { readonly kind: "escalate"; readonly status: EscalationStatus };

export const executeCase = (
  input: ExecutionInput,
): DomainResult<ExecutionOutcome, ExecutionError> => {
  if (isBlank(input.caseId)) return fail(missingCaseId());
  const escalation = resolveEscalation(input);
  if (escalation.kind === "escalate") {
    return succeed(escalatedOutcome(input.caseId, escalation.status));
  }
  return completeExecution(input);
};

const resolveEscalation = (input: ExecutionInput): EscalationDecision => {
  if (!input.caseFound) return escalate("ESCALATED_CASE_NOT_FOUND");
  if (!isCovered(input.intakeType)) return escalate("ESCALATED_INELIGIBLE_INTAKE");
  if (isConditionMissing(input)) return escalate("ESCALATED_CONDITIONS_NOT_MET");
  return { kind: "continue" };
};

const completeExecution = (
  input: ExecutionInput,
): DomainResult<ExecutionOutcome, ExecutionError> => {
  const tracks = TRACKS_BY_SCOPE[input.componentScope];
  if (needsDiagnosis(tracks, input)) return fail(missingDiagnosisCode());
  return succeed(completedOutcome(input, tracks));
};

const isConditionMissing = (input: ExecutionInput): boolean =>
  requiresCondition(input.leaveReason) && input.conditionDescription.kind === "missing";

const needsDiagnosis = (
  tracks: readonly ExecutionTrack[],
  input: ExecutionInput,
): boolean => tracks.includes("gdc") && input.diagnosisCode.kind === "missing";

const escalate = (status: EscalationStatus): EscalationDecision => ({
  kind: "escalate",
  status,
});

const requiresCondition = (reason: LeaveReason): boolean =>
  SERIOUS_LEAVE_REASONS.includes(reason);

const isCovered = (type: IntakeType): boolean =>
  COVERED_INTAKE_TYPES.includes(type);

const isBlank = (value: string): boolean => value.trim().length === 0;

const completedOutcome = (
  input: ExecutionInput,
  tracks: readonly ExecutionTrack[],
): ExecutionOutcome => ({
  caseId: input.caseId,
  status: "COMPLETED",
  activatedTracks: tracks,
  diagnosisUpdated: tracks.includes("gdc"),
  providerUpdated: tracks.includes("gdc") && input.providerAttached,
});

const escalatedOutcome = (
  caseId: CaseId,
  status: ExecutionStatus,
): ExecutionOutcome => ({
  caseId,
  status,
  activatedTracks: [],
  diagnosisUpdated: false,
  providerUpdated: false,
});

const missingCaseId = (): ExecutionError => ({
  kind: "MISSING_CASE_ID",
  message: "A case ID must be supplied before case existence is evaluated.",
});

const missingDiagnosisCode = (): ExecutionError => ({
  kind: "MISSING_DIAGNOSIS_CODE",
  message: "A diagnosis code must be resolved before the diagnosis record is updated.",
});
