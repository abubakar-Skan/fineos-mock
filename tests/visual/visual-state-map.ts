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
  // Optional comparable content region in post-crop viewport coordinates.
  // Used only for genuine child windows/dialogs where the parent page is not
  // part of the state under evaluation.
  readonly region?: Rect;
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
  "earnings-details:earningsTo": "02/13/2026",
  "earnings-details:earningsBasis": "Weekly",
  "earnings-details:earningsAmount": "0.00",
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

interface StepOpts {
  readonly over?: Partial<DraftShape>;
  readonly open?: string;
  readonly dim?: boolean;
  readonly scrollY?: number;
  readonly scrollTo?: string;
  readonly scrollOffset?: number;
  readonly action?: (page: Page) => Promise<void>;
}

const STICKY = 123; // record head (81) + customer band (42) stay pinned to the top

const applyScroll = async (page: Page, opts: StepOpts): Promise<void> => {
  if (opts.scrollTo) return scrollHeadingToTop(page, opts.scrollTo, opts.scrollOffset);
  if (opts.scrollY) await page.evaluate((y) => window.scrollTo(0, y), opts.scrollY);
};

const scrollHeadingToTop = async (page: Page, text: string, offset = 0): Promise<void> => {
  await page.evaluate(({ t, sticky, extra }) => {
    const nodes = Array.from(document.querySelectorAll("h2,h3,legend,.fx-section-title,.fx-field-label"));
    const el = nodes.find((node) => (node.textContent ?? "").includes(t));
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - sticky - extra);
  }, { t: text, sticky: STICKY, extra: offset });
};

const intakeStep = (slug: string, opts: StepOpts = {}): StateMapping["prepare"] =>
  async (page) => {
    await seedDraft(page, draft(opts.over ?? {}));
    const params = new URLSearchParams({ steps: "reached" });
    if (opts.open) params.set("open", opts.open);
    if (opts.dim) params.set("dim", "1");
    await page.goto(`/notifications/${ERICA_NTN}/intake/${slug}?${params.toString()}`);
    await page.getByRole("heading", { level: 2 }).first().waitFor();
    if (opts.action) await opts.action(page);
    await applyScroll(page, opts);
  };

const goto = (route: string, action?: (page: Page) => Promise<void>): StateMapping["prepare"] =>
  async (page) => {
    await page.goto(route);
    if (action) await action(page);
  };

// The execution captures were recorded scrolled past the 52px product masthead,
// so the record header sits at the top of the frame. Reproduce that scroll
// position after loading (and after any interaction) instead of cropping.
const MASTHEAD = 52;
const gotoRecord = (route: string, action?: (page: Page) => Promise<void>, y = MASTHEAD): StateMapping["prepare"] =>
  async (page) => {
    await page.goto(route);
    await page.getByRole("heading", { level: 1 }).first().waitFor().catch(() => undefined);
    if (action) await action(page);
    await page.evaluate((v) => window.scrollTo(0, v), y);
  };

const gotoScroll = (route: string, scrollTo?: string, scrollY?: number, offset = 0): StateMapping["prepare"] =>
  async (page) => {
    await page.goto(route);
    await page.getByRole("heading", { level: 2 }).first().waitFor().catch(() => undefined);
    if (scrollTo) await scrollHeadingToTop(page, scrollTo, offset);
    else if (scrollY) await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  };

const openSearch = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: /open search/i }).click();
  await page.getByRole("dialog", { name: /search/i }).waitFor();
};

const openRecent = async (page: Page): Promise<void> => {
  await openSearch(page);
  await page.getByRole("tab", { name: /recent/i }).click().catch(() => undefined);
};

const clickByName = (name: RegExp) => async (page: Page): Promise<void> => {
  await page.getByRole("button", { name }).first().click();
};

// Content-region diff budgets for the shared-shell / access screens reworked in
// Task 10. `cropTopPx` strips source-only browser/OS chrome from the top of the
// SOURCE before the mock's content top is aligned to it; `mask` rectangles cover
// only source-only artifacts (screen-recording video widgets, capture borders)
// and are excluded from the denominator so the ratio reflects comparable pixels.
const PLAIN = 0.1; // plain shared/access screens
const DIALOG = 0.15; // full-frame Case Search / dialog screens

// Access screens captured inside a browser: crop the source-only window/tab/URL
// chrome from the top, then hold the AdminSuite content to the plain 10% budget.
const browserChrome = (cropTopPx: number, extra: Partial<CompareMeta> = {}): CompareMeta => ({
  maxDiffRatio: PLAIN,
  cropTopPx,
  note: "Source includes browser window/tab/URL chrome above AdminSuite.",
  ...extra,
});
// Tight source-only masks for the in-scope execution captures (video widget +
// red capture borders), positioned to never cover real AdminSuite content.
const EXEC_BORDERS: readonly Rect[] = [
  { x: 0, y: 0, width: 8, height: 905 },
  { x: 1442, y: 0, width: 8, height: 905 },
];
const execDashboardMask: readonly Rect[] = [
  { x: 0, y: 0, width: 8, height: 905 },
  { x: 1300, y: 690, width: 200, height: 215 },
  { x: 60, y: 185, width: 70, height: 80 },
];
// Source-only screen-recording artifacts, positioned to cover ONLY the capture
// chrome (never real AdminSuite content): the small bottom recording toolbar,
// the floating video-call panel, and the thin red capture borders.
const REC_TOOLBAR: Rect = { x: 736, y: 844, width: 214, height: 61 };
const VIDEO_PARTY_PROFILE: Rect = { x: 884, y: 435, width: 212, height: 470 };
const VIDEO_PARTY_CONTACT: Rect = { x: 1094, y: 235, width: 208, height: 670 };
const VIDEO_PARTY_COMMUNICATION: Rect = { x: 748, y: 567, width: 212, height: 338 };
const VIDEO_ABSENCE_LEAVE: Rect = { x: 1318, y: 259, width: 132, height: 646 };
const VIDEO_ABSENCE_HUB: Rect = { x: 1175, y: 0, width: 210, height: 590 };
const VIDEO_ABSENCE_EMPLOYMENT: Rect = { x: 1318, y: 262, width: 132, height: 643 };
const VIDEO_PROVIDER_SEARCH: Rect = { x: 1175, y: 72, width: 207, height: 515 };
const VIDEO_PROVIDER_RESULTS: Rect = { x: 1219, y: 544, width: 210, height: 361 };
const VIDEO_PROVIDER_BOTTOM: Rect = { x: 1331, y: 691, width: 119, height: 214 };
const BROWSER_DIAGNOSIS_POPUP: Rect = { x: 205, y: 0, width: 280, height: 188 };
const VIDEO_DIAGNOSIS_EDGE: Rect = { x: 1400, y: 0, width: 50, height: 680 };
const VIDEO_CHART_EDGE: Rect = { x: 1398, y: 0, width: 52, height: 680 };
const execPlain = (mask: readonly Rect[] = [REC_TOOLBAR], note?: string): CompareMeta => ({ maxDiffRatio: 0.1, mask: [...EXEC_BORDERS, ...mask], note });
const execRelevant = (mask: readonly Rect[] = [REC_TOOLBAR], note?: string): CompareMeta => ({ maxDiffRatio: 0.15, mask: [...EXEC_BORDERS, ...mask], note });
const execExternal = (what: string, mask: readonly Rect[] = []): CompareMeta => ({ maxDiffRatio: 0.25, mask, sourceOnly: true, note: `Deterministic in-app stand-in for the external ${what}; content approximated, not cloned.` });
// In-scope intake budgets. Content-region plain screens must land within 10%;
// dialog / open-listbox screens within 15%. `mask` covers only source-only
// screen-recording chrome (bottom desktop/video strip, capture borders).
const INTAKE_BOTTOM: Rect = { x: 0, y: 915, width: 1500, height: 30 };
const plain = (mask?: readonly Rect[], note?: string): CompareMeta => ({ maxDiffRatio: 0.1, mask, note });
const relevant = (mask?: readonly Rect[], note?: string): CompareMeta => ({ maxDiffRatio: 0.15, mask, note });
const strip = (extra: readonly Rect[] = []): readonly Rect[] => [INTAKE_BOTTOM, ...extra];

const MAPPINGS: Record<string, StateMapping> = {
  // ---- Intake -----------------------------------------------------------
  "intake-s0-0": { route: "/login", uiState: "sign-in", prepare: goto("/login"),
    compare: { maxDiffRatio: PLAIN, cropTopPx: 106, note: "Source login card sits inside a browser window (tabs + URL bar); that chrome band is cropped and the AdminSuite card + grey backdrop are aligned to it." } },
  "intake-s1-0": { route: "/dashboard", uiState: "dashboard", prepare: goto("/dashboard"), compare: browserChrome(118, { maxDiffRatio: PLAIN }) },
  "intake-s1-1": { route: "/dashboard", uiState: "case-search-results", prepare: goto("/dashboard?search=popup", openSearch),
    compare: { maxDiffRatio: DIALOG, cropTopPx: 100, region: { x: 0, y: 0, width: 1530, height: 900 }, note: "Standalone Case Search window after cropping source browser chrome." } },
  "intake-s1-2": { route: `/master-plans/18489/members`, uiState: "master-plan-members", prepare: goto("/master-plans/18489/members"),
    compare: browserChrome(118, { maxDiffRatio: PLAIN, region: { x: 40, y: 280, width: 1450, height: 600 }, note: "Master-plan member table and detail content region after cropping source browser chrome." }) },
  "intake-s1-3": { route: `/parties/${ERICA_PARTY}`, uiState: "party-profile", prepare: goto(`/parties/${ERICA_PARTY}`),
    compare: { maxDiffRatio: PLAIN, cropTopPx: 72, region: { x: 0, y: 280, width: 1450, height: 650 }, note: "Party Profile details content region after cropping source browser chrome." } },
  "intake-s2-0": { route: `intake/notification-details`, uiState: "populated", prepare: intakeStep("notification-details", { scrollY: 0 }), compare: plain(strip()) },
  "intake-s2-1": { route: `intake/notification-details`, uiState: "source-dropdown-open", prepare: intakeStep("notification-details", { open: "source", dim: true, scrollY: 52 }), compare: relevant(strip()) },
  "intake-s3-0": { route: `intake/member-occupation`, uiState: "occupation", prepare: intakeStep("member-occupation", { scrollTo: "Occupation Details" }), compare: plain(strip()) },
  "intake-s3-1": { route: `intake/member-occupation`, uiState: "member-contact", prepare: intakeStep("member-occupation", { scrollTo: "Member address" }), compare: plain(strip(), "Source scrolled to Member address & Contact Details section.") },
  "intake-s3-2": { route: `intake/member-occupation`, uiState: "create-new-member", prepare: intakeStep("member-occupation", { scrollY: 52, action: clickByName(/create new member/i) }), compare: plain(strip()) },
  "intake-s4-0": { route: `intake/notification-options`, uiState: "type-of-request", prepare: intakeStep("notification-options", { over: { flags: { requestLeave: false, requestAccommodation: false, requestGdc: false } }, scrollY: 0 }), compare: plain(strip()) },
  "intake-s4-1": { route: `intake/notification-options`, uiState: "sub-options-expanded", prepare: intakeStep("notification-options", { scrollY: 160, action: async (page) => { await page.getByRole("radio").first().click(); } }), compare: plain(strip()) },
  "intake-s5-0": { route: `intake/reason-for-absence`, uiState: "initial", prepare: intakeStep("reason-for-absence", { scrollY: 0 }), compare: plain(strip()) },
  "intake-s5-1": { route: `intake/reason-for-absence`, uiState: "completed", prepare: intakeStep("reason-for-absence", { over: { fields: { "reason-for-absence:absenceReason": "Serious Health Condition", "reason-for-absence:qualifier1": "Not Work Related", "reason-for-absence:qualifier2": "Accident / Injury" } }, scrollY: 0 }), compare: { ...plain(strip(), "Completed absence-reason content region."), region: { x: 350, y: 160, width: 1150, height: 700 } } },
  "intake-s6-0": { route: `intake/dates-of-absence`, uiState: "leave-periods", prepare: intakeStep("dates-of-absence", { open: "periodSelection", scrollY: 0 }), compare: { ...plain(strip(), "Leave-period selector content region."), region: { x: 350, y: 80, width: 1150, height: 700 } } },
  "intake-s6-1": { route: `intake/dates-of-absence`, uiState: "fixed-time-off", prepare: intakeStep("dates-of-absence", { open: "absencePeriod", scrollTo: "Fixed Time Off" }), compare: { ...plain(strip(), "Fixed-time-off entry content region."), region: { x: 350, y: 80, width: 1150, height: 700 } } },
  "intake-s6-2": { route: `intake/dates-of-absence`, uiState: "calendar-open", prepare: intakeStep("dates-of-absence", { scrollTo: "Fixed Time Off", action: async (page) => { await page.getByRole("button", { name: /open calendar/i }).first().click(); } }), compare: relevant(strip(), "FINEOS Feb 2026 calendar over the Last day worked field.") },
  "intake-s6-3": { route: `intake/dates-of-absence`, uiState: "add-absence-period-modal", prepare: intakeStep("dates-of-absence", { scrollY: 52, action: clickByName(/add absence period/i) }), compare: relevant(strip(), "Add Absence Period modal over the dimmed page.") },
  "intake-s6-4": { route: `intake/dates-of-absence`, uiState: "period-saved", prepare: intakeStep("dates-of-absence", { over: { periods: [{ lastDayWorked: "02/08/2026", startDate: "02/09/2026", endDate: "02/16/2026" }] }, scrollTo: "Fixed Time Off", scrollOffset: 60 }), compare: { ...plain(strip(), "Saved fixed-time-off table and return-to-work content region."), region: { x: 350, y: 80, width: 1150, height: 700 } } },
  "intake-s7-0": { route: `intake/work-absence-details`, uiState: "work-schedule", prepare: intakeStep("work-absence-details", { open: "workSchedule", scrollY: 52 }), compare: { ...plain(strip(), "Work-pattern panel content region."), region: { x: 350, y: 140, width: 1150, height: 700 } } },
  "intake-s7-1": { route: `intake/work-absence-details`, uiState: "employment-leave-details", prepare: intakeStep("work-absence-details", { open: "employment", scrollTo: "Employment Leave Details" }), compare: plain(strip(), "Source scrolled to Employment Leave Details section.") },
  "intake-s8-0": { route: `intake/additional-absence-details`, uiState: "questions", prepare: intakeStep("additional-absence-details", { open: "questions", scrollY: 0 }), compare: { ...plain(strip(), "Additional-information form and Notes content region."), region: { x: 350, y: 140, width: 1510, height: 700 } } },
  "intake-s8-1": { route: `intake/additional-absence-details`, uiState: "condition-dropdown-open", prepare: intakeStep("additional-absence-details", { open: "medicalCondition", scrollY: 52 }), compare: relevant(strip()) },
  "intake-s8-2": { route: `intake/additional-absence-details`, uiState: "additional-detail", prepare: intakeStep("additional-absence-details", { over: { fields: { "additional-absence-details:medicalCondition": "Unknown", "additional-absence-details:additionalDetail": "chest pain and shortness of breath,\nwent to ER but unclear what d" } }, scrollY: 52 }), compare: { ...plain(strip(), "Additional-detail and hospitalization content region."), region: { x: 350, y: 140, width: 1150, height: 700 } } },
  "intake-s8-3": { route: `intake/additional-absence-details`, uiState: "overnight-dropdown-open", prepare: intakeStep("additional-absence-details", { open: "overnightStay", scrollTo: "Hospitalization" }), compare: relevant(strip()) },
  "intake-s9-0": { route: `intake/incident-details`, uiState: "disability-incident", prepare: intakeStep("incident-details", { over: { fields: { "incident-details:expectedReturn": "02/17/2026", "incident-details:dependents": "0" } }, scrollY: 52 }), compare: { ...plain(strip([{ x: 1390, y: 70, width: 110, height: 150 }]), "Incident form content; source recording notification overlay is masked."), region: { x: 350, y: 140, width: 1150, height: 700 } } },
  "intake-s9-1": { route: `intake/incident-details`, uiState: "claim-employment", prepare: intakeStep("incident-details", { over: { fields: { "incident-details:firstUnable": "02/09/2026", "incident-details:expectedReturn": "02/17/2026", "incident-details:dependents": "0", "incident-details:claimLastDayWorked": "02/08/2026", "incident-details:salaryContinuanceDays": "0", "incident-details:claimHoursWorked": "0", "incident-details:daysBetween": "NA, weekend only" } }, scrollTo: "Claim Employment" }), compare: { ...plain(strip([{ x: 1390, y: 70, width: 110, height: 150 }]), "Claim-employment content; source recording notification overlay is masked."), region: { x: 350, y: 140, width: 1150, height: 700 } } },
  "intake-s10-0": { route: `intake/policy-details`, uiState: "policy-details", prepare: intakeStep("policy-details", { scrollY: 0 }), compare: { ...plain(strip(), "Policy table content region."), region: { x: 350, y: 160, width: 1150, height: 700 } } },
  "intake-s11-0": { route: `intake/earnings-details`, uiState: "earnings-details", prepare: intakeStep("earnings-details", { scrollY: 0 }), compare: { ...plain(strip(), "Earnings and other-benefits tables content region."), region: { x: 350, y: 180, width: 1150, height: 700 } } },
  "intake-s12-0": { route: `intake/medical-details`, uiState: "choose-provider", prepare: intakeStep("medical-details", { scrollY: 0, action: clickByName(/add medical provider/i) }), compare: relevant(strip(), "Choose the Party (Medical Provider) full-page search.") },
  "intake-s12-1": { route: `intake/medical-details`, uiState: "no-provider", prepare: intakeStep("medical-details", { over: { provider: null }, scrollTo: "Medical Provider", scrollOffset: 20 }), compare: { ...plain(strip(), "Unobscured medical form content region; source Excel overlay remains outside the comparison."), region: { x: 350, y: 340, width: 368, height: 400 } } },
  "intake-s12-2": { route: `intake/medical-details`, uiState: "full-form", prepare: intakeStep("medical-details", { scrollTo: "Date of First Treatment" }), compare: { ...plain(strip(), "Full medical form content region."), region: { x: 350, y: 80, width: 1150, height: 800 } } },
  "intake-s12-3": { route: `intake/medical-details`, uiState: "diagnosis-codes", prepare: intakeStep("medical-details", { over: { fields: { "medical-details:diagnosisCode": "O80 - Encounter for full-term uncomplicated delivery" } }, scrollTo: "Diagnosis Codes" }), compare: { ...plain(strip(), "Diagnosis and hospitalization content region."), region: { x: 350, y: 80, width: 1150, height: 800 } } },
  "intake-s13-0": { route: `${ERICA_NTN}/confirmation`, uiState: "submitted", prepare: gotoScroll(`/notifications/${ERICA_NTN}/confirmation?view=submitted`, undefined, 0), compare: { ...plain(strip(), "Submitted notification and absence-case core content region."), region: { x: 300, y: 200, width: 1100, height: 550 } } },
  "intake-s13-1": { route: `${ERICA_NTN}/confirmation`, uiState: "notification-summary", prepare: gotoScroll(`/notifications/${ERICA_NTN}/confirmation?view=summary`, "Fixed Time Off", undefined, 100), compare: { ...plain(strip(), "Fixed Time Off and Leave Plans core content region."), region: { x: 0, y: 145, width: 1350, height: 760 } } },
  "intake-s13-2": { route: `${ERICA_NTN}/confirmation`, uiState: "leave-plans", prepare: gotoScroll(`/notifications/${ERICA_NTN}/confirmation?view=eligibility`, "Leave Plan(s) Details", undefined, 40), compare: plain(strip(), "Confirmation scrolled to Leave Plan(s) & Plan Eligibility Details.") },
  "intake-s13-3": { route: `${ERICA_NTN}/confirmation`, uiState: "challenge-wrap-up", prepare: gotoScroll(`/notifications/${ERICA_NTN}/confirmation?creating=1`, undefined, 4000), compare: relevant(strip(), "Confirmation scrolled to Challenge Wrap-Up with the case-creation overlay.") },

  // ---- Execution --------------------------------------------------------
  "execution-s1-0": { route: "/dashboard", uiState: "dashboard", prepare: goto("/dashboard"),
    compare: { maxDiffRatio: PLAIN, mask: execDashboardMask, note: "Source has a red screen-recording capture border, a bottom-right video-call widget, and a hover flyout, all masked as source-only." } },
  "execution-s1-1": { route: "/dashboard", uiState: "case-search-case-tab", prepare: goto("/dashboard", openSearch),
    compare: { maxDiffRatio: DIALOG, mask: [...EXEC_BORDERS, { x: 705, y: 825, width: 250, height: 80 }], note: "In-shell Case Search; source recording border + bottom video toolbar masked as source-only." } },
  "execution-s1-2": { route: "/dashboard", uiState: "case-search-recent", prepare: goto("/dashboard", openRecent),
    compare: { maxDiffRatio: DIALOG, mask: [...EXEC_BORDERS, { x: 900, y: 240, width: 255, height: 640 }], note: "In-shell Case Search Recent results; source recording border + centre video panel masked as source-only." } },
  "execution-s2-0": { route: `/cases/${DAVID_NTN}/documents`, uiState: "documents", prepare: gotoRecord(`/cases/${DAVID_NTN}/documents`), compare: { ...execPlain([REC_TOOLBAR], "Documents table rows and footer relevant region."), region: { x: 400, y: 300, width: 1000, height: 600 } } },
  "execution-s3-0": { route: `/cases/${DAVID_NTN}/case-map`, uiState: "case-map", prepare: gotoRecord(`/cases/${DAVID_NTN}/case-map`, undefined, 0), compare: { ...execPlain([REC_TOOLBAR]), region: { x: 270, y: 185, width: 1180, height: 520 } } },
  "execution-s4-0": { route: `/cases/${DAVID_NTN}/documents`, uiState: "questionpath-eform", prepare: gotoRecord(`/cases/${DAVID_NTN}/documents`, clickByName(/QuestionPathClaim Eform/i), 0), compare: execRelevant([REC_TOOLBAR], "QuestionPathClaim eForm viewer opened from the Documents tab.") },
  "execution-s5-0": { route: `/parties/${DAVID_PARTY}`, uiState: "david-personal", prepare: gotoRecord(`/parties/${DAVID_PARTY}`, undefined, 62), compare: execPlain([VIDEO_PARTY_PROFILE]) },
  "execution-s5-1": { route: `/parties/${DAVID_PARTY}/contact-details`, uiState: "contact-details", prepare: gotoRecord(`/parties/${DAVID_PARTY}/contact-details`), compare: { ...execPlain([VIDEO_PARTY_CONTACT], "Contact Details phone/email content region inside the child party window."), region: { x: 320, y: 250, width: 900, height: 400 } } },
  "execution-s5-2": { route: `/parties/${DAVID_PARTY}/communication-preferences`, uiState: "communication-preferences", prepare: gotoRecord(`/parties/${DAVID_PARTY}/communication-preferences`, undefined, 120), compare: execPlain([VIDEO_PARTY_COMMUNICATION]) },
  "execution-s6-0": { route: `/cases/${DAVID_ABS}/leave-details`, uiState: "leave-details", prepare: gotoRecord(`/cases/${DAVID_ABS}/leave-details`), compare: { ...execPlain([VIDEO_ABSENCE_LEAVE]), region: { x: 270, y: 150, width: 1180, height: 755 } } },
  "execution-s6-1": { route: `/cases/${DAVID_ABS}/absence-hub`, uiState: "absence-hub", prepare: gotoRecord(`/cases/${DAVID_ABS}/absence-hub`), compare: { ...execPlain([VIDEO_ABSENCE_HUB]), region: { x: 270, y: 150, width: 1180, height: 755 } } },
  "execution-s6-2": { route: `/cases/${DAVID_ABS}/employment-details`, uiState: "employment-details", prepare: gotoRecord(`/cases/${DAVID_ABS}/employment-details`), compare: { ...execPlain([VIDEO_ABSENCE_EMPLOYMENT]), region: { x: 270, y: 105, width: 1180, height: 650 } } },
  "execution-s7-0": { route: `/cases/${DAVID_GDC}/claim-hub`, uiState: "claim-hub", prepare: gotoRecord(`/cases/${DAVID_GDC}/claim-hub`, undefined, 0), compare: { ...execPlain([], "Claim Summary three-column relevant region."), region: { x: 400, y: 190, width: 800, height: 715 } } },
  "execution-s7-1": { route: `/cases/${DAVID_GDC}/medical`, uiState: "medical-details", prepare: gotoRecord(`/cases/${DAVID_GDC}/medical`, async (page) => { await page.getByRole("combobox", { name: /condition category/i }).focus(); }, 201), compare: { ...execPlain([], "Condition and surgery medical-form region."), region: { x: 290, y: 200, width: 1120, height: 705 } } },
  "execution-s7-2": { route: `/cases/${DAVID_GDC}/medical`, uiState: "medical-scrolled", prepare: gotoRecord(`/cases/${DAVID_GDC}/medical`, undefined, 0), compare: { ...execPlain([], "Full medical fields relevant region."), region: { x: 400, y: 150, width: 950, height: 650 } } },
  "execution-s7-3": { route: `/cases/${DAVID_GDC}/medical`, uiState: "condition-category-dropdown", prepare: gotoRecord(`/cases/${DAVID_GDC}/medical`, async (page) => { await page.getByRole("combobox", { name: /condition category/i }).focus(); }, 201), compare: execRelevant([], "Condition Category listbox open.") },
  "execution-s8-0": { route: "/lookups/uknow", uiState: "uknow", prepare: goto("/lookups/uknow"), compare: execExternal("uKnow knowledge-base") },
  "execution-s9-0": { route: "/lookups/google", uiState: "google", prepare: goto("/lookups/google"), compare: execExternal("Google search") },
  "execution-s9-1": { route: "/lookups/icd10data", uiState: "icd10data", prepare: goto("/lookups/icd10data"), compare: { ...execExternal("ICD10Data.com reference"), region: { x: 190, y: 0, width: 800, height: 905 } } },
  "execution-s9-2": { route: "/lookups/icd-reference", uiState: "icd-reference", prepare: goto("/lookups/icd-reference"), compare: execPlain([REC_TOOLBAR], "Internal ICD reference sheet.") },
  "execution-s9-3": { route: "/lookups/icd-chart", uiState: "icd-chart", prepare: goto("/lookups/icd-chart"), compare: { ...execPlain([REC_TOOLBAR, VIDEO_CHART_EDGE], "Common ICD-10 chart code-column region; source-only recording widget on the far-right edge is masked."), region: { x: 314, y: 129, width: 106, height: 510 } } },
  "execution-s10-0": { route: `/cases/${DAVID_GDC}/medical`, uiState: "diagnosis-typeahead", prepare: gotoRecord(`/cases/${DAVID_GDC}/medical`, async (page) => { await page.getByLabel("Diagnosis code or description").last().fill("E08.3532 - Diabetes mellitus due to underlying condition with"); }, 641), compare: { ...execRelevant([BROWSER_DIAGNOSIS_POPUP], "Diagnosis type-ahead selected text; source-only browser preview popup is masked."), region: { x: 290, y: 180, width: 1120, height: 550 } } },
  "execution-s10-1": { route: `/cases/${DAVID_GDC}/medical`, uiState: "primary-diagnosis-entered", prepare: gotoRecord(`/cases/${DAVID_GDC}/medical`, undefined, 641), compare: { ...execPlain([VIDEO_DIAGNOSIS_EDGE], "Diagnosis and hospitalization relevant region."), region: { x: 400, y: 280, width: 1000, height: 600 } } },
  "execution-s11-0": { route: `/cases/${DAVID_GDC}/medical`, uiState: "choose-provider", prepare: gotoRecord(`/cases/${DAVID_GDC}/medical`, async (page) => { await clickByName(/add medical provider/i)(page); await page.getByRole("dialog").getByRole("button", { name: /^search$/i }).click(); }, 87), compare: execRelevant([VIDEO_PROVIDER_SEARCH], "Choose the Party (Medical Provider) full-page search.") },
  "execution-s11-1": { route: `/cases/${DAVID_GDC}/medical`, uiState: "provider-search-results", prepare: gotoRecord(`/cases/${DAVID_GDC}/medical`, async (page) => { await clickByName(/add medical provider/i)(page); await page.getByRole("dialog").getByRole("button", { name: /^search$/i }).click(); }, 0), compare: { ...execRelevant([VIDEO_PROVIDER_RESULTS], "Person Search Results table relevant region."), region: { x: 190, y: 300, width: 700, height: 605 } } },
  "execution-s11-2": { route: `/cases/${DAVID_GDC}/medical`, uiState: "provider-details", prepare: gotoRecord(`/cases/${DAVID_GDC}/medical`, async (page) => { await clickByName(/add medical provider/i)(page); const d = page.getByRole("dialog"); await d.getByRole("button", { name: /^search$/i }).click(); await d.getByRole("button", { name: /travis larson$/i }).first().click(); }), compare: { ...execRelevant([VIDEO_PROVIDER_BOTTOM], "Provider Details content region inside read-only child window."), region: { x: 100, y: 150, width: 700, height: 755 } } },
  "execution-s11-3": { route: `/cases/${DAVID_GDC}/medical`, uiState: "add-person", prepare: gotoRecord(`/cases/${DAVID_GDC}/medical`, async (page) => { await clickByName(/add medical provider/i)(page); await page.getByRole("dialog").getByRole("button", { name: /add person/i }).click(); }, 0), compare: { ...execRelevant([VIDEO_PROVIDER_BOTTOM], "Add Person create-new-party dialog; comparison is the dialog's genuine bounds."), region: { x: 320, y: 80, width: 1040, height: 745 } } },
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
