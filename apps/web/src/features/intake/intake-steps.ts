import type { IntakeComponentFlags, IntakeStepSlug } from "@fineos/contracts";

export type StepSection = "common" | "leave" | "gdc";

export interface IntakeStep {
  readonly slug: IntakeStepSlug;
  readonly title: string;
  readonly section: StepSection;
  readonly sectionKey?: string;
}

export type ComponentFlags = IntakeComponentFlags;

export const NO_COMPONENTS: ComponentFlags = {
  requestLeave: false,
  requestAccommodation: false,
  requestGdc: false,
};

export const INTAKE_STEPS: readonly IntakeStep[] = [
  { slug: "notification-details", title: "Notification Details", section: "common", sectionKey: "notificationDetails" },
  { slug: "member-occupation", title: "Member & Occupation", section: "common", sectionKey: "occupation" },
  { slug: "notification-options", title: "Notification Options", section: "common", sectionKey: "notificationOptions" },
  { slug: "reason-for-absence", title: "Reason for Absence", section: "leave", sectionKey: "leaveReason" },
  { slug: "dates-of-absence", title: "Dates of Absence", section: "leave", sectionKey: "absencePeriods" },
  { slug: "work-absence-details", title: "Work Absence Details", section: "leave", sectionKey: "workPattern" },
  { slug: "additional-absence-details", title: "Additional Absence Details", section: "leave", sectionKey: "absenceDetails" },
  { slug: "incident-details", title: "Incident Details", section: "gdc", sectionKey: "gdcDetails" },
  { slug: "policy-details", title: "Policy Details", section: "gdc", sectionKey: "documents" },
  { slug: "earnings-details", title: "Earnings Details", section: "gdc", sectionKey: "payment" },
  { slug: "medical-details", title: "Medical Details", section: "gdc", sectionKey: "medicalDetails" },
];

const wantsLeave = (flags: ComponentFlags): boolean =>
  flags.requestLeave || flags.requestAccommodation;

const isVisible = (step: IntakeStep, flags: ComponentFlags): boolean => {
  if (step.section === "leave") return wantsLeave(flags);
  if (step.section === "gdc") return flags.requestGdc;
  return true;
};

export const visibleSteps = (flags: ComponentFlags): readonly IntakeStep[] =>
  INTAKE_STEPS.filter((step) => isVisible(step, flags));

export const findStep = (slug: string): IntakeStep | undefined =>
  INTAKE_STEPS.find((step) => step.slug === slug);

export const FIRST_STEP = INTAKE_STEPS[0]!.slug;
