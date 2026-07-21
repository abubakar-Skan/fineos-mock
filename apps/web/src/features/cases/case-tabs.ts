export type CaseKind = "notification" | "absence" | "gdc";

const ABS_SUFFIX = /-ABS-\d+$/;
const GDC_SUFFIX = /-GDC-\d+$/;

export const caseKind = (caseId: string): CaseKind => {
  if (ABS_SUFFIX.test(caseId)) return "absence";
  if (GDC_SUFFIX.test(caseId)) return "gdc";
  return "notification";
};

export const rootCaseId = (caseId: string): string =>
  caseId.replace(ABS_SUFFIX, "").replace(GDC_SUFFIX, "");

export const absenceCaseId = (rootId: string): string => `${rootId}-ABS-01`;

export const gdcCaseId = (rootId: string): string => `${rootId}-GDC-02`;

interface CasePresentation {
  readonly titlePrefix: string;
  readonly subtitleLabel: string;
  readonly tabs: readonly string[];
}

const NOTIFICATION_TABS = ["General", "Tasks", "Contacts", "Documents", "Case Map", "Case History"] as const;
const ABSENCE_TABS = ["Absence Hub", "Leave Details", "Leave Summary", "General", "Tasks", "Contacts", "Documents", "Notes", "Alerts", "Case History"] as const;
const GDC_TABS = ["Claim Hub", "General Claim", "Case History", "Medical", "Occupation", "Tasks", "Documents", "Contacts", "Insured", "Outstanding Requirements"] as const;

const PRESENTATION: Record<CaseKind, CasePresentation> = {
  notification: { titlePrefix: "Notification", subtitleLabel: "Requester", tabs: NOTIFICATION_TABS },
  absence: { titlePrefix: "Absence Case", subtitleLabel: "Employee", tabs: ABSENCE_TABS },
  gdc: { titlePrefix: "Group Disability Claim", subtitleLabel: "Claimant", tabs: GDC_TABS },
};

export const casePresentation = (kind: CaseKind): CasePresentation => PRESENTATION[kind];

export const tabSlug = (label: string): string => label.toLowerCase().replaceAll(" ", "-");

export const defaultTab = (kind: CaseKind): string => casePresentation(kind).tabs[0]!;

export const tabFromSlug = (kind: CaseKind, slug: string | undefined): string => {
  const match = casePresentation(kind).tabs.find((tab) => tabSlug(tab) === slug);
  return match ?? defaultTab(kind);
};
