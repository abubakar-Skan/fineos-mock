import {
  toCaseId,
  toPartyId,
  type AbsenceConditionTargetState,
  type AbsenceHubTargetState,
  type ApiResult,
  type CaseId,
  type DiagnosisTargetState,
  type GdcClaimTargetState,
  type GdcMedicalTargetState,
  type Process2TargetState,
  type ProviderTargetState,
} from "@fineos/contracts";
import { apiErr, apiOk } from "./api-result";
import type { CaseRepository, NotificationRecord, NotificationRepository } from "./ports";

// Component-existence errors shared by every ACT_11-16 endpoint: the activity
// can only be saved once its owning Absence/GDC sub-case exists.
export type ComponentError = "case_not_found" | "absence_case_not_found" | "gdc_case_not_found";
export type DiagnosisSaveError = ComponentError | "unsupported_diagnosis_code";
export type ProviderSaveError = ComponentError | "provider_not_found";

export interface TargetStateDeps {
  readonly notifications: NotificationRepository;
  readonly cases: CaseRepository;
}

export interface TargetStateService {
  updateAbsenceHub(id: string, payload: AbsenceHubTargetState): ApiResult<Process2TargetState, ComponentError>;
  updateAbsenceCondition(id: string, payload: AbsenceConditionTargetState): ApiResult<Process2TargetState, ComponentError>;
  updateGdcClaim(id: string, payload: GdcClaimTargetState): ApiResult<Process2TargetState, ComponentError>;
  updateGdcMedical(id: string, payload: GdcMedicalTargetState): ApiResult<Process2TargetState, ComponentError>;
  updateDiagnosis(id: string, code: string): ApiResult<Process2TargetState, DiagnosisSaveError>;
  updateProvider(id: string, providerPartyId: string): ApiResult<Process2TargetState, ProviderSaveError>;
}

export const createTargetStateService = (deps: TargetStateDeps): TargetStateService => ({
  updateAbsenceHub: (id, payload) => withAbsence(deps, id, (n) => apiOk(saveActivity(deps, n.id, "absenceHub", payload))),
  updateAbsenceCondition: (id, payload) => withAbsence(deps, id, (n) => apiOk(saveActivity(deps, n.id, "absenceCondition", payload))),
  updateGdcClaim: (id, payload) => withGdc(deps, id, (n) => apiOk(saveActivity(deps, n.id, "gdcClaim", payload))),
  updateGdcMedical: (id, payload) => withGdc(deps, id, (n) => apiOk(saveActivity(deps, n.id, "gdcMedical", payload))),
  updateDiagnosis: (id, code) => withGdc(deps, id, (n, gdcId) => saveDiagnosis(deps, n, gdcId, code)),
  updateProvider: (id, providerId) => withGdc(deps, id, (n, gdcId) => saveProvider(deps, n, gdcId, providerId)),
});

const requireNotification = (
  deps: TargetStateDeps, id: string,
): ApiResult<NotificationRecord, "case_not_found"> => {
  const notification = deps.notifications.findById(toCaseId(id));
  return notification ? apiOk(notification) : apiErr("case_not_found", `Case ${id} was not found.`);
};

const withAbsence = <E extends string>(
  deps: TargetStateDeps, id: string,
  run: (notification: NotificationRecord) => ApiResult<Process2TargetState, E>,
): ApiResult<Process2TargetState, ComponentError | E> => {
  const notification = requireNotification(deps, id);
  if (!notification.ok) return notification;
  const absence = deps.cases.findComponentCases(notification.value.id).absence;
  if (!absence) return apiErr("absence_case_not_found", `Case ${id} has no absence component.`);
  return run(notification.value);
};

const withGdc = <E extends string>(
  deps: TargetStateDeps, id: string,
  run: (notification: NotificationRecord, gdcCaseId: CaseId) => ApiResult<Process2TargetState, E>,
): ApiResult<Process2TargetState, ComponentError | E> => {
  const notification = requireNotification(deps, id);
  if (!notification.ok) return notification;
  const gdc = deps.cases.findComponentCases(notification.value.id).gdc;
  if (!gdc) return apiErr("gdc_case_not_found", `Case ${id} has no GDC component.`);
  return run(notification.value, gdc.id);
};

const saveActivity = <K extends keyof Process2TargetState>(
  deps: TargetStateDeps, notificationId: CaseId, key: K,
  value: NonNullable<Process2TargetState[K]>["value"],
): Process2TargetState => {
  const patch = { [key]: { value, updated: true } } as Partial<Process2TargetState>;
  const updated = deps.notifications.updateTargetState({ notificationId, patch });
  return updated?.targetState ?? (patch as Process2TargetState);
};

const matchDiagnosisCandidate = (
  notification: NotificationRecord, code: string,
): ApiResult<DiagnosisTargetState, "unsupported_diagnosis_code"> => {
  const trimmed = code.trim();
  const match = notification.dossier?.lookup.candidates.find((candidate) => candidate.code === trimmed);
  return match
    ? apiOk({ code: match.code, description: match.description })
    : apiErr("unsupported_diagnosis_code", `Diagnosis code "${code}" is not one of this case's lookup candidates.`);
};

const saveDiagnosis = (
  deps: TargetStateDeps, notification: NotificationRecord, gdcCaseId: CaseId, code: string,
): ApiResult<Process2TargetState, "unsupported_diagnosis_code"> => {
  const diagnosis = matchDiagnosisCandidate(notification, code);
  if (!diagnosis.ok) return diagnosis;
  const patch = { diagnosis: { value: diagnosis.value, updated: true } };
  const updated = deps.notifications.updateTargetState({
    notificationId: notification.id, patch, gdcCaseId, diagnosisCode: diagnosis.value.code,
  });
  return apiOk(updated?.targetState ?? (patch as Process2TargetState));
};

// The provider directory is the dossier's own search results and previously
// listed source providers — not just any medical_provider row in the party
// table — so an attach can only name a provider this case actually surfaced.
const matchDirectoryProvider = (
  notification: NotificationRecord, providerPartyId: string,
): ApiResult<ProviderTargetState, "provider_not_found"> => {
  const gdc = notification.dossier?.gdc;
  const directory = [...(gdc?.providerSearch.candidates ?? []), ...(gdc?.providers ?? [])];
  const match = directory.find((provider) => provider.partyId === providerPartyId);
  return match
    ? apiOk({ providerPartyId: toPartyId(match.partyId), providerName: match.fullName })
    : apiErr("provider_not_found", `Provider ${providerPartyId} is not in this case's provider directory.`);
};

const saveProvider = (
  deps: TargetStateDeps, notification: NotificationRecord, gdcCaseId: CaseId, providerPartyId: string,
): ApiResult<Process2TargetState, "provider_not_found"> => {
  const provider = matchDirectoryProvider(notification, providerPartyId);
  if (!provider.ok) return provider;
  const patch = { provider: { value: provider.value, updated: true } };
  const updated = deps.notifications.updateTargetState({
    notificationId: notification.id, patch, gdcCaseId, providerPartyId: provider.value.providerPartyId,
  });
  return apiOk(updated?.targetState ?? (patch as Process2TargetState));
};
