import type { PartyId } from "./party";

// Process 2 target state is the manually-persisted counterpart to the
// read-only source dossier: each activity (ACT_11-16) owns one optional slot,
// blank until a manual UI/API save writes it. `updated` distinguishes a saved
// value from an absent one so the UI never has to infer intent from shape.
export interface ActivityTargetState<T> {
  readonly value: T;
  readonly updated: boolean;
}

export interface AbsenceHubTargetState {
  readonly expectedReturnToWorkDate: string;
  readonly actualReturnToWorkDate: string;
  readonly intentionToReturn: string;
}

export interface AbsenceConditionTargetState {
  readonly leaveReason: string;
  readonly workState: string;
  readonly conditionDescription: string;
}

export interface GdcClaimTargetState {
  readonly lastDayWorked: string;
}

export interface GdcMedicalTargetState {
  readonly conditionCategory: string;
  readonly pregnant: boolean;
}

export interface DiagnosisTargetState {
  readonly code: string;
  readonly description: string;
}

export interface ProviderTargetState {
  readonly providerPartyId: PartyId;
  readonly providerName: string;
}

export interface Process2TargetState {
  readonly absenceHub?: ActivityTargetState<AbsenceHubTargetState>;
  readonly absenceCondition?: ActivityTargetState<AbsenceConditionTargetState>;
  readonly gdcClaim?: ActivityTargetState<GdcClaimTargetState>;
  readonly gdcMedical?: ActivityTargetState<GdcMedicalTargetState>;
  readonly diagnosis?: ActivityTargetState<DiagnosisTargetState>;
  readonly provider?: ActivityTargetState<ProviderTargetState>;
}

export const EMPTY_TARGET_STATE: Process2TargetState = {};
