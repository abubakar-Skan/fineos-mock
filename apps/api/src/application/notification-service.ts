import {
  toCaseId,
  toPartyId,
  type ApiResult,
  type DraftComponentScope,
  type IntakeComponentScope,
  type IntakeType,
  type PartyId,
} from "@fineos/contracts";
import { createNotification, submitNotification } from "../domain/notification";
import { apiErr, apiOk } from "./api-result";
import { validateProvider, type ProviderError } from "./provider-validation";
import type {
  AbsencePeriodInput,
  NotificationRepository,
  PartyRepository,
  SectionSave,
  SubmissionRecord,
} from "./ports";

const OPTIONS_SECTION = "notificationOptions";
const KNOWN_SECTIONS = new Set([
  "notificationDetails", OPTIONS_SECTION, "occupation", "absenceDetails", "absencePeriods", "leaveReason",
  "workPattern", "concurrentLeave", "gdcDetails", "medicalDetails", "medicalProvider", "diagnosis",
  "payment", "contact", "documents", "review",
]);

const INTAKE_BY_SCOPE: Record<IntakeComponentScope, IntakeType> = {
  leave_only: "leave",
  gdc_only: "gdc",
  leave_and_gdc: "leave_and_gdc",
};

export interface DraftInput {
  readonly source: string;
  readonly notificationDate: string;
}

export interface DraftCreated {
  readonly draftId: string;
  readonly scope: DraftComponentScope;
}

interface PromotedSectionInput {
  readonly body: Readonly<Record<string, unknown>>;
  readonly source?: string;
  readonly notificationDate?: string;
  readonly leaveReason?: string;
  readonly conditionDescription?: string | null;
  readonly workState?: string;
  readonly absencePeriods?: readonly AbsencePeriodInput[];
  readonly diagnosisCode?: string;
  readonly providerPartyId?: PartyId;
}

export type NotificationSectionInput =
  | PromotedSectionInput & { readonly kind: "section" }
  | PromotedSectionInput & {
    readonly kind: "notification_options";
    readonly requestLeave: boolean;
    readonly requestAccommodation: boolean;
    readonly requestGdc: boolean;
  };

export interface NotificationDeps {
  readonly parties: PartyRepository;
  readonly notifications: NotificationRepository;
}

type SectionError =
  | "case_not_found" | "unknown_section" | "invalid_section"
  | "already_submitted" | "component_scope_required" | ProviderError;

export interface NotificationService {
  create(partyId: string, input: DraftInput): ApiResult<DraftCreated, "party_not_found">;
  saveSection(draftId: string, key: string, input: NotificationSectionInput): ApiResult<{ saved: true }, SectionError>;
  submit(draftId: string): ApiResult<SubmissionRecord, "case_not_found" | "component_scope_required">;
}

export const createNotificationService = (deps: NotificationDeps): NotificationService => ({
  create: (partyId, input) => create(deps, partyId, input),
  saveSection: (draftId, key, body) => saveSection(deps, draftId, key, body),
  submit: (draftId) => submit(deps, draftId),
});

const create = (
  deps: NotificationDeps,
  partyId: string,
  input: DraftInput,
): ApiResult<DraftCreated, "party_not_found"> => {
  const id = toPartyId(partyId);
  if (!deps.parties.findById(id)) return partyNotFound();
  const draftId = deps.notifications.createDraft({ partyId: id, ...input });
  return apiOk({ draftId, scope: { kind: "unselected" } });
};

const saveSection = (
  deps: NotificationDeps,
  draftId: string,
  key: string,
  input: NotificationSectionInput,
): ApiResult<{ saved: true }, SectionError> => {
  const notification = deps.notifications.findById(toCaseId(draftId));
  if (!notification) return caseNotFound(draftId);
  if (!KNOWN_SECTIONS.has(key)) return unknownSection(key);
  if (notification.status === "SUBMITTED") return alreadySubmitted(draftId);
  return persistSection(deps, notification.id, key, input);
};

const persistSection = (
  deps: NotificationDeps,
  draftId: ReturnType<typeof toCaseId>,
  key: string,
  input: NotificationSectionInput,
): ApiResult<{ saved: true }, SectionError> => {
  const section = buildSection(key, input);
  if (!section.ok) return section;
  const provider = validateProvider(deps.parties, section.value.providerPartyId);
  if (!provider.ok) return provider;
  deps.notifications.saveSection(draftId, { ...section.value, providerPartyId: provider.value });
  return apiOk({ saved: true });
};

const buildSection = (
  key: string,
  input: NotificationSectionInput,
): ApiResult<SectionSave, "invalid_section" | "component_scope_required"> => {
  if (key !== OPTIONS_SECTION) return apiOk(toSectionSave(key, input));
  if (input.kind !== "notification_options") return invalidSection();
  return buildOptions(input);
};

const buildOptions = (
  input: Extract<NotificationSectionInput, { kind: "notification_options" }>,
): ApiResult<SectionSave, "invalid_section" | "component_scope_required"> => {
  if (!hasComponent(input)) return apiOk(toSectionSave(OPTIONS_SECTION, input));
  const notification = createNotification({ partyId: toPartyId("draft"), ...flags(input) });
  if (!notification.ok) return scopeRequired();
  return apiOk(toOptionsSave(input, notification.value.scope));
};

const hasComponent = (
  input: Extract<NotificationSectionInput, { kind: "notification_options" }>,
): boolean =>
  input.requestLeave || input.requestAccommodation || input.requestGdc;

const toOptionsSave = (
  input: Extract<NotificationSectionInput, { kind: "notification_options" }>,
  scope: IntakeComponentScope,
): SectionSave => ({
  ...toSectionSave(OPTIONS_SECTION, input),
  scope,
  intakeType: resolveIntakeType(input, scope),
});

const toSectionSave = (key: string, input: PromotedSectionInput): SectionSave => ({
  key,
  body: input.body,
  source: input.source,
  notificationDate: input.notificationDate,
  leaveReason: input.leaveReason,
  conditionDescription: input.conditionDescription,
  workState: input.workState,
  absencePeriods: input.absencePeriods,
  diagnosisCode: input.diagnosisCode,
  providerPartyId: input.providerPartyId,
});

const resolveIntakeType = (
  input: Extract<NotificationSectionInput, { kind: "notification_options" }>,
  scope: IntakeComponentScope,
): IntakeType =>
  isAccommodationOnly(input) ? "accommodation_only" : INTAKE_BY_SCOPE[scope];

const isAccommodationOnly = (
  input: Extract<NotificationSectionInput, { kind: "notification_options" }>,
): boolean =>
  input.requestAccommodation && !input.requestLeave && !input.requestGdc;

const flags = (
  input: Extract<NotificationSectionInput, { kind: "notification_options" }>,
) => ({
  requestLeave: input.requestLeave,
  requestAccommodation: input.requestAccommodation,
  requestGdc: input.requestGdc,
});

const submit = (
  deps: NotificationDeps,
  draftId: string,
): ApiResult<SubmissionRecord, "case_not_found" | "component_scope_required"> => {
  const notification = deps.notifications.findById(toCaseId(draftId));
  if (!notification) return caseNotFound(draftId);
  if (notification.scope.kind === "unselected") return scopeRequired();
  const plan = submitNotification({ partyId: notification.partyId, scope: notification.scope.value });
  if (!plan.ok) return scopeRequired();
  const result = deps.notifications.submit(notification.id, plan.value);
  return result.ok ? apiOk(result.value) : caseNotFound(draftId);
};

const partyNotFound = () => apiErr("party_not_found", "The requested party does not exist.");
const caseNotFound = (id: string) => apiErr("case_not_found", `Draft ${id} was not found.`);
const unknownSection = (key: string) => apiErr("unknown_section", `Section ${key} is not recognized.`);
const alreadySubmitted = (id: string) => apiErr("already_submitted", `Draft ${id} is already submitted.`);
const scopeRequired = () => apiErr("component_scope_required", "At least one Leave or GDC component must be selected.");
const invalidSection = () => apiErr("invalid_section", "The section payload was invalid.");
