import type { CaseDetailsView } from "../../app/api";

type Section = Readonly<Record<string, unknown>>;

export const section = (details: CaseDetailsView, key: string): Section => {
  const value = details.sections[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Section : {};
};

export const sectionText = (
  details: CaseDetailsView,
  sectionKey: string,
  field: string,
): string | undefined => {
  const value = section(details, sectionKey)[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

export const displayDate = (value: string | undefined): string => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${month}/${day}/${year}` : value;
};

export const isDavidReference = (details: CaseDetailsView): boolean =>
  details.notification.id === "NTN-159898";
