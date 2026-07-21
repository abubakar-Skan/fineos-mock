export type IntakeStepSlug =
  | "notification-details" | "member-occupation" | "notification-options"
  | "reason-for-absence" | "dates-of-absence" | "work-absence-details"
  | "additional-absence-details" | "incident-details" | "policy-details"
  | "earnings-details" | "medical-details";

export interface IntakeComponentFlags {
  readonly requestLeave: boolean;
  readonly requestAccommodation: boolean;
  readonly requestGdc: boolean;
}

export interface IntakePeriodDraft {
  readonly lastDayWorked: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface IntakeProviderDraft {
  readonly id: string;
  readonly name: string;
}

export interface IntakeDraftSnapshot {
  readonly fields: Readonly<Record<string, string>>;
  readonly flags: IntakeComponentFlags;
  readonly periods: readonly IntakePeriodDraft[];
  readonly provider: IntakeProviderDraft | null;
}

export const NOTIFICATION_DETAILS_DEFAULTS = {
  source: "Phone",
  notificationDate: "02/13/2026",
  notifiedBy: "Requester",
} as const;

export const intakeFieldKey = (slug: IntakeStepSlug, name: string): string =>
  `${slug}:${name}`;

export const serializeIntakeSection = (
  draft: IntakeDraftSnapshot,
  slug: IntakeStepSlug,
): Readonly<Record<string, unknown>> => {
  const fields = stepFields(draft, slug);
  if (slug === "notification-details") return notificationDetails(fields);
  if (slug === "notification-options") return { ...fields, ...draft.flags };
  if (slug === "reason-for-absence") return leaveReason(fields);
  if (slug === "dates-of-absence") return { ...fields, periods: isoPeriods(draft.periods) };
  if (slug === "additional-absence-details") return additionalAbsence(fields);
  if (slug === "medical-details") return medicalDetails(fields, draft.provider);
  return fields;
};

const stepFields = (draft: IntakeDraftSnapshot, slug: IntakeStepSlug) => {
  const prefix = `${slug}:`;
  const owned = Object.entries(draft.fields).filter(([key]) => key.startsWith(prefix));
  return Object.fromEntries(owned.map(([key, value]) => [key.slice(prefix.length), value]));
};

const notificationDetails = (fields: Readonly<Record<string, string>>) => ({
  ...fields,
  notificationDate: toIso(fields.notificationDate ?? ""),
});

const leaveReason = (fields: Readonly<Record<string, string>>) => ({
  ...fields,
  leaveReason: REASON_ENUM[fields.absenceReason ?? ""] ?? "other",
});

const additionalAbsence = (fields: Readonly<Record<string, string>>) => ({
  ...fields,
  conditionDescription: fields.additionalDetail?.trim() || fields.medicalCondition?.trim() || null,
});

const medicalDetails = (
  fields: Readonly<Record<string, string>>,
  provider: IntakeProviderDraft | null,
) => ({
  ...fields,
  diagnosisCode: canonicalDiagnosisCode(fields.diagnosisCode ?? ""),
  ...(provider ? { providerPartyId: provider.id } : {}),
});

export const canonicalDiagnosisCode = (label: string): string | undefined => {
  const code = label.split(" - ", 1)[0]?.trim();
  return code && code !== "Please Select" ? code : undefined;
};

const REASON_ENUM: Readonly<Record<string, string>> = {
  "Serious Health Condition": "serious_health_condition",
  "Pregnancy/Maternity": "pregnancy",
};

const toIso = (value: string): string => {
  const [month, day, year] = value.split("/");
  return month && day && year ? `${year}-${month}-${day}` : value;
};

const isoPeriods = (periods: readonly IntakePeriodDraft[]) =>
  periods.map((period) => ({
    lastDayWorked: toIso(period.lastDayWorked),
    startDate: toIso(period.startDate),
    endDate: toIso(period.endDate),
  }));
