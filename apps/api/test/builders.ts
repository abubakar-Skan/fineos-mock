import {
  createDiagnosisCode,
  toCaseId,
  toPartyId,
  type ConditionDescriptionPresence,
  type DiagnosisCode,
  type DiagnosisCodePresence,
  type ExecutionInput,
  type IntakeComponentScope,
  type Notification,
  type NotificationDraftInput,
} from "@fineos/contracts";

const draft = (
  overrides: Partial<NotificationDraftInput> = {},
): NotificationDraftInput => ({
  partyId: toPartyId("PTY-001"),
  requestLeave: true,
  requestAccommodation: false,
  requestGdc: false,
  ...overrides,
});

export const aLeaveOnlyDraft = (): NotificationDraftInput => draft();

export const aGdcOnlyDraft = (): NotificationDraftInput =>
  draft({ requestLeave: false, requestGdc: true });

export const aLeaveAndGdcDraft = (): NotificationDraftInput =>
  draft({ requestGdc: true });

export const anAccommodationOnlyDraft = (): NotificationDraftInput =>
  draft({ requestLeave: false, requestAccommodation: true });

export const anEmptyScopeDraft = (): NotificationDraftInput =>
  draft({ requestLeave: false, requestAccommodation: false, requestGdc: false });

export const aNotification = (scope: IntakeComponentScope): Notification => ({
  partyId: toPartyId("PTY-001"),
  scope,
});

export const aDiagnosisCodeValue = (): string => "O80";

export const aBlankDiagnosisCodeValue = (): string => " ";

export const aDiagnosisCode = (): DiagnosisCode => {
  const result = createDiagnosisCode(aDiagnosisCodeValue());
  if (!result.ok) throw new Error("Canonical diagnosis code must be valid");
  return result.value;
};

export const aProvidedDiagnosisCode = (): DiagnosisCodePresence => ({
  kind: "provided" as const,
  value: aDiagnosisCode(),
});

export const aMissingDiagnosisCode = (): DiagnosisCodePresence => ({
  kind: "missing",
});

export const aProvidedConditionDescription = (): ConditionDescriptionPresence => ({
  kind: "provided" as const,
  value: "Post-surgical recovery, 6 weeks",
});

export const aMissingConditionDescription = (): ConditionDescriptionPresence => ({
  kind: "missing",
});

export const anExecutionInput = (
  overrides: Partial<ExecutionInput> = {},
): ExecutionInput => ({
  caseId: toCaseId("NTN-1001"),
  caseFound: true,
  intakeType: "leave_and_gdc",
  leaveReason: "serious_health_condition",
  conditionDescription: aProvidedConditionDescription(),
  componentScope: "absence_and_gdc",
  diagnosisCode: aProvidedDiagnosisCode(),
  providerAttached: true,
  ...overrides,
});
