import {
  NOTIFICATION_DETAILS_DEFAULTS,
  intakeFieldKey,
  type IntakeComponentFlags,
  type IntakeDraftSnapshot,
  type IntakeProviderDraft,
  type IntakeStepSlug,
} from "@fineos/contracts";
import { NO_COMPONENTS } from "./intake-steps";

export interface DraftModel extends IntakeDraftSnapshot {
  readonly saved: readonly string[];
}

const NOTIFICATION_FIELDS = {
  [intakeFieldKey("notification-details", "source")]: NOTIFICATION_DETAILS_DEFAULTS.source,
  [intakeFieldKey("notification-details", "notificationDate")]: NOTIFICATION_DETAILS_DEFAULTS.notificationDate,
  [intakeFieldKey("notification-details", "notifiedBy")]: NOTIFICATION_DETAILS_DEFAULTS.notifiedBy,
};

const DEFAULT_FIELDS: Readonly<Record<string, string>> = {
  ...NOTIFICATION_FIELDS,
  "member-occupation:jobTitle": "Test Engineer",
  "member-occupation:employmentStatus": "Active",
  "member-occupation:dateOfHire": "06/01/2015",
  "member-occupation:hoursPerWeek": "40",
  "reason-for-absence:absenceRelates": "Employee",
  "dates-of-absence:fixedTimeOff": "yes",
  "work-absence-details:workState": "DE",
  "work-absence-details:hoursPerYear": "2000",
  "incident-details:receivingTreatment": "Claimant",
  "incident-details:incurredDate": "02/08/2026",
  "incident-details:accidentSickness": "Sickness",
  "earnings-details:earningsFrom": "02/14/2025",
  "earnings-details:earningsBasis": "Weekly",
  "medical-details:firstTreatment": "02/08/2026",
  "medical-details:conditionCategory": "Unknown",
};

export const initialDraft = (): DraftModel => ({
  fields: { ...DEFAULT_FIELDS },
  flags: NO_COMPONENTS,
  periods: [],
  provider: null,
  saved: [],
});

export const fieldKey = (slug: IntakeStepSlug, name: string): string =>
  intakeFieldKey(slug, name);

export const readField = (model: DraftModel, slug: IntakeStepSlug, name: string): string =>
  model.fields[fieldKey(slug, name)] ?? "";

const storageKey = (draftId: string): string => `fineos:intake:${draftId}`;

export const loadDraft = (draftId: string): DraftModel => {
  if (typeof sessionStorage === "undefined") return initialDraft();
  const stored = sessionStorage.getItem(storageKey(draftId));
  if (!stored) return initialDraft();
  return parseDraft(stored);
};

const parseDraft = (stored: string): DraftModel => {
  try {
    const parsed: unknown = JSON.parse(stored);
    return isDraftModel(parsed) ? parsed : initialDraft();
  } catch {
    return initialDraft();
  }
};

const isDraftModel = (value: unknown): value is DraftModel => {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<DraftModel>;
  return isRecord(draft.fields) && isFlags(draft.flags) && Array.isArray(draft.periods)
    && isProvider(draft.provider) && Array.isArray(draft.saved);
};

const isRecord = (value: unknown): value is Readonly<Record<string, string>> =>
  !!value && typeof value === "object" && !Array.isArray(value)
  && Object.values(value).every((entry) => typeof entry === "string");

const isFlags = (value: unknown): value is IntakeComponentFlags => {
  if (!value || typeof value !== "object") return false;
  const flags = value as Partial<IntakeComponentFlags>;
  return [flags.requestLeave, flags.requestAccommodation, flags.requestGdc].every((flag) => typeof flag === "boolean");
};

const isProvider = (value: unknown): value is IntakeProviderDraft | null => {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const provider = value as Partial<IntakeProviderDraft>;
  return typeof provider.id === "string" && typeof provider.name === "string";
};

export const storeDraft = (draftId: string, model: DraftModel): void => {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(storageKey(draftId), JSON.stringify(model));
};

const dropFields = (fields: DraftModel["fields"], slug: IntakeStepSlug): Record<string, string> =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => !key.startsWith(`${slug}:`)));

const resetFields = (model: DraftModel, slug: IntakeStepSlug): Record<string, string> => {
  const cleared = dropFields(model.fields, slug);
  return slug === "notification-details" ? { ...cleared, ...NOTIFICATION_FIELDS } : cleared;
};

export const resetDraftStep = (model: DraftModel, slug: IntakeStepSlug): DraftModel => ({
  ...model,
  fields: resetFields(model, slug),
  flags: slug === "notification-options" ? NO_COMPONENTS : model.flags,
  periods: slug === "dates-of-absence" ? [] : model.periods,
  provider: slug === "medical-details" ? null : model.provider,
  saved: model.saved.filter((saved) => saved !== slug),
});

export const markSaved = (model: DraftModel, slug: string): DraftModel =>
  model.saved.includes(slug) ? model : { ...model, saved: [...model.saved, slug] };
