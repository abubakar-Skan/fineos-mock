import { fail, succeed, type DomainResult } from "./result";

export type CaseId = string & { readonly __brand: "CaseId" };

export const toCaseId = (value: string): CaseId => value as CaseId;

export type DiagnosisCode = string & { readonly __brand: "DiagnosisCode" };

export type DiagnosisCodePresence =
  | { readonly kind: "missing" }
  | { readonly kind: "provided"; readonly value: DiagnosisCode };

export type ConditionDescriptionPresence =
  | { readonly kind: "missing" }
  | { readonly kind: "provided"; readonly value: string };

export interface DiagnosisCodeError {
  readonly kind: "INVALID_DIAGNOSIS_CODE";
  readonly message: string;
}

export const createDiagnosisCode = (
  value: string,
): DomainResult<DiagnosisCode, DiagnosisCodeError> => {
  const normalized = value.trim();
  if (normalized.length === 0) return fail(invalidDiagnosisCode());
  return succeed(normalized as DiagnosisCode);
};

const invalidDiagnosisCode = (): DiagnosisCodeError => ({
  kind: "INVALID_DIAGNOSIS_CODE",
  message: "A diagnosis code must contain a value.",
});

export type IntakeType = "leave" | "gdc" | "leave_and_gdc" | "accommodation_only";

export type LeaveReason = "serious_health_condition" | "pregnancy" | "other";

export type ComponentScope = "absence_only" | "gdc_only" | "absence_and_gdc";

export type ExecutionTrack = "absence" | "gdc";

export type ExecutionStatus =
  | "COMPLETED"
  | "ESCALATED_CASE_NOT_FOUND"
  | "ESCALATED_INELIGIBLE_INTAKE"
  | "ESCALATED_CONDITIONS_NOT_MET";

export interface ExecutionInput {
  readonly caseId: CaseId;
  readonly caseFound: boolean;
  readonly intakeType: IntakeType;
  readonly leaveReason: LeaveReason;
  readonly conditionDescription: ConditionDescriptionPresence;
  readonly componentScope: ComponentScope;
  readonly diagnosisCode: DiagnosisCodePresence;
  readonly providerAttached: boolean;
}

export interface ExecutionOutcome {
  readonly caseId: CaseId;
  readonly status: ExecutionStatus;
  readonly activatedTracks: readonly ExecutionTrack[];
  readonly diagnosisUpdated: boolean;
  readonly providerUpdated: boolean;
}

export type ExecutionErrorKind = "MISSING_CASE_ID" | "MISSING_DIAGNOSIS_CODE";

export interface ExecutionError {
  readonly kind: ExecutionErrorKind;
  readonly message: string;
}
