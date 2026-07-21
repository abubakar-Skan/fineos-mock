import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Page } from "@playwright/test";

// Maps every reference-manifest entry to the route, UI state, viewport, and
// honest comparison metadata used by fineos.visual.spec.ts. The manifest is the
// single source of truth for ids and captured dimensions; this file adds the
// route/interaction needed to reproduce each captured AdminSuite state.

const HERE = dirname(fileURLToPath(import.meta.url));

export interface ManifestEntry {
  readonly id: string;
  readonly flow: "intake" | "execution";
  readonly step: string;
  readonly state: number;
  readonly width: number;
  readonly height: number;
  readonly caption: string;
  readonly file: string;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CompareMeta {
  // Fraction of pixels allowed to differ (0..1). Broad by necessity: the
  // sources are real product screenshots and this is a semantic DOM mock.
  readonly maxDiffRatio: number;
  // Pixel rows of source-only browser/OS chrome to skip from the top of BOTH
  // images so the comparison focuses on AdminSuite content.
  readonly cropTopPx?: number;
  // Regions filled neutral in BOTH images before diffing (screen-recording
  // overlays, video-call widgets, and other source-only artifacts).
  readonly mask?: readonly Rect[];
  // True when the source frame is an external site or window chrome that the
  // mock deliberately does not reproduce pixel-for-pixel. Documented in
  // VISUAL_DIFFS.md; still rendered and diffed for the record.
  readonly sourceOnly?: boolean;
  readonly note?: string;
}

export interface StateMapping {
  readonly route: string;
  readonly uiState: string;
  readonly prepare?: (page: Page) => Promise<void>;
  readonly compare: CompareMeta;
}

export interface VisualState extends StateMapping {
  readonly id: string;
  readonly flow: "intake" | "execution";
  readonly fixture: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly caption: string;
}

export const MANIFEST: readonly ManifestEntry[] = JSON.parse(
  readFileSync(join(HERE, "reference", "manifest.json"), "utf8"),
) as ManifestEntry[];

// --- Deterministic fixtures (mirror apps/api seed) -------------------------
const ERICA_PARTY = "PTY-80937";
const DAVID_PARTY = "PTY-77569";
const ERICA_NTN = "NTN-165775";
const DAVID_NTN = "NTN-159898";
const DAVID_ABS = "NTN-159898-ABS-01";
const DAVID_GDC = "NTN-159898-GDC-02";

const ALL_STEP_SLUGS = [
  "notification-details", "member-occupation", "notification-options",
  "reason-for-absence", "dates-of-absence", "work-absence-details",
  "additional-absence-details", "incident-details", "policy-details",
  "earnings-details", "medical-details",
];

const BASE_FIELDS: Record<string, string> = {
  "notification-details:source": "Phone",
  "notification-details:notificationDate": "02/13/2026",
  "notification-details:notifiedBy": "Requester",
  "member-occupation:jobTitle": "Test Engineer",
  "member-occupation:employmentStatus": "Active",
  "member-occupation:dateOfHire": "06/01/2015",
  "member-occupation:hoursPerWeek": "40",
  "reason-for-absence:absenceRelates": "Employee",
  "dates-of-absence:fixedTimeOff": "yes",
  "work-absence-details:workState": "DE",
  "work-absence-details:hoursPerYear": "2000",
  "additional-absence-details:overnightStay": "Yes",
  "incident-details:receivingTreatment": "Claimant",
  "incident-details:incurredDate": "02/08/2026",
  "incident-details:accidentSickness": "Sickness",
  "earnings-details:earningsFrom": "02/14/2025",
  "earnings-details:earningsBasis": "Weekly",
  "medical-details:firstTreatment": "02/08/2026",
  "medical-details:conditionCategory": "Unknown",
};

interface DraftShape {
  fields: Record<string, string>;
  flags: { requestLeave: boolean; requestAccommodation: boolean; requestGdc: boolean };
  periods: readonly { lastDayWorked: string; startDate: string; endDate: string }[];
  provider: { id: string; name: string } | null;
  saved: readonly string[];
}

const draft = (over: Partial<DraftShape> & { fields?: Record<string, string> } = {}): DraftShape => ({
  fields: { ...BASE_FIELDS, ...(over.fields ?? {}) },
  flags: over.flags ?? { requestLeave: true, requestAccommodation: false, requestGdc: true },
  periods: over.periods ?? [],
  provider: over.provider === undefined ? { id: "PTY-TRAVIS", name: "Travis Larson" } : over.provider,
  saved: over.saved ?? ALL_STEP_SLUGS,
});

const seedDraft = async (page: Page, model: DraftShape): Promise<void> => {
  await page.addInitScript(
    ([key, json]) => window.sessionStorage.setItem(key, json),
    [`fineos:intake:${ERICA_NTN}`, JSON.stringify(model)] as const,
  );
};

const intakeStep = (
  slug: string,
  over: Partial<DraftShape> = {},
  action?: (page: Page) => Promise<void>,
): StateMapping["prepare"] =>
  async (page) => {
    await seedDraft(page, draft(over));
    await page.goto(`/notifications/${ERICA_NTN}/intake/${slug}`);
    await page.getByRole("heading", { level: 2 }).first().waitFor();
    if (action) await action(page);
  };

const goto = (route: string, action?: (page: Page) => Promise<void>): StateMapping["prepare"] =>
  async (page) => {
    await page.goto(route);
    if (action) await action(page);
  };

const openSearch = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: /open search/i }).click();
  await page.getByRole("dialog", { name: /search/i }).waitFor();
};

const clickByName = (name: RegExp) => async (page: Page): Promise<void> => {
  await page.getByRole("button", { name }).first().click();
};

// Thresholds are the fraction of AdminSuite pixels allowed to differ, calibrated
// against the bundled Chromium (deterministic renders, fixed fixtures). Plain
// screens land at ~10-30%; the wider allowances below name a real source-only
// reason (dimmed modal backdrop, OS popup, external site, unmodelled screen).
const clean = (note?: string): CompareMeta => ({ maxDiffRatio: 0.4, note });
// Source frame carries browser window chrome above the app; skip that band.
const browserChrome = (cropTopPx: number, extra: Partial<CompareMeta> = {}): CompareMeta => ({
  maxDiffRatio: 0.4,
  cropTopPx,
  note: "Source includes browser window/tab/URL chrome above AdminSuite.",
  ...extra,
});
// Screen-recording video-call overlay + red capture border on the right edge.
const recorded = (extra: Partial<CompareMeta> = {}): CompareMeta => ({
  maxDiffRatio: 0.4,
  mask: [{ x: 0, y: 0, width: 8, height: 905 }, { x: 950, y: 180, width: 500, height: 460 }],
  note: "Source has a screen-recording capture border and video-call overlay.",
  ...extra,
});
// A dialog/modal overlay dims the whole page, so full-frame diff is dominated by
// the backdrop and the differing modal geometry; the modal content is rendered.
const dialog = (extra: Partial<CompareMeta> = {}): CompareMeta => ({
  maxDiffRatio: 0.9,
  note: "A dialog overlay dims the page; full-frame diff is backdrop-dominated and the modal only approximates the FINEOS layout.",
  ...extra,
});
// Native <select> popups and OS chrome are rendered by the OS, not the DOM.
const nativePopup = (): CompareMeta => ({
  maxDiffRatio: 0.85,
  sourceOnly: true,
  note: "Source shows an OS-drawn native <select> popup that cannot be captured in-DOM; the closed field is compared.",
});
const external = (what: string): CompareMeta => ({
  maxDiffRatio: 1,
  sourceOnly: true,
  note: `External ${what} site; the in-app lookup is a deterministic stand-in, not a clone.`,
});

const MAPPINGS: Record<string, StateMapping> = {
  // ---- Intake -----------------------------------------------------------
  "intake-s0-0": { route: "/login", uiState: "sign-in", prepare: goto("/login"),
    compare: { maxDiffRatio: 0.4, note: "Login card sits inside a full browser window frame (tabs + URL bar) in the source; the mock renders the AdminSuite card and grey backdrop." } },
  "intake-s1-0": { route: "/dashboard", uiState: "dashboard", prepare: goto("/dashboard"), compare: browserChrome(120) },
  "intake-s1-1": { route: "/dashboard", uiState: "case-search-results", prepare: goto("/dashboard", openSearch), compare: browserChrome(120, { maxDiffRatio: 0.9, note: "Search dialog over the dashboard, above browser chrome; backdrop-dominated." }) },
  "intake-s1-2": { route: `/master-plans/18489/members`, uiState: "master-plan-members", prepare: goto("/master-plans/18489/members"), compare: browserChrome(120) },
  "intake-s1-3": { route: `/parties/${ERICA_PARTY}`, uiState: "party-profile", prepare: goto(`/parties/${ERICA_PARTY}`), compare: browserChrome(120) },
  "intake-s2-0": { route: `intake/notification-details`, uiState: "populated", prepare: intakeStep("notification-details"), compare: clean() },
  "intake-s2-1": { route: `intake/notification-details`, uiState: "source-dropdown-open", prepare: intakeStep("notification-details"), compare: nativePopup() },
  "intake-s3-0": { route: `intake/member-occupation`, uiState: "occupation", prepare: intakeStep("member-occupation"), compare: clean() },
  "intake-s3-1": { route: `intake/member-occupation`, uiState: "member-contact", prepare: intakeStep("member-occupation"), compare: clean("Source scrolled to Member address & Contact Details section.") },
  "intake-s3-2": { route: `intake/member-occupation`, uiState: "create-new-member", prepare: intakeStep("member-occupation", {}, clickByName(/create new member/i)), compare: clean() },
  "intake-s4-0": { route: `intake/notification-options`, uiState: "type-of-request", prepare: intakeStep("notification-options", { flags: { requestLeave: false, requestAccommodation: false, requestGdc: false } }), compare: clean() },
  "intake-s4-1": { route: `intake/notification-options`, uiState: "sub-options-expanded", prepare: intakeStep("notification-options", {}, async (page) => { await page.getByRole("radio").first().click(); }), compare: clean() },
  "intake-s5-0": { route: `intake/reason-for-absence`, uiState: "initial", prepare: intakeStep("reason-for-absence"), compare: clean() },
  "intake-s5-1": { route: `intake/reason-for-absence`, uiState: "completed", prepare: intakeStep("reason-for-absence", { fields: { "reason-for-absence:absenceReason": "Serious Health Condition" } }), compare: clean() },
  "intake-s6-0": { route: `intake/dates-of-absence`, uiState: "leave-periods", prepare: intakeStep("dates-of-absence"), compare: clean() },
  "intake-s6-1": { route: `intake/dates-of-absence`, uiState: "fixed-time-off", prepare: intakeStep("dates-of-absence"), compare: clean() },
  "intake-s6-2": { route: `intake/dates-of-absence`, uiState: "calendar-open", prepare: intakeStep("dates-of-absence", {}, async (page) => { await page.getByRole("button", { name: /open calendar/i }).first().click(); }), compare: clean("Calendar month reflects seeded date; source is Feb 2026.") },
  "intake-s6-3": { route: `intake/dates-of-absence`, uiState: "add-absence-period-modal", prepare: intakeStep("dates-of-absence", {}, clickByName(/add absence period/i)), compare: dialog() },
  "intake-s6-4": { route: `intake/dates-of-absence`, uiState: "period-saved", prepare: intakeStep("dates-of-absence", { periods: [{ lastDayWorked: "02/08/2026", startDate: "02/09/2026", endDate: "02/16/2026" }] }), compare: clean() },
  "intake-s7-0": { route: `intake/work-absence-details`, uiState: "work-schedule", prepare: intakeStep("work-absence-details"), compare: clean() },
  "intake-s7-1": { route: `intake/work-absence-details`, uiState: "employment-leave-details", prepare: intakeStep("work-absence-details"), compare: clean("Source scrolled to Employment Leave Details section.") },
  "intake-s8-0": { route: `intake/additional-absence-details`, uiState: "questions", prepare: intakeStep("additional-absence-details"), compare: clean() },
  "intake-s8-1": { route: `intake/additional-absence-details`, uiState: "condition-dropdown-open", prepare: intakeStep("additional-absence-details"), compare: nativePopup() },
  "intake-s8-2": { route: `intake/additional-absence-details`, uiState: "additional-detail", prepare: intakeStep("additional-absence-details", { fields: { "additional-absence-details:additionalDetail": "Recovering from surgery" } }), compare: clean() },
  "intake-s8-3": { route: `intake/additional-absence-details`, uiState: "overnight-dropdown-open", prepare: intakeStep("additional-absence-details"), compare: nativePopup() },
  "intake-s9-0": { route: `intake/incident-details`, uiState: "disability-incident", prepare: intakeStep("incident-details"), compare: clean() },
  "intake-s9-1": { route: `intake/incident-details`, uiState: "claim-employment", prepare: intakeStep("incident-details"), compare: clean("Source scrolled to Claim Employment Details section.") },
  "intake-s10-0": { route: `intake/policy-details`, uiState: "policy-details", prepare: intakeStep("policy-details"), compare: clean() },
  "intake-s11-0": { route: `intake/earnings-details`, uiState: "earnings-details", prepare: intakeStep("earnings-details"), compare: clean() },
  "intake-s12-0": { route: `intake/medical-details`, uiState: "choose-provider-modal", prepare: intakeStep("medical-details", {}, clickByName(/add medical provider/i)), compare: dialog() },
  "intake-s12-1": { route: `intake/medical-details`, uiState: "no-provider", prepare: intakeStep("medical-details", { provider: null }), compare: clean() },
  "intake-s12-2": { route: `intake/medical-details`, uiState: "full-form", prepare: intakeStep("medical-details"), compare: clean() },
  "intake-s12-3": { route: `intake/medical-details`, uiState: "diagnosis-codes", prepare: intakeStep("medical-details", { fields: { "medical-details:diagnosisCode": "O80 - Encounter for full-term uncomplicated delivery" } }), compare: clean("Source scrolled to Diagnosis Codes & Hospitalization section.") },
  "intake-s13-0": { route: `${ERICA_NTN}/confirmation`, uiState: "submitted", prepare: goto(`/notifications/${ERICA_NTN}/confirmation`), compare: clean() },
  "intake-s13-1": { route: `${ERICA_NTN}/confirmation`, uiState: "notification-summary", prepare: goto(`/notifications/${ERICA_NTN}/confirmation`), compare: clean("Source is the FINEOS post-submit Notification Summary screen; mock shows the confirmation summary.") },
  "intake-s13-2": { route: `${ERICA_NTN}/confirmation`, uiState: "leave-plans", prepare: goto(`/notifications/${ERICA_NTN}/confirmation`), compare: clean("Source is a FINEOS Leave Plan eligibility screen not modelled beyond the confirmation summary.") },
  "intake-s13-3": { route: `${ERICA_NTN}/confirmation`, uiState: "challenge-wrap-up", prepare: goto(`/notifications/${ERICA_NTN}/confirmation`), compare: { maxDiffRatio: 0.95, sourceOnly: true, note: "Source is a distinct FINEOS GDC wrap-up screen not modelled beyond the confirmation summary." } },

  // ---- Execution --------------------------------------------------------
  "execution-s1-0": { route: "/dashboard", uiState: "dashboard", prepare: goto("/dashboard"), compare: recorded() },
  "execution-s1-1": { route: "/dashboard", uiState: "case-search-case-tab", prepare: goto("/dashboard", openSearch), compare: dialog({ mask: recorded().mask }) },
  "execution-s1-2": { route: "/dashboard", uiState: "case-search-recent", prepare: goto("/dashboard", async (page) => { await openSearch(page); await page.getByRole("tab", { name: /recent/i }).click().catch(() => undefined); }), compare: dialog({ mask: recorded().mask }) },
  "execution-s2-0": { route: `/cases/${DAVID_NTN}/documents`, uiState: "documents", prepare: goto(`/cases/${DAVID_NTN}/documents`), compare: recorded() },
  "execution-s3-0": { route: `/cases/${DAVID_NTN}/case-map`, uiState: "case-map", prepare: goto(`/cases/${DAVID_NTN}/case-map`), compare: recorded() },
  "execution-s4-0": { route: `/cases/${DAVID_NTN}/documents`, uiState: "questionpath-eform", prepare: goto(`/cases/${DAVID_NTN}/documents`), compare: { maxDiffRatio: 0.4, sourceOnly: true, note: "Source is the QuestionPathClaim eForm viewer; mock shows the Documents tab it opens from." } },
  "execution-s5-0": { route: `/parties/${DAVID_PARTY}`, uiState: "david-personal", prepare: goto(`/parties/${DAVID_PARTY}`), compare: recorded() },
  "execution-s5-1": { route: `/parties/${DAVID_PARTY}/contact-details`, uiState: "contact-details", prepare: goto(`/parties/${DAVID_PARTY}/contact-details`), compare: recorded() },
  "execution-s5-2": { route: `/parties/${DAVID_PARTY}/communication-preferences`, uiState: "communication-preferences", prepare: goto(`/parties/${DAVID_PARTY}/communication-preferences`), compare: recorded() },
  "execution-s6-0": { route: `/cases/${DAVID_ABS}/leave-details`, uiState: "leave-details", prepare: goto(`/cases/${DAVID_ABS}/leave-details`), compare: recorded() },
  "execution-s6-1": { route: `/cases/${DAVID_ABS}/absence-hub`, uiState: "absence-hub", prepare: goto(`/cases/${DAVID_ABS}/absence-hub`), compare: recorded() },
  "execution-s6-2": { route: `/cases/${DAVID_ABS}/employment-details`, uiState: "employment-details", prepare: goto(`/cases/${DAVID_ABS}/employment-details`), compare: recorded() },
  "execution-s7-0": { route: `/cases/${DAVID_GDC}/claim-hub`, uiState: "claim-hub", prepare: goto(`/cases/${DAVID_GDC}/claim-hub`), compare: recorded() },
  "execution-s7-1": { route: `/cases/${DAVID_GDC}/medical`, uiState: "medical-details", prepare: goto(`/cases/${DAVID_GDC}/medical`), compare: recorded() },
  "execution-s7-2": { route: `/cases/${DAVID_GDC}/medical`, uiState: "medical-scrolled", prepare: goto(`/cases/${DAVID_GDC}/medical`), compare: recorded() },
  "execution-s7-3": { route: `/cases/${DAVID_GDC}/medical`, uiState: "condition-category-dropdown", prepare: goto(`/cases/${DAVID_GDC}/medical`), compare: { ...nativePopup(), mask: recorded().mask } },
  "execution-s8-0": { route: "/lookups/uknow", uiState: "uknow", prepare: goto("/lookups/uknow"), compare: external("uKnow knowledge-base") },
  "execution-s9-0": { route: "/lookups/google", uiState: "google", prepare: goto("/lookups/google"), compare: external("Google search") },
  "execution-s9-1": { route: "/lookups/icd10data", uiState: "icd10data", prepare: goto("/lookups/icd10data"), compare: external("ICD10Data.com") },
  "execution-s9-2": { route: "/lookups/icd-reference", uiState: "icd-reference", prepare: goto("/lookups/icd-reference"), compare: { maxDiffRatio: 0.4, mask: recorded().mask, note: "Internal reference-sheet screen with source recording overlay." } },
  "execution-s9-3": { route: "/lookups/icd-chart", uiState: "icd-chart", prepare: goto("/lookups/icd-chart"), compare: { maxDiffRatio: 0.4, note: "Common ICD-10 chart reference." } },
  "execution-s10-0": { route: `/cases/${DAVID_GDC}/medical`, uiState: "diagnosis-typeahead", prepare: goto(`/cases/${DAVID_GDC}/medical`, async (page) => { await page.getByLabel("Diagnosis code or description").last().fill("knee"); }), compare: recorded() },
  "execution-s10-1": { route: `/cases/${DAVID_GDC}/medical`, uiState: "primary-diagnosis-entered", prepare: goto(`/cases/${DAVID_GDC}/medical`), compare: recorded() },
  "execution-s11-0": { route: `/cases/${DAVID_GDC}/medical`, uiState: "choose-provider", prepare: goto(`/cases/${DAVID_GDC}/medical`, clickByName(/add medical provider/i)), compare: dialog({ mask: recorded().mask }) },
  "execution-s11-1": { route: `/cases/${DAVID_GDC}/medical`, uiState: "provider-search-results", prepare: goto(`/cases/${DAVID_GDC}/medical`, async (page) => { await clickByName(/add medical provider/i)(page); await page.getByRole("dialog").getByRole("button", { name: /^search$/i }).click(); }), compare: dialog({ mask: recorded().mask }) },
  "execution-s11-2": { route: `/cases/${DAVID_GDC}/medical`, uiState: "provider-details", prepare: goto(`/cases/${DAVID_GDC}/medical`, async (page) => { await clickByName(/add medical provider/i)(page); const d = page.getByRole("dialog"); await d.getByRole("button", { name: /^search$/i }).click(); await d.getByRole("button", { name: /travis larson$/i }).first().click(); }), compare: dialog({ mask: recorded().mask }) },
  "execution-s11-3": { route: `/cases/${DAVID_GDC}/medical`, uiState: "add-person", prepare: goto(`/cases/${DAVID_GDC}/medical`, async (page) => { await clickByName(/add medical provider/i)(page); await page.getByRole("dialog").getByRole("button", { name: /add person/i }).click(); }), compare: dialog({ mask: recorded().mask }) },
};

const requireMapping = (entry: ManifestEntry): StateMapping => {
  const mapping = MAPPINGS[entry.id];
  if (!mapping) throw new Error(`No visual mapping for manifest entry ${entry.id}`);
  return mapping;
};

export const visualStates: readonly VisualState[] = MANIFEST.map((entry) => ({
  id: entry.id,
  flow: entry.flow,
  fixture: entry.file,
  caption: entry.caption,
  viewport: { width: entry.width, height: entry.height },
  ...requireMapping(entry),
}));
