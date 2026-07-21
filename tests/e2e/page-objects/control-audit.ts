import {
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  assertInventory,
  assertOptions,
  changeSelect,
  changeText,
  control,
  toggle,
  type ControlSpec,
} from "./inventory";
import { apiCreateDraft, apiSaveSection } from "../helpers";

const ERICA_PARTY = "/parties/PTY-80937";
const MASTER_PLAN = "/master-plans/18489/members";

const INTAKE_LIFECYCLE = [
  { source: "s0", title: "Log in to FINEOS", audit: "AccessAudit", slug: null },
  { source: "s1", title: "Locate the customer & launch the notification", audit: "AccessAudit", slug: null },
  { source: "s2", title: "Notification Details", audit: "IntakeAudit", slug: "notification-details" },
  { source: "s3", title: "Member & Occupation", audit: "IntakeAudit", slug: "member-occupation" },
  { source: "s4", title: "Notification Options", audit: "IntakeAudit", slug: "notification-options" },
  { source: "s5", title: "Reason for Absence", audit: "IntakeAudit", slug: "reason-for-absence" },
  { source: "s6", title: "Dates of Absence", audit: "IntakeAudit", slug: "dates-of-absence" },
  { source: "s7", title: "Work Absence Details", audit: "IntakeAudit", slug: "work-absence-details" },
  { source: "s8", title: "Additional Absence Details", audit: "IntakeAudit", slug: "additional-absence-details" },
  { source: "s9", title: "Incident Details", audit: "IntakeAudit", slug: "incident-details" },
  { source: "s10", title: "Policy Details", audit: "IntakeAudit", slug: "policy-details" },
  { source: "s11", title: "Earnings Details", audit: "IntakeAudit", slug: "earnings-details" },
  { source: "s12", title: "Medical Details", audit: "IntakeAudit", slug: "medical-details" },
  { source: "s13", title: "Confirmation", audit: "ConfirmationAudit", slug: null },
] as const;

const HEADER = [
  control("textbox", "Global search"),
  control("button", "Open search"),
  control("button", "Open in new window"),
  control("button", "Theme"),
  control("combobox", "Language"),
] as const;

const NAVIGATION = [
  control("button", "Home"),
  control("button", "Parties"),
  control("button", "Cases"),
  control("button", "Work Queues"),
  control("button", "Tasks"),
  control("button", "Library"),
] as const;

const TEAM_ROWS = [
  "Unassigned 42706", "Josh Maxwell 78", "Paul Cheng 12", "Austin Lazowski 4",
  "EST1 4", "Kamala Vutukuri 4", "Deborah Buco 2", "Latasha Lyons 2",
] as const;

const DASHBOARD = [
  control("button", "Dashboard Settings ⚙"),
  control("combobox", "Role"),
  control("combobox", "Case scope"),
  control("button", "Close My Cases Listview"),
  control("button", "Close Team Cases By User"),
  control("button", "Close Tasks by Type"),
  control("button", "Clear Filter"),
  ...TEAM_ROWS.map((name) => control("button", name)),
] as const;

export class AccessAudit {
  static readonly lifecycleStages = ["s0", "s1"] as const;

  constructor(private readonly page: Page) {}

  async run(): Promise<void> {
    await auditLogin(this.page);
    await auditCustomerLaunch(this.page);
    await auditHeader(this.page);
    await auditNavigation(this.page);
    await auditDashboard(this.page);
  }
}

const auditLogin = async (page: Page): Promise<void> => {
  await page.goto("/login");
  const form = page.getByRole("form", { name: "Sign in" });
  await assertInventory(form, LOGIN);
  await changeText(form.getByRole("textbox", { name: "Email" }), "audit@example.com");
  await changeText(form.getByLabel("Password"), "fineos");
  await form.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

const LOGIN = [
  control("textbox", "Email"),
  control("textbox", "Password"),
  control("button", "Sign in"),
] as const;

const auditCustomerLaunch = async (page: Page): Promise<void> => {
  await openParty(page);
  await page.getByRole("button", { name: "Create Notification" }).click();
  await expect(page).toHaveURL(/\/notifications\/NTN-\d+\/intake\/notification-details$/);
};

const openDashboard = async (page: Page): Promise<void> => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
};

const auditHeader = async (page: Page): Promise<void> => {
  await openDashboard(page);
  await assertInventory(page.locator(".fx-header"), HEADER);
  await exerciseSearchOpeners(page);
  await exerciseHeaderToggles(page);
  await exerciseLanguage(page);
};

const exerciseSearchOpeners = async (page: Page): Promise<void> => {
  await page.getByRole("textbox", { name: "Global search" }).click();
  let dialog = page.getByRole("dialog", { name: "Case Search" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Open search" }).click();
  dialog = page.getByRole("dialog", { name: "Case Search" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
};

const exerciseHeaderToggles = async (page: Page): Promise<void> => {
  await pressAndAssert(page.getByRole("button", { name: "Open in new window" }));
  await pressAndAssert(page.getByRole("button", { name: "Theme" }));
};

const pressAndAssert = async (button: Locator): Promise<void> => {
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
};

const exerciseLanguage = async (page: Page): Promise<void> => {
  const language = page.getByRole("combobox", { name: "Language" });
  await assertOptions(language, ["English", "Español"]);
  await changeSelect(language, "Español");
};

const auditNavigation = async (page: Page): Promise<void> => {
  await openDashboard(page);
  await assertInventory(page.getByRole("navigation", { name: "Primary" }), NAVIGATION);
  await exerciseNavigationLinks(page);
  await exerciseUnsupportedNavigation(page);
};

const exerciseNavigationLinks = async (page: Page): Promise<void> => {
  await clickNav(page, "Home", /\/dashboard$/);
  await openSearchFromNav(page, "Parties", "Party");
  await openSearchFromNav(page, "Cases", "Case");
};

const clickNav = async (page: Page, name: string, url: RegExp): Promise<void> => {
  await openDashboard(page);
  await page.getByRole("navigation", { name: "Primary" })
    .getByRole("button", { name, exact: true }).click();
  await expect(page).toHaveURL(url);
};

// The Parties/Cases icons open Case Search on the matching tab rather than
// jumping straight to a party or master-plan record; the shell URL stays put.
const openSearchFromNav = async (page: Page, name: string, tab: string): Promise<void> => {
  await openDashboard(page);
  await page.getByRole("navigation", { name: "Primary" })
    .getByRole("button", { name, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Case Search" });
  await expect(dialog.getByRole("tab", { name: tab, exact: true }))
    .toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/dashboard$/);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
};

const exerciseUnsupportedNavigation = async (page: Page): Promise<void> => {
  for (const name of ["Work Queues", "Tasks", "Library"]) {
    await openDashboard(page);
    await page.getByRole("navigation", { name: "Primary" })
      .getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("status")).toContainText(`${name} is not available`);
  }
};

const auditDashboard = async (page: Page): Promise<void> => {
  await openDashboard(page);
  await assertInventory(page.locator("main"), DASHBOARD);
  await exerciseDashboardSettings(page);
  await exerciseDashboardRows(page);
  await exerciseWidgetClose(page);
};

const exerciseDashboardSettings = async (page: Page): Promise<void> => {
  await pressAndAssert(page.getByRole("button", { name: "Dashboard Settings ⚙" }));
  await changeSelect(page.getByRole("combobox", { name: "Role" }), "Eligibility Specialist");
  await changeSelect(page.getByRole("combobox", { name: "Case scope" }), "My Cases");
};

const exerciseDashboardRows = async (page: Page): Promise<void> => {
  for (const name of TEAM_ROWS) {
    await openDashboard(page);
    const row = page.getByRole("button", { name });
    await row.click();
    await expect(row).toHaveAttribute("aria-selected", "true");
  }
  await clearDashboardFilter(page);
};

const clearDashboardFilter = async (page: Page): Promise<void> => {
  await openDashboard(page);
  const row = page.getByRole("button", { name: TEAM_ROWS[0] });
  await row.click();
  await page.getByRole("button", { name: "Clear Filter" }).click();
  await expect(row).toHaveAttribute("aria-selected", "false");
};

const exerciseWidgetClose = async (page: Page): Promise<void> => {
  for (const title of ["My Cases Listview", "Team Cases By User", "Tasks by Type"]) {
    await openDashboard(page);
    await page.getByRole("button", { name: `Close ${title}` }).click();
    await expect(page.getByRole("region", { name: title })).toHaveCount(0);
  }
};

const SEARCH_TABS = [
  control("tab", "Case"),
  control("tab", "Party"),
  control("tab", "Recent"),
] as const;

const DIALOG_ACTIONS = [
  control("button", "OK"),
  control("button", "Cancel"),
] as const;

const CASE_SEARCH = [
  ...DIALOG_ACTIONS,
  ...SEARCH_TABS,
  control("textbox", "Case Number"),
  control("checkbox", "Search Case Alias"),
  control("textbox", "Incurred Date"),
  control("textbox", "Policy Number (Ref1)"),
  control("textbox", "Ref2"),
  control("combobox", "Case Type"),
  control("checkbox", "Display Sub-Cases"),
  control("button", "Search"),
] as const;

const PARTY_SEARCH = [
  ...DIALOG_ACTIONS,
  ...SEARCH_TABS,
  control("textbox", "Search term"),
  control("button", "Search"),
] as const;

// Every recent row is a semantic button that opens its own case record, routed
// by the case-id suffix: notifications → general, absence → absence-hub.
const RECENT_RESULTS = [
  { name: "Notification - NTN-159898", url: /\/cases\/NTN-159898\/general$/ },
  { name: "Absence Case - NTN-162642-ABS-01", url: /\/cases\/NTN-162642-ABS-01\/absence-hub$/ },
  { name: "Notification - NTN-162642", url: /\/cases\/NTN-162642\/general$/ },
  { name: "Notification - NTN-162641", url: /\/cases\/NTN-162641\/general$/ },
  { name: "Absence Case - NTN-162641-ABS-01", url: /\/cases\/NTN-162641-ABS-01\/absence-hub$/ },
  { name: "Absence Case - NTN-160306-ABS-01", url: /\/cases\/NTN-160306-ABS-01\/absence-hub$/ },
  { name: "Notification - NTN-160306", url: /\/cases\/NTN-160306\/general$/ },
  { name: "Notification - NTN-159901", url: /\/cases\/NTN-159901\/general$/ },
  { name: "Absence Case - NTN-159901-ABS-01", url: /\/cases\/NTN-159901-ABS-01\/absence-hub$/ },
  { name: "Absence Case - NTN-148123-ABS-01", url: /\/cases\/NTN-148123-ABS-01\/absence-hub$/ },
  { name: "Notification - NTN-165775", url: /\/cases\/NTN-165775\/general$/ },
] as const;

const RECENT_SEARCH = [
  ...DIALOG_ACTIONS,
  ...SEARCH_TABS,
  ...RECENT_RESULTS.map(({ name }) => control("button", name)),
] as const;

export class SearchAudit {
  constructor(private readonly page: Page) {}

  async run(): Promise<void> {
    await auditCaseSearch(this.page);
    await auditPartySearch(this.page);
    await auditRecentSearch(this.page);
  }

  async runEveryResult(): Promise<void> {
    await auditEveryCaseResult(this.page);
    await auditEveryPartyResult(this.page);
    await auditEveryRecentResult(this.page);
  }
}

const openSearch = async (page: Page): Promise<Locator> => {
  await openDashboard(page);
  await page.getByRole("button", { name: "Open search" }).click();
  return page.getByRole("dialog", { name: "Case Search" });
};

const auditCaseSearch = async (page: Page): Promise<void> => {
  const dialog = await openSearch(page);
  await assertInventory(dialog, CASE_SEARCH);
  await exerciseCaseFields(dialog);
  await dialog.getByRole("button", { name: "Search" }).click();
  await expect(dialog.getByRole("button", { name: "Master Plan - 18489" })).toBeVisible();
  await auditCaseResult(page);
};

const exerciseCaseFields = async (dialog: Locator): Promise<void> => {
  await changeText(dialog.getByRole("textbox", { name: "Case Number" }), "165775");
  await toggle(dialog.getByRole("checkbox", { name: "Search Case Alias" }));
  await changeText(dialog.getByRole("textbox", { name: "Incurred Date" }), "02/13/2026");
  await changeText(dialog.getByRole("textbox", { name: "Policy Number (Ref1)" }), "P1");
  await changeText(dialog.getByRole("textbox", { name: "Ref2" }), "R2");
  await changeSelect(dialog.getByRole("combobox", { name: "Case Type" }), "Absence Case");
  await toggle(dialog.getByRole("checkbox", { name: "Display Sub-Cases" }));
};

const auditCaseResult = async (page: Page): Promise<void> => {
  const dialog = page.getByRole("dialog", { name: "Case Search" });
  const expected = [...CASE_SEARCH, control("button", "Master Plan - 18489"),
    control("button", "NTN-165775")] as const;
  await assertInventory(dialog, expected);
  await dialog.getByRole("button", { name: "Master Plan - 18489" }).click();
  await expect(page).toHaveURL(/\/master-plans\/18489\/members$/);
  await auditNotificationSearchResult(page);
};

const auditNotificationSearchResult = async (page: Page): Promise<void> => {
  const dialog = await openSearch(page);
  await changeText(dialog.getByRole("textbox", { name: "Case Number" }), "165775");
  await dialog.getByRole("button", { name: "Search" }).click();
  await dialog.getByRole("button", { name: "NTN-165775" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Selected NTN-165775");
};

const CASE_RESULTS = [
  { name: "Master Plan - 18489", effect: { kind: "url", value: /\/master-plans\/18489\/members$/ } },
  { name: "NTN-165775", effect: { kind: "status", value: "Selected NTN-165775" } },
] as const;

const auditEveryCaseResult = async (page: Page): Promise<void> => {
  for (const result of CASE_RESULTS) {
    const dialog = await openCaseResults(page);
    await dialog.getByRole("button", { name: result.name, exact: true }).click();
    await assertCaseResultEffect(page, dialog, result.effect);
  }
};

const openCaseResults = async (page: Page): Promise<Locator> => {
  const dialog = await openSearch(page);
  await changeText(dialog.getByRole("textbox", { name: "Case Number" }), "165775");
  await dialog.getByRole("button", { name: "Search" }).click();
  await assertInventory(dialog, [
    ...CASE_SEARCH, ...CASE_RESULTS.map(({ name }) => control("button", name)),
  ]);
  return dialog;
};

const assertCaseResultEffect = async (
  page: Page,
  dialog: Locator,
  effect: (typeof CASE_RESULTS)[number]["effect"],
): Promise<void> => {
  if (effect.kind === "url") await expect(page).toHaveURL(effect.value);
  else await expect(dialog.getByRole("status")).toHaveText(effect.value);
};

const PARTY_RESULTS = [
  { name: "Erica Alexander", term: "Erica", url: /\/parties\/PTY-80937$/ },
] as const;

const auditEveryPartyResult = async (page: Page): Promise<void> => {
  for (const result of PARTY_RESULTS) {
    const dialog = await openPartyResults(page, result.term);
    await dialog.getByRole("button", { name: result.name, exact: true }).click();
    await expect(page).toHaveURL(result.url);
  }
};

const openPartyResults = async (page: Page, term: string): Promise<Locator> => {
  const dialog = await openSearch(page);
  await dialog.getByRole("tab", { name: "Party" }).click();
  await changeText(dialog.getByRole("textbox", { name: "Search term" }), term);
  await dialog.getByRole("button", { name: "Search" }).click();
  await assertInventory(dialog, [
    ...PARTY_SEARCH, ...PARTY_RESULTS.map(({ name }) => control("button", name)),
  ]);
  return dialog;
};

const auditEveryRecentResult = async (page: Page): Promise<void> => {
  for (const result of RECENT_RESULTS) {
    const dialog = await openRecentResults(page);
    await dialog.getByRole("button", { name: result.name, exact: true }).click();
    await expect(page).toHaveURL(result.url);
  }
};

const openRecentResults = async (page: Page): Promise<Locator> => {
  const dialog = await openSearch(page);
  await dialog.getByRole("tab", { name: "Recent" }).click();
  await assertInventory(dialog, RECENT_SEARCH);
  return dialog;
};

const auditPartySearch = async (page: Page): Promise<void> => {
  const dialog = await openSearch(page);
  await dialog.getByRole("tab", { name: "Party" }).click();
  await assertInventory(dialog, PARTY_SEARCH);
  await changeText(dialog.getByRole("textbox", { name: "Search term" }), "Erica");
  await dialog.getByRole("button", { name: "Search" }).click();
  await assertInventory(dialog, [...PARTY_SEARCH, control("button", "Erica Alexander")]);
  await dialog.getByRole("button", { name: "Erica Alexander" }).click();
  await expect(page).toHaveURL(/\/parties\/PTY-80937$/);
};

const auditRecentSearch = async (page: Page): Promise<void> => {
  const dialog = await openSearch(page);
  await dialog.getByRole("tab", { name: "Recent" }).click();
  await assertInventory(dialog, RECENT_SEARCH);
  await dialog.getByRole("button", { name: "Notification - NTN-159898", exact: true }).click();
  await expect(page).toHaveURL(/\/cases\/NTN-159898\/general$/);
  await exerciseDialogDismissals(page);
};

const exerciseDialogDismissals = async (page: Page): Promise<void> => {
  let dialog = await openSearch(page);
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toHaveCount(0);
  dialog = await openSearch(page);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
};

const PLAN_ACTIONS = [
  "Add Policy", "Correspondence", "Add Activity",
  "Add eForm", "Add Participant", "Copy Case",
] as const;

const PLAN_TABS = [
  "Details", "Classes", "Members", "Admin", "Tasks",
  "Contacts", "Documents", "Notes", "Alerts",
] as const;

const PAGE_ONE_MEMBERS = [
  "Laura Adams", "Kimberly Aguirre", "Brittany Alexander", "Jacob Alexander",
  "Kyle Ali", "Patricia Allen", "Karen Allison", "Victor Alvarado",
  "Danny Alvarez", "Allison Andersen",
] as const;

const MASTER_PLAN_CONTROLS = [
  control("button", "Close"),
  control("button", "Fifth Third Bank National Association"),
  ...PLAN_ACTIONS.map((name) => control("button", name)),
  ...PLAN_TABS.map((name) => control("tab", name)),
  control("textbox", "Last Name"),
  control("textbox", "First Name"),
  control("textbox", "Member ID"),
  control("button", "Reset"),
  ...PAGE_ONE_MEMBERS.map((name) => control("button", name)),
  control("button", "Next page"),
  control("combobox", "Members per page"),
] as const;

export class MasterPlanAudit {
  constructor(private readonly page: Page) {}

  async run(): Promise<void> {
    await openMasterPlan(this.page);
    await assertInventory(this.page.locator(".fx-record"), MASTER_PLAN_CONTROLS);
    await exercisePlanHeader(this.page);
    await exercisePlanTabs(this.page);
    await exerciseMemberList(this.page);
  }
}

const openMasterPlan = async (page: Page): Promise<void> => {
  await page.goto(MASTER_PLAN);
  await expect(page.getByRole("heading", { name: "Master Plan 18489" })).toBeVisible();
};

const exercisePlanHeader = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "Fifth Third Bank National Association" }).click();
  await expect(page.getByRole("status")).toHaveText("Plan sponsor selected.");
  for (const action of PLAN_ACTIONS) await assertNoticeAction(page, action);
  await openMasterPlan(page);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

const assertNoticeAction = async (page: Page, action: string): Promise<void> => {
  await openMasterPlan(page);
  await page.getByRole("button", { name: action }).click();
  await expect(page.getByRole("status")).toHaveText(`${action} started.`);
};

const exercisePlanTabs = async (page: Page): Promise<void> => {
  for (const tab of PLAN_TABS) {
    await openMasterPlan(page);
    const control = page.getByRole("tab", { name: tab });
    await control.click();
    await expect(control).toHaveAttribute("aria-selected", "true");
  }
};

const exerciseMemberList = async (page: Page): Promise<void> => {
  await openMasterPlan(page);
  await exerciseMemberFilters(page);
  await exerciseVisibleMembers(page);
  await exercisePagination(page);
};

const exerciseMemberFilters = async (page: Page): Promise<void> => {
  await changeText(page.getByRole("textbox", { name: "Last Name" }), "Adams");
  await expect(page.getByRole("button", { name: "Laura Adams" })).toBeVisible();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("textbox", { name: "Last Name" })).toHaveValue("");
  await changeText(page.getByRole("textbox", { name: "First Name" }), "Laura");
  await changeText(page.getByRole("textbox", { name: "Member ID" }), "MemID323452");
};

const exerciseVisibleMembers = async (page: Page): Promise<void> => {
  for (const name of PAGE_ONE_MEMBERS) {
    await openMasterPlan(page);
    await page.getByRole("button", { name }).click();
    await expect(page.getByRole("region", { name: "Member details" })).toContainText(name);
  }
};

const exercisePagination = async (page: Page): Promise<void> => {
  await openMasterPlan(page);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await changeSelect(page.getByRole("combobox", { name: "Members per page" }), "20 / page");
  await expect(page.getByText("Page 1 of 1")).toBeVisible();
};

const PARTY_ACTIONS = [
  "Create Notification", "Edit Party", "Merge Party", "Add Activity",
  "Add Case", "Inquiry", "Surround UI",
] as const;

const PARTY_TABS = [
  "Profile", "Policies for Client", "Party History", "Leave Information",
  "Payment Preferences", "Payment History", "Cases", "Tasks",
] as const;

const PARTY_SHELL = [
  ...PARTY_ACTIONS.map((name) => control("button", name)),
  ...PARTY_TABS.map((name) => control("tab", name)),
  control("button", "More tabs"),
] as const;

export class PartyAudit {
  constructor(private readonly page: Page) {}

  async run(): Promise<void> {
    await auditProfile(this.page);
    await auditEditParty(this.page);
    await auditContactRoutes(this.page);
  }
}

const openParty = async (page: Page, suffix = ""): Promise<void> => {
  await page.goto(`${ERICA_PARTY}${suffix}`);
  await expect(page.getByRole("heading", { name: "Erica Alexander" })).toBeVisible();
};

const auditProfile = async (page: Page): Promise<void> => {
  await openParty(page);
  await assertInventory(page.locator(".fx-record"), [
    ...PARTY_SHELL, control("link", "Contact Details"),
  ]);
  await exercisePartyActions(page);
  await exercisePartyTabs(page);
  await exercisePartyLinks(page);
};

const exercisePartyActions = async (page: Page): Promise<void> => {
  for (const action of PARTY_ACTIONS.slice(2)) await assertPartyNotice(page, action);
  await openParty(page);
  await page.getByRole("button", { name: "More tabs" }).click();
  await expect(page.getByRole("status")).toHaveText("No additional tabs available.");
  await openParty(page);
  await page.getByRole("button", { name: "Create Notification" }).click();
  await expect(page).toHaveURL(/\/notifications\/NTN-\d+\/intake\/notification-details$/);
};

const assertPartyNotice = async (page: Page, action: string): Promise<void> => {
  await openParty(page);
  await page.getByRole("button", { name: action }).click();
  await expect(page.getByRole("status")).toHaveText(`${action} started.`);
};

const exercisePartyTabs = async (page: Page): Promise<void> => {
  for (const tab of PARTY_TABS) {
    await openParty(page);
    const item = page.getByRole("tab", { name: tab });
    await item.click();
    await expect(item).toHaveAttribute("aria-selected", "true");
  }
};

const exercisePartyLinks = async (page: Page): Promise<void> => {
  await openParty(page);
  await page.getByRole("link", { name: "Contact Details" }).click();
  await expect(page).toHaveURL(/\/contact-details$/);
};

const auditEditParty = async (page: Page): Promise<void> => {
  await auditEditPartyCancel(page);
  await openParty(page);
  await page.getByRole("button", { name: "Edit Party" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit Party" });
  await assertInventory(dialog, EDIT_PARTY);
  await changeText(dialog.getByRole("textbox", { name: "Phone" }), "555-0199");
  await changeText(dialog.getByRole("textbox", { name: "Email" }), "erica@example.com");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0);
};

const auditEditPartyCancel = async (page: Page): Promise<void> => {
  await openParty(page);
  await page.getByRole("button", { name: "Edit Party" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit Party" });
  await assertInventory(dialog, EDIT_PARTY);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
};

const EDIT_PARTY = [
  control("textbox", "Phone"),
  control("textbox", "Email"),
  control("button", "Save"),
  control("button", "Cancel"),
] as const;

const auditContactRoutes = async (page: Page): Promise<void> => {
  await openParty(page, "/contact-details");
  await assertInventory(page.getByRole("tabpanel"), [
    control("link", "Back to Profile"),
    control("link", "Communication Preferences"),
  ]);
  await page.getByRole("link", { name: "Communication Preferences" }).click();
  await expect(page).toHaveURL(/\/communication-preferences$/);
  await assertInventory(page.getByRole("tabpanel"), [
    control("link", "Back to Contact Details"),
  ]);
  await page.getByRole("link", { name: "Back to Contact Details" }).click();
  await expect(page).toHaveURL(/\/contact-details$/);
};

export class IntakeAudit {
  static readonly lifecycleStages = [
    "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12",
  ] as const;

  constructor(
    private readonly page: Page,
    private readonly request: APIRequestContext,
  ) {}

  async runStages(): Promise<void> {
    await auditWizardChrome(this.page, this.request);
    await auditIntakeStages(this.page, this.request);
  }

  async runTransientStates(): Promise<void> {
    await auditNotificationCalendar(this.page, this.request);
    await auditAbsenceDialog(this.page, this.request);
    await auditIntakeProviderDialog(this.page, this.request);
  }

  async runEveryCalendarDay(): Promise<void> {
    await auditEveryNotificationDay(this.page, this.request);
    await auditEveryAbsenceDay(this.page, this.request);
  }
}

const BOTH_FLAGS = {
  requestLeave: true,
  requestAccommodation: false,
  requestGdc: true,
} as const;

const INTAKE_FIELDS = {
  "notification-details:source": "Phone",
  "notification-details:notificationDate": "02/13/2026",
  "notification-details:notifiedBy": "Requester",
  "notification-options:typeOfRequest": "Accident or treatment required for an injury",
  "member-occupation:jobTitle": "Test Engineer",
  "member-occupation:employmentStatus": "Active",
  "member-occupation:dateOfHire": "06/01/2015",
  "member-occupation:hoursPerWeek": "40",
  "reason-for-absence:absenceRelates": "Employee",
  "reason-for-absence:absenceReason": "Serious Health Condition",
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
} as const;

const STAGE_ORDER = [
  "notification-details", "member-occupation", "notification-options",
  "reason-for-absence", "dates-of-absence", "work-absence-details",
  "additional-absence-details", "incident-details", "policy-details",
  "earnings-details", "medical-details",
] as const;

type StageSlug = (typeof STAGE_ORDER)[number];

const BOTTOM_FIRST = [
  control("button", "Close"),
  control("button", "Reset"),
  control("button", "Next"),
] as const;

const BOTTOM_MIDDLE = [
  control("button", "Close"),
  control("button", "Reset"),
  control("button", "Previous"),
  control("button", "Next"),
] as const;

// The FINEOS wizard repeats Previous/Next at the top of the form column
// (above the process content); Close/Reset appear only in the bottom bar.
const TOP_NAV = [
  control("button", "Previous"),
  control("button", "Next"),
] as const;

const BOTTOM_LAST = [
  control("button", "Close"),
  control("button", "Reset"),
  control("button", "Previous"),
  control("button", "Finish"),
] as const;

const TYPE_OF_REQUEST = [
  "Accident or treatment required for an injury",
  "Sickness, treatment required for a medical condition or any other medical procedure",
  "Pregnancy, birth or related medical treatment",
  "Bonding with a new child (adoption/ foster care/ newborn)",
  "Caring for a family member",
  "Out of work for another reason",
  "Accommodation required to remain at work",
] as const;

const STAGE_CONTROLS: Readonly<Record<StageSlug, readonly ControlSpec[]>> = {
  "notification-details": [
    control("combobox", "Notification source"),
    control("textbox", "Notification date"),
    control("button", "Open calendar"),
    control("combobox", "Notified by"),
    ...BOTTOM_FIRST,
  ],
  "member-occupation": [
    control("combobox", "Employer"),
    control("button", "+ Create new Member"),
    control("textbox", "Job title"),
    control("combobox", "Employment status"),
    control("textbox", "Date of hire"),
    control("textbox", "Date job ended"),
    control("button", "Open calendar", 2),
    control("combobox", "Occupation category"),
    control("textbox", "Hours worked per week"),
    control("combobox", "Job strenuous"),
    control("radio", "Unverified"),
    control("radio", "Verified"),
    ...BOTTOM_MIDDLE,
  ],
  "notification-options": [
    ...TYPE_OF_REQUEST.map((name) => control("radio", name)),
    control("switch", "Request a Leave"),
    control("switch", "Request an Accommodation"),
    control("switch", "Group Disability Claim"),
    ...BOTTOM_MIDDLE,
  ],
  "reason-for-absence": [
    control("combobox", "Absence relates to"),
    control("combobox", "Absence reason"),
    control("combobox", "Qualifier 1"),
    control("combobox", "Qualifier 2"),
    ...BOTTOM_MIDDLE,
  ],
  "dates-of-absence": [
    control("switch", "One or more fixed time off periods"),
    control("switch", "Episodic / leave as needed"),
    control("switch", "Reduced work schedule"),
    control("button", "Add Absence Period"),
    control("textbox", "Expected partial return to work date"),
    control("textbox", "Expected return to work date"),
    control("button", "Open calendar", 2),
    ...BOTTOM_MIDDLE,
  ],
  "work-absence-details": [
    control("combobox", "Have you ever had a break in employment?"),
    control("combobox", "USA Work State"),
    control("textbox", "Hours Worked per Year"),
    control("checkbox", "50 Employees Within 75 Miles"),
    ...BOTTOM_MIDDLE,
  ],
  "additional-absence-details": [
    control("combobox", "If you are eligible for FMLA and we require paperwork, would you like us to fax it to the doctor?"),
    control("textbox", "If yes, you will be prompted to document who the paperwork should be faxed to and the fax number."),
    control("combobox", "If we receive incomplete paperwork from your doctor, would you like us to fax it back to them?"),
    control("combobox", "Describe your medical condition/ diagnosis:"),
    control("textbox", "Additional detail (if provided):"),
    control("combobox", "Will the patient be admitted for an overnight stay in a medical facility?"),
    ...BOTTOM_MIDDLE,
  ],
  "incident-details": [
    control("radio", "Claimant"),
    control("radio", "Family Member"),
    control("textbox", "Incurred date"),
    control("combobox", "Accident / Sickness"),
    control("textbox", "Accident date"),
    control("checkbox", "Work related"),
    control("textbox", "Number of dependents"),
    control("textbox", "Date first unable to work"),
    control("textbox", "Expected return to work date"),
    control("checkbox", "Spouse working"),
    control("textbox", "Last Day Worked"),
    control("textbox", "Work history"),
    control("textbox", "Salary continuance number of days"),
    control("textbox", "Hours worked"),
    control("textbox", "Are the days in between your last day worked and absence start date non-scheduled work days or unrelated to your leave reason/condition?"),
    control("button", "Open calendar", 5),
    ...BOTTOM_MIDDLE,
  ],
  "policy-details": [
    control("button", "Add"),
    ...BOTTOM_MIDDLE,
  ],
  "earnings-details": [
    control("textbox", "Effective from"),
    control("textbox", "Effective to"),
    control("button", "Open calendar", 2),
    control("combobox", "Earnings basis"),
    control("textbox", "Earnings amount"),
    control("button", "Quick Add"),
    control("button", "Add"),
    ...BOTTOM_MIDDLE,
  ],
  "medical-details": [
    control("button", "Add Medical Provider"),
    control("textbox", "Date of First Treatment"),
    control("textbox", "Medical authorization received"),
    control("textbox", "Last medical info received"),
    control("textbox", "Last medical info requested"),
    control("combobox", "Condition category"),
    control("checkbox", "Pregnant"),
    control("checkbox", "Contest pre-existing condition"),
    control("textbox", "Most Recent Treatment/Office Visit Date"),
    control("textbox", "Next Treatment/Office Visit Date"),
    control("textbox", "Condition"),
    control("textbox", "Treatment plan"),
    control("combobox", "Life expectancy"),
    control("textbox", "Surgery date"),
    control("checkbox", "Outpatient"),
    control("combobox", "Type of surgery"),
    control("textbox", "Facility"),
    control("textbox", "Name of Surgery or Procedure"),
    control("button", "Open calendar", 7),
    control("combobox", "Diagnosis code or description"),
    control("combobox", "Level indicator"),
    control("button", "Quick Add"),
    control("button", "Add"),
    control("button", "Add Hospitalization"),
    ...BOTTOM_LAST,
  ],
};

const SELECT_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  "Notification source": ["Unknown", "Phone", "Paper", "Fax", "Email", "Mail/Post", "Chat", "Split Experience Portal", "Split Experience Phone", "Data Failure"],
  "Notified by": ["Requester", "Employee", "Employer", "Other"],
  "Employer": ["Fifth Third Bank National Association (Member ID: 23456876)"],
  "Employment status": ["Active", "Inactive", "Terminated"],
  "Absence relates to": ["Employee", "Family Member", "Other"],
  "Absence reason": ["Please Select", "Serious Health Condition", "Pregnancy/Maternity", "Bonding with a new child", "Military Exigency"],
  "Qualifier 1": ["Please Select", "Not Work Related", "Work Related"],
  "Qualifier 2": ["Please Select", "Sickness", "Accident / Injury"],
  "Have you ever had a break in employment?": ["Please Select", "No", "Yes"],
  "USA Work State": ["DE", "ME", "NY", "CA"],
  "If you are eligible for FMLA and we require paperwork, would you like us to fax it to the doctor?": ["Please Select", "No", "Yes"],
  "If we receive incomplete paperwork from your doctor, would you like us to fax it back to them?": ["Please Select", "No", "Yes"],
  "Describe your medical condition/ diagnosis:": ["Not Applicable", "Unknown", "Auditory", "Autoimmune disorder", "Back", "Cancer", "Cardiovascular", "Coronavirus", "Diabetes", "Digestive", "Pregnancy"],
  "Will the patient be admitted for an overnight stay in a medical facility?": ["Unknown", "No", "Yes"],
  "Accident / Sickness": ["Sickness", "Accident"],
  "Earnings basis": ["Weekly", "Bi-Weekly", "Monthly", "Annual"],
  "Condition category": ["Unknown", "Chronic", "Acute", "Pregnancy"],
  "Life expectancy": ["Unknown", "Normal", "Reduced"],
  "Type of surgery": ["Unknown", "Inpatient", "Outpatient"],
  "Diagnosis code or description": ["Please Select", "O80 - Encounter for full-term uncomplicated delivery", "M25.561 - Pain in right knee", "S83.511 - Sprain of ACL of right knee"],
  "Level indicator": ["Primary", "Secondary", "Contributing"],
};

const prepareStage = async (
  page: Page,
  request: APIRequestContext,
  slug: StageSlug,
): Promise<string> => {
  const draftId = await apiCreateDraft(request);
  await apiSaveSection(request, draftId, "notificationOptions", BOTH_FLAGS);
  await seedIntakeStorage(page, draftId);
  await page.goto(`/notifications/${draftId}/intake/${slug}`);
  await expect(page.locator(".fx-wizard-form")).toBeVisible();
  return draftId;
};

const seedIntakeStorage = async (page: Page, draftId: string): Promise<void> => {
  await page.goto("/dashboard");
  await page.evaluate(({ id, fields, flags }) => {
    sessionStorage.setItem(`fineos:intake:${id}`, JSON.stringify({
      fields, flags, periods: [], provider: null, saved: [],
    }));
  }, { id: draftId, fields: INTAKE_FIELDS, flags: BOTH_FLAGS });
};

const auditIntakeStages = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  for (const slug of STAGE_ORDER) await auditIntakeStage(page, request, slug);
};

const auditIntakeStage = async (
  page: Page,
  request: APIRequestContext,
  slug: StageSlug,
): Promise<void> => {
  await prepareStage(page, request, slug);
  const form = page.locator(".fx-wizard-form");
  await assertInventory(form, STAGE_CONTROLS[slug]);
  await auditStageSelectOptions(form);
  await exerciseEditableControls(form);
  await exerciseStageButtons(page, request, slug);
};

const auditStageSelectOptions = async (form: Locator): Promise<void> => {
  for (const [label, options] of Object.entries(SELECT_OPTIONS)) {
    const select = form.getByRole("combobox", { name: label, exact: true });
    if (await select.count()) await assertOptions(select, options);
  }
};

const exerciseEditableControls = async (scope: Locator): Promise<void> => {
  await exerciseTextboxes(scope);
  await exerciseSelects(scope);
  await exerciseChecks(scope, "checkbox");
  await exerciseChecks(scope, "switch");
  await exerciseRadios(scope);
  await exerciseDateButtons(scope);
};

const exerciseTextboxes = async (scope: Locator): Promise<void> => {
  const fields = scope.getByRole("textbox");
  for (let index = 0; index < await fields.count(); index += 1) {
    await changeText(fields.nth(index), `audit-${index}`);
  }
};

const exerciseSelects = async (scope: Locator): Promise<void> => {
  const fields = scope.getByRole("combobox");
  for (let index = 0; index < await fields.count(); index += 1) {
    const field = fields.nth(index);
    const last = field.locator("option").last();
    await changeSelect(field, await last.innerText());
  }
};

const exerciseChecks = async (
  scope: Locator,
  role: "checkbox" | "switch",
): Promise<void> => {
  const fields = scope.getByRole(role);
  for (let index = 0; index < await fields.count(); index += 1) {
    await toggle(fields.nth(index));
  }
};

const exerciseRadios = async (scope: Locator): Promise<void> => {
  const fields = scope.getByRole("radio");
  for (let index = 0; index < await fields.count(); index += 1) {
    const field = fields.nth(index);
    await field.click();
    await expect(field).toBeChecked();
  }
};

const exerciseDateButtons = async (scope: Locator): Promise<void> => {
  const buttons = scope.getByRole("button", { name: "Open calendar" });
  for (let index = 0; index < await buttons.count(); index += 1) {
    const button = buttons.nth(index);
    await button.click();
    await expect(scope.getByRole("dialog").last()).toBeVisible();
    await button.click();
  }
};

const exerciseStageButtons = async (
  page: Page,
  request: APIRequestContext,
  slug: StageSlug,
): Promise<void> => {
  await exerciseSpecialStageButtons(page, slug);
  await exerciseStageReset(page, request, slug);
  await exerciseStagePrevious(page, request, slug);
  await exerciseStageAdvance(page, request, slug);
  await exerciseStageClose(page, request, slug);
};

const exerciseSpecialStageButtons = async (
  page: Page,
  slug: StageSlug,
): Promise<void> => {
  if (slug === "member-occupation") await clickForStatus(page, "+ Create new Member", "Create new Member opened.");
  if (slug === "policy-details") await clickForStatus(page, "Add", "Add policy opened.");
  if (slug === "earnings-details") await exerciseEarningsActions(page);
  if (slug === "medical-details") await exerciseMedicalActions(page);
};

const clickForStatus = async (
  page: Page,
  name: string,
  status: string,
): Promise<void> => {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(status);
};

const exerciseEarningsActions = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "Quick Add" }).click();
  await expect(page.getByRole("textbox", { name: "Earnings amount" })).toHaveValue("1997.00");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await assertPersistedField(page, "payment", "earningsAdded", "yes");
};

const exerciseMedicalActions = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "Quick Add" }).click();
  await expect(page.getByRole("combobox", { name: "Diagnosis code or description" }))
    .toHaveValue("O80 - Encounter for full-term uncomplicated delivery");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Add Hospitalization" }).click();
  await assertPersistedFields(page, "medicalDetails", {
    diagnosisAdded: "yes", hospitalizationAdded: "yes",
  });
};

const assertPersistedField = async (
  page: Page,
  section: string,
  field: string,
  value: string,
): Promise<void> => {
  const saved = page.waitForRequest((request) => request.url().includes(`/sections/${section}`));
  await page.getByRole("button", { name: /^(Next|Finish)$/ }).last().click();
  expect((await saved).postDataJSON()).toMatchObject({ [field]: value });
};

const assertPersistedFields = async (
  page: Page,
  section: string,
  fields: Readonly<Record<string, string>>,
): Promise<void> => {
  const saved = page.waitForRequest((request) => request.url().includes(`/sections/${section}`));
  await page.getByRole("button", { name: /^(Next|Finish)$/ }).last().click();
  expect((await saved).postDataJSON()).toMatchObject(fields);
};

const exerciseStageReset = async (
  page: Page,
  request: APIRequestContext,
  slug: StageSlug,
): Promise<void> => {
  await prepareStage(page, request, slug);
  const saved = waitForStageSave(page, slug);
  await page.locator(".fx-wizard-form").getByRole("button", { name: "Reset" }).click();
  const response = await (await saved).response();
  expect(response?.ok()).toBe(true);
};

const waitForStageSave = (page: Page, slug: StageSlug) =>
  page.waitForRequest((request) => request.url().includes("/sections/")
    && request.method() === "PUT" && page.url().includes(slug));

const exerciseStagePrevious = async (
  page: Page,
  request: APIRequestContext,
  slug: StageSlug,
): Promise<void> => {
  const index = STAGE_ORDER.indexOf(slug);
  if (index === 0) return;
  await prepareStage(page, request, slug);
  await page.locator(".fx-wizard-form").getByRole("button", { name: "Previous" }).click();
  await expect(page).toHaveURL(new RegExp(`/intake/${STAGE_ORDER[index - 1]}$`));
};

const exerciseStageAdvance = async (
  page: Page,
  request: APIRequestContext,
  slug: StageSlug,
): Promise<void> => {
  const index = STAGE_ORDER.indexOf(slug);
  await prepareStage(page, request, slug);
  await page.locator(".fx-wizard-form").getByRole("button", { name: /^(Next|Finish)$/ }).click();
  const next = STAGE_ORDER[index + 1];
  await expect(page).toHaveURL(next ? new RegExp(`/intake/${next}$`) : /\/confirmation$/);
};

const exerciseStageClose = async (
  page: Page,
  request: APIRequestContext,
  slug: StageSlug,
): Promise<void> => {
  await prepareStage(page, request, slug);
  await page.locator(".fx-wizard-form").getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

const PROCESS_STEPS = [
  "Notification Details", "Member & Occupation", "Notification Options",
  "Reason for Absence", "Dates of Absence", "Work Absence Details",
  "Additional Absence Details", "Incident Details", "Policy Details",
  "Earnings Details", "Medical Details",
] as const;

const auditWizardChrome = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  await prepareStage(page, request, "notification-options");
  await assertInventory(page.locator(".fx-wizard-topnav"), TOP_NAV);
  await assertInventory(page.getByRole("navigation", { name: "Process Steps" }), [
    control("button", "Toggle process steps"),
    ...PROCESS_STEPS.map((name) => control("button", name)),
  ]);
  await assertInventory(page.getByRole("complementary", { name: "Notes" }), [
    control("textbox", "Notes"),
  ]);
  await exerciseWizardChrome(page, request);
};

const exerciseWizardChrome = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  await changeText(page.getByRole("textbox", { name: "Notes" }), "audit note");
  const toggleButton = page.getByRole("button", { name: "Toggle process steps" });
  await toggleButton.click();
  await expect(toggleButton).toHaveAttribute("aria-expanded", "false");
  await exerciseProcessSteps(page, request);
  await exerciseWizardTopbar(page, request);
};

const wizardTopbar = (page: Page): Locator => page.locator(".fx-wizard-topnav");

const exerciseWizardTopbar = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  await exerciseTopbarPrevious(page, request);
  await exerciseTopbarNext(page, request);
};

const exerciseTopbarPrevious = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  await prepareStage(page, request, "reason-for-absence");
  await wizardTopbar(page).getByRole("button", { name: "Previous" }).click();
  await expect(page).toHaveURL(/\/intake\/notification-options$/);
};

const exerciseTopbarNext = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  await prepareStage(page, request, "reason-for-absence");
  await wizardTopbar(page).getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/intake\/dates-of-absence$/);
};

const exerciseProcessSteps = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  for (let index = 0; index < PROCESS_STEPS.length; index += 1) {
    await prepareStage(page, request, "reason-for-absence");
    await page.getByRole("navigation", { name: "Process Steps" })
      .getByRole("button", { name: PROCESS_STEPS[index], exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/intake/${STAGE_ORDER[index]}$`));
  }
};

const FEBRUARY_DAYS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14",
  "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28",
] as const;

const CALENDAR_CONTROLS = [
  control("button", "Previous month"),
  control("button", "Next month"),
  ...FEBRUARY_DAYS.map((day) => control("button", day)),
] as const;

const auditNotificationCalendar = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  await prepareStage(page, request, "notification-details");
  await page.getByRole("button", { name: "Open calendar" }).click();
  const calendar = page.getByRole("dialog", { name: "Notification date calendar" });
  await assertInventory(calendar, CALENDAR_CONTROLS);
  await calendar.getByRole("button", { name: "Previous month" }).click();
  await expect(calendar).toContainText("January 2026");
  await calendar.getByRole("button", { name: "Next month" }).click();
  await calendar.getByRole("button", { name: "18", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Notification date" })).toHaveValue("02/18/2026");
};

const formatFebruaryDate = (day: string): string =>
  `02/${day.padStart(2, "0")}/2026`;

const auditEveryNotificationDay = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  await prepareStage(page, request, "notification-details");
  await assertCalendarInventory(page.getByRole("button", { name: "Open calendar" }),
    page.getByRole("dialog", { name: "Notification date calendar" }));
  for (const day of FEBRUARY_DAYS) await exerciseNotificationDay(page, day);
};

const exerciseNotificationDay = async (page: Page, day: string): Promise<void> => {
  await page.getByRole("button", { name: "Open calendar" }).click();
  const calendar = page.getByRole("dialog", { name: "Notification date calendar" });
  await calendar.getByRole("button", { name: day, exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Notification date" }))
    .toHaveValue(formatFebruaryDate(day));
};

const assertCalendarInventory = async (
  opener: Locator,
  calendar: Locator,
): Promise<void> => {
  await opener.click();
  await assertInventory(calendar, CALENDAR_CONTROLS);
  await opener.click();
};

const ABSENCE_DIALOG = [
  control("combobox", "Absence status"),
  control("textbox", "Last day worked"),
  control("textbox", "Absence start date"),
  control("checkbox", "All day", 2),
  control("textbox", "Absence end date"),
  control("button", "Open calendar", 3),
  control("button", "OK"),
] as const;

const auditAbsenceDialog = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  await prepareStage(page, request, "dates-of-absence");
  await page.getByRole("button", { name: "Add Absence Period" }).click();
  const dialog = page.getByRole("dialog", { name: "Add Absence Period" });
  await assertInventory(dialog, ABSENCE_DIALOG);
  await assertOptions(dialog.getByRole("combobox", { name: "Absence status" }),
    ["Please Select", "Known", "Estimated"]);
  await exerciseAbsenceCalendars(dialog);
  await exerciseAbsenceDialog(dialog);
};

const ABSENCE_CALENDARS = [
  ["Last day worked", "8", "02/08/2026"],
  ["Absence start date", "9", "02/09/2026"],
  ["Absence end date", "16", "02/16/2026"],
] as const;

const auditEveryAbsenceDay = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  await prepareStage(page, request, "dates-of-absence");
  await page.getByRole("button", { name: "Add Absence Period" }).click();
  const dialog = page.getByRole("dialog", { name: "Add Absence Period" });
  await assertInventory(dialog, ABSENCE_DIALOG);
  for (let index = 0; index < ABSENCE_CALENDARS.length; index += 1) {
    await auditEveryAbsenceFieldDay(dialog, index, ABSENCE_CALENDARS[index]![0]);
  }
};

const auditEveryAbsenceFieldDay = async (
  dialog: Locator,
  index: number,
  label: string,
): Promise<void> => {
  const opener = dialog.getByRole("button", { name: "Open calendar" }).nth(index);
  const calendar = dialog.getByRole("dialog", { name: `${label} calendar` });
  await assertCalendarInventory(opener, calendar);
  for (const day of FEBRUARY_DAYS) {
    await exerciseAbsenceDay(dialog, index, label, day);
  }
};

const exerciseAbsenceDay = async (
  dialog: Locator,
  index: number,
  label: string,
  day: string,
): Promise<void> => {
  await dialog.getByRole("button", { name: "Open calendar" }).nth(index).click();
  const calendar = dialog.getByRole("dialog", { name: `${label} calendar` });
  await calendar.getByRole("button", { name: day, exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: label })).toHaveValue(formatFebruaryDate(day));
};

const exerciseAbsenceCalendars = async (dialog: Locator): Promise<void> => {
  for (let index = 0; index < ABSENCE_CALENDARS.length; index += 1) {
    await exerciseAbsenceCalendar(dialog, index, ABSENCE_CALENDARS[index]!);
  }
};

const exerciseAbsenceCalendar = async (
  dialog: Locator,
  index: number,
  [label, day, date]: (typeof ABSENCE_CALENDARS)[number],
): Promise<void> => {
  await dialog.getByRole("button", { name: "Open calendar" }).nth(index).click();
  const calendar = dialog.getByRole("dialog", { name: `${label} calendar` });
  await assertInventory(calendar, CALENDAR_CONTROLS);
  await calendar.getByRole("button", { name: "Previous month" }).click();
  await expect(calendar).toContainText("January 2026");
  await calendar.getByRole("button", { name: "Next month" }).click();
  await calendar.getByRole("button", { name: day, exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: label })).toHaveValue(date);
};

const exerciseAbsenceDialog = async (dialog: Locator): Promise<void> => {
  await changeSelect(dialog.getByRole("combobox", { name: "Absence status" }), "Known");
  await changeText(dialog.getByRole("textbox", { name: "Last day worked" }), "02/08/2026");
  await changeText(dialog.getByRole("textbox", { name: "Absence start date" }), "02/09/2026");
  await changeText(dialog.getByRole("textbox", { name: "Absence end date" }), "02/16/2026");
  await toggle(dialog.getByRole("checkbox", { name: "All day" }).first());
  await toggle(dialog.getByRole("checkbox", { name: "All day" }).last());
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toHaveCount(0);
};

const INTAKE_PROVIDER_SEARCH = [
  control("radio", "Person"),
  control("radio", "Organization"),
  control("radio", "Both"),
  control("textbox", "First Name"),
  control("textbox", "Last Name"),
  control("button", "Search"),
  control("button", "Add Person"),
] as const;

const auditIntakeProviderDialog = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  await prepareStage(page, request, "medical-details");
  await page.getByRole("button", { name: "Add Medical Provider" }).click();
  const dialog = page.getByRole("dialog", { name: /Medical Provider/ });
  await assertInventory(dialog, INTAKE_PROVIDER_SEARCH);
  await exerciseEditableControls(dialog);
  await auditIntakeProviderResults(dialog);
  await auditIntakeAddPerson(page, request);
};

const auditIntakeProviderResults = async (dialog: Locator): Promise<void> => {
  await dialog.getByRole("button", { name: "Search" }).click();
  await assertInventory(dialog, [
    ...INTAKE_PROVIDER_SEARCH,
    control("button", "Travis Larson"),
  ]);
  await dialog.getByRole("button", { name: "Travis Larson" }).click();
  await expect(dialog).toHaveCount(0);
};

const auditIntakeAddPerson = async (
  page: Page,
  request: APIRequestContext,
): Promise<void> => {
  await prepareStage(page, request, "medical-details");
  await page.getByRole("button", { name: "Add Medical Provider" }).click();
  const dialog = page.getByRole("dialog", { name: /Medical Provider/ });
  await dialog.getByRole("button", { name: "Add Person" }).click();
  await assertInventory(dialog, [
    control("textbox", "First Name"),
    control("textbox", "Last Name"),
    control("button", "OK"),
  ]);
  await changeText(dialog.getByRole("textbox", { name: "First Name" }), "Jane");
  await changeText(dialog.getByRole("textbox", { name: "Last Name" }), "Doe");
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toHaveCount(0);
};

export class ConfirmationAudit {
  static readonly lifecycleStages = ["s13"] as const;

  constructor(
    private readonly page: Page,
    private readonly request: APIRequestContext,
  ) {}

  async run(): Promise<void> {
    const draftId = await prepareConfirmation(this.page, this.request);
    await assertInventory(this.page.locator(".fx-confirmation"), confirmationInventory(draftId));
    await exerciseConfirmationLinks(this.page, draftId);
  }
}

const prepareConfirmation = async (
  page: Page,
  request: APIRequestContext,
): Promise<string> => {
  const draftId = await apiCreateDraft(request);
  await apiSaveSection(request, draftId, "notificationOptions", BOTH_FLAGS);
  await openConfirmation(page, draftId);
  return draftId;
};

const openConfirmation = async (page: Page, draftId: string): Promise<void> => {
  await page.goto(`/notifications/${draftId}/confirmation`);
  await expect(page.getByRole("heading", { name: "Notification Submitted" })).toBeVisible();
};

const confirmationInventory = (draftId: string): readonly ControlSpec[] => [
  control("link", `Open ${draftId}`),
  control("link", `Open ${draftId}-ABS-01`),
  control("link", `Open ${draftId}-GDC-02`),
];

const exerciseConfirmationLinks = async (
  page: Page,
  draftId: string,
): Promise<void> => {
  await exerciseConfirmationLink(page, draftId, draftId, "general");
  await exerciseConfirmationLink(page, draftId, `${draftId}-ABS-01`, "documents");
  await exerciseConfirmationLink(page, draftId, `${draftId}-GDC-02`, "documents");
};

const exerciseConfirmationLink = async (
  page: Page,
  draftId: string,
  caseId: string,
  tab: string,
): Promise<void> => {
  await openConfirmation(page, draftId);
  await page.getByRole("link", { name: `Open ${caseId}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/cases/${caseId}/${tab}$`));
};

export const assertIntakeLifecycleCoverage = (): void => {
  const covered = [
    ...AccessAudit.lifecycleStages,
    ...IntakeAudit.lifecycleStages,
    ...ConfirmationAudit.lifecycleStages,
  ];
  expect(INTAKE_LIFECYCLE).toHaveLength(14);
  expect(covered).toEqual(INTAKE_LIFECYCLE.map(({ source }) => source));
  expect(INTAKE_LIFECYCLE.slice(2, 13).map(({ slug }) => slug)).toEqual(STAGE_ORDER);
};

export class CaseAudit {
  constructor(private readonly page: Page) {}

  async runNotificationAndAbsence(): Promise<void> {
    await auditNotificationCase(this.page);
    await auditAbsenceCase(this.page);
  }

  async runGdc(): Promise<void> {
    await auditGdcCase(this.page);
  }

  async runEveryDiagnosisResult(): Promise<void> {
    await auditEveryDiagnosisResult(this.page);
  }
}

const ERICA_CASE = "NTN-165775";
const DAVID_CASE = "NTN-159898";
const ABSENCE_CASE = `${DAVID_CASE}-ABS-01`;
const GDC_CASE = `${DAVID_CASE}-GDC-02`;

const CASE_COMPONENTS = [
  control("button", "Notification"),
  control("button", "Absence Case"),
  control("button", "Group Disability Claim"),
  control("button", "STD Benefit"),
] as const;

// Default agent-first mode: no Run Case Execution shortcut. The external agent
// drives the manual case workflow itself.
const CASE_ACTIONS = [
  control("button", "Add Sub Case"),
  control("button", "Correspondence"),
  control("button", "Add Activity"),
  control("button", "Add eForm"),
  control("button", "Add Participant"),
  control("button", "Surround UI"),
] as const;

const ABSENCE_ACTIONS = [control("button", "Copy Case"), ...CASE_ACTIONS] as const;

const NOTIFICATION_TABS = [
  "General", "Tasks", "Contacts", "Documents", "Case Map", "Case History",
] as const;

const ABSENCE_TABS = [
  "Absence Hub", "Leave Details", "Leave Summary", "General", "Tasks",
  "Contacts", "Documents", "Notes", "Alerts", "Case History",
] as const;

const GDC_TABS = [
  "Claim Hub", "General Claim", "Case History", "Medical", "Occupation",
  "Tasks", "Documents", "Contacts", "Insured", "Outstanding Requirements",
] as const;

const openCase = async (
  page: Page,
  caseId: string,
  tab: string,
): Promise<void> => {
  await page.goto(`/cases/${caseId}/${tab}`);
  await expect(page.locator(".fx-record")).toBeVisible();
};

const auditCaseShell = async (
  page: Page,
  caseId: string,
  tab: string,
  tabs: readonly string[],
  actions: readonly ControlSpec[] = CASE_ACTIONS,
): Promise<void> => {
  await openCase(page, caseId, tab);
  await assertInventory(page.locator(".fx-actions"), actions);
  await assertInventory(page.locator(".fx-comp-box"), CASE_COMPONENTS);
  await assertInventory(page.locator(".fx-tabs"), tabs.map((name) => control("tab", name)));
};

const exerciseCaseActions = async (page: Page): Promise<void> => {
  for (const action of ["Add Sub Case", "Correspondence", "Add Activity", "Add eForm"]) {
    await openCase(page, ERICA_CASE, "general");
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(`${action} started.`);
  }
  await exerciseCaseComponents(page);
};

const exerciseCaseComponents = async (page: Page): Promise<void> => {
  await clickCaseComponent(page, "Notification", /\/general$/);
  await clickCaseComponent(page, "Absence Case", /-ABS-01\/absence-hub$/);
  await clickCaseComponent(page, "Group Disability Claim", /-GDC-02\/claim-hub$/);
  await openCase(page, ERICA_CASE, "general");
  await page.getByRole("button", { name: "STD Benefit" }).click();
  await expect(page.getByRole("status")).toContainText("not available");
};

const clickCaseComponent = async (
  page: Page,
  name: string,
  url: RegExp,
): Promise<void> => {
  await openCase(page, ERICA_CASE, "general");
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page).toHaveURL(url);
};

const auditNotificationCase = async (page: Page): Promise<void> => {
  await auditCaseShell(page, ERICA_CASE, "general", NOTIFICATION_TABS);
  await assertParticipants(page, PARTICIPANT_RAILS.notification, "PTY-80937");
  await exerciseCaseActions(page);
  await exerciseCaseTabs(page, ERICA_CASE, NOTIFICATION_TABS);
  await auditNotificationPanels(page);
};

const ADD_PARTICIPANT = control("button", "Add Participant");
const PARTICIPANT_RAILS = {
  notification: [control("link", "Erica Alexander"), ADD_PARTICIPANT],
  absence: [control("link", "David Hunter"), ADD_PARTICIPANT],
  gdc: [control("link", "David Hunter"), ADD_PARTICIPANT],
} as const;

const assertParticipants = async (
  page: Page,
  inventory: readonly ControlSpec[],
  partyId: string,
): Promise<void> => {
  const participants = page.getByRole("region", { name: "Participants" });
  await assertInventory(participants, inventory);
  await participants.getByRole("link", { name: inventory[0]!.name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/parties/${partyId}$`));
};

const exerciseCaseTabs = async (
  page: Page,
  caseId: string,
  tabs: readonly string[],
): Promise<void> => {
  for (const tab of tabs) {
    await openCase(page, caseId, tabSlug(tab));
    const item = page.getByRole("tab", { name: tab, exact: true });
    await item.click();
    await expect(item).toHaveAttribute("aria-selected", "true");
  }
};

const tabSlug = (tab: string): string => tab.toLowerCase().replaceAll(" ", "-");

const auditNotificationPanels = async (page: Page): Promise<void> => {
  await assertEmptyCasePanel(page, ERICA_CASE, "general");
  await assertEmptyCasePanel(page, ERICA_CASE, "tasks");
  await assertEmptyCasePanel(page, ERICA_CASE, "case-history");
  await auditCaseContacts(page, ERICA_CASE);
  await auditCaseDocuments(page, ERICA_CASE);
  await auditCaseMap(page);
};

const caseContent = (page: Page): Locator => page.locator(".fx-case-content");

const assertEmptyCasePanel = async (
  page: Page,
  caseId: string,
  tab: string,
): Promise<void> => {
  await openCase(page, caseId, tab);
  await assertInventory(caseContent(page), []);
};

const CONTACT_CONTROLS = [
  control("textbox", "Add phone number"),
  control("textbox", "Add email address"),
  control("button", "Save"),
] as const;

const auditCaseContacts = async (page: Page, caseId: string): Promise<void> => {
  await openCase(page, caseId, "contacts");
  await assertInventory(caseContent(page), CONTACT_CONTROLS);
  await changeText(page.getByRole("textbox", { name: "Add phone number" }), "555-0111");
  await changeText(page.getByRole("textbox", { name: "Add email address" }), "audit@example.com");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(caseContent(page)).toContainText("555-0111");
};

const DOCUMENT_CONTROLS = [
  control("textbox", "From"),
  control("textbox", "To"),
  control("button", "Clear"),
  control("checkbox", "Include Sub-Cases"),
  control("button", "QuestionPathClaim Eform"),
  control("button", "QuestionPathAbsence Eform"),
] as const;

const auditCaseDocuments = async (page: Page, caseId: string): Promise<void> => {
  await openCase(page, caseId, "documents");
  await assertInventory(caseContent(page), DOCUMENT_CONTROLS);
  await changeText(page.getByRole("textbox", { name: "From" }), "");
  await changeText(page.getByRole("textbox", { name: "To" }), "");
  const includeSubCases = page.getByRole("checkbox", { name: "Include Sub-Cases" });
  await toggle(includeSubCases);
  await toggle(includeSubCases);
  await auditEformButton(page, "QuestionPathClaim Eform", "QuestionPathClaimEform");
  await auditEformButton(page, "QuestionPathAbsence Eform", "QuestionPathAbsenceEform");
};

const auditEformButton = async (
  page: Page,
  button: string,
  heading: string,
): Promise<void> => {
  await page.getByRole("button", { name: button }).click();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await assertInventory(caseContent(page), [control("button", "Back to Documents")]);
  await page.getByRole("button", { name: "Back to Documents" }).click();
};

const auditCaseMap = async (page: Page): Promise<void> => {
  await openCase(page, ERICA_CASE, "case-map");
  await assertInventory(caseContent(page), [
    control("button", `${ERICA_CASE}-ABS-01`),
    control("button", `${ERICA_CASE}-GDC-02`),
  ]);
  await exerciseCaseMapButton(page, `${ERICA_CASE}-ABS-01`, /-ABS-01\/absence-hub$/);
  await exerciseCaseMapButton(page, `${ERICA_CASE}-GDC-02`, /-GDC-02\/claim-hub$/);
};

const exerciseCaseMapButton = async (
  page: Page,
  caseId: string,
  url: RegExp,
): Promise<void> => {
  await openCase(page, ERICA_CASE, "case-map");
  await page.getByRole("button", { name: caseId, exact: true }).click();
  await expect(page).toHaveURL(url);
};

const auditAbsenceCase = async (page: Page): Promise<void> => {
  await auditCaseShell(page, ABSENCE_CASE, "absence-hub", ABSENCE_TABS, ABSENCE_ACTIONS);
  await assertParticipants(page, PARTICIPANT_RAILS.absence, "PTY-77569");
  await exerciseCaseTabs(page, ABSENCE_CASE, ABSENCE_TABS);
  await auditAbsencePanels(page);
};

const auditAbsencePanels = async (page: Page): Promise<void> => {
  await assertEmptyCasePanel(page, ABSENCE_CASE, "absence-hub");
  await auditLeaveDetails(page);
  for (const tab of ["leave-summary", "general", "tasks", "notes", "alerts", "case-history"]) {
    await assertEmptyCasePanel(page, ABSENCE_CASE, tab);
  }
  await auditCaseContacts(page, ABSENCE_CASE);
  await auditCaseDocuments(page, ABSENCE_CASE);
};

const auditLeaveDetails = async (page: Page): Promise<void> => {
  await openCase(page, ABSENCE_CASE, "leave-details");
  await assertInventory(caseContent(page), [
    control("link", "Employment Information"),
    control("button", "Condition"),
  ]);
  await page.getByRole("button", { name: "Condition" }).click();
  await expect(page.getByText("Torn ligament in knee, injured from football game")).toBeVisible();
  await page.getByRole("link", { name: "Employment Information" }).click();
  await expect(page).toHaveURL(/\/employment-details$/);
  await assertInventory(caseContent(page), []);
};

const auditGdcCase = async (page: Page): Promise<void> => {
  await auditCaseShell(page, GDC_CASE, "claim-hub", GDC_TABS);
  await assertParticipants(page, PARTICIPANT_RAILS.gdc, "PTY-77569");
  await exerciseCaseTabs(page, GDC_CASE, GDC_TABS);
  await auditGdcPanels(page);
  await auditMedicalPanel(page);
};

const auditGdcPanels = async (page: Page): Promise<void> => {
  for (const tab of ["claim-hub", "general-claim", "case-history", "occupation", "tasks", "insured", "outstanding-requirements"]) {
    await assertEmptyCasePanel(page, GDC_CASE, tab);
  }
  await auditCaseDocuments(page, GDC_CASE);
  await auditCaseContacts(page, GDC_CASE);
};

const MEDICAL_CONTROLS = [
  control("combobox", "Condition Category"),
  control("checkbox", "Pregnant"),
  control("combobox", "Diagnosis code or description"),
  control("combobox", "Level Indicator"),
  control("link", "Look up ICD-10 code"),
  control("button", "Add Medical Provider"),
  control("button", "Skip Provider"),
] as const;

const KNEE_DIAGNOSES = [
  { name: "Z96.651 - Presence of right artificial knee joint", code: "Z96.651", description: "Presence of right artificial knee joint" },
  { name: "Z96.652 - Presence of left artificial knee joint", code: "Z96.652", description: "Presence of left artificial knee joint" },
  { name: "Z96.653 - Presence of artificial knee joint, bilateral", code: "Z96.653", description: "Presence of artificial knee joint, bilateral" },
  { name: "M25.561 - Pain in right knee", code: "M25.561", description: "Pain in right knee" },
  { name: "S83.511A - Sprain of ACL of right knee, initial encounter", code: "S83.511A", description: "Sprain of ACL of right knee, initial encounter" },
] as const;

const auditMedicalPanel = async (page: Page): Promise<void> => {
  await openCase(page, GDC_CASE, "medical");
  await assertInventory(caseContent(page), MEDICAL_CONTROLS);
  await changeSelect(page.getByRole("combobox", { name: "Condition Category" }), "Other Surgery");
  await toggle(page.getByRole("checkbox", { name: "Pregnant" }));
  await auditDiagnosisState(page);
  await auditCaseProviderStates(page);
};

const auditDiagnosisState = async (page: Page): Promise<void> => {
  const diagnosis = page.getByRole("combobox", { name: "Diagnosis code or description" });
  await changeText(diagnosis, "knee");
  await assertInventory(caseContent(page), [
    ...MEDICAL_CONTROLS,
    ...KNEE_DIAGNOSES.map(({ name }) => control("button", name)),
  ]);
  await page.getByRole("button", { name: KNEE_DIAGNOSES[3].name }).click();
  await expect(page.getByRole("cell", { name: "M25.561" })).toBeVisible();
  await exerciseDiagnosisLookup(page);
};

const auditEveryDiagnosisResult = async (page: Page): Promise<void> => {
  for (const diagnosis of KNEE_DIAGNOSES) {
    await exerciseDiagnosisResult(page, diagnosis);
  }
};

const exerciseDiagnosisResult = async (
  page: Page,
  diagnosis: (typeof KNEE_DIAGNOSES)[number],
): Promise<void> => {
  await openCase(page, GDC_CASE, "medical");
  await changeText(page.getByRole("combobox", { name: "Diagnosis code or description" }), "knee");
  await assertInventory(caseContent(page), [
    ...MEDICAL_CONTROLS, ...KNEE_DIAGNOSES.map(({ name }) => control("button", name)),
  ]);
  await page.getByRole("button", { name: diagnosis.name, exact: true }).click();
  await assertDiagnosisRow(page, diagnosis);
};

const assertDiagnosisRow = async (
  page: Page,
  diagnosis: (typeof KNEE_DIAGNOSES)[number],
): Promise<void> => {
  const code = page.getByRole("cell", { name: diagnosis.code, exact: true });
  const row = page.getByRole("row").filter({ has: code });
  await expect(row.getByRole("cell")).toHaveText([
    "Primary", "ICD-10-CM", diagnosis.code, diagnosis.description, "N/A",
  ]);
};

const exerciseDiagnosisLookup = async (page: Page): Promise<void> => {
  await openCase(page, GDC_CASE, "medical");
  await page.getByRole("link", { name: "Look up ICD-10 code" }).click();
  await expect(page).toHaveURL(/\/lookups\/uknow$/);
};

const CASE_PROVIDER_SEARCH = [
  control("radio", "Person"),
  control("radio", "Organization"),
  control("radio", "Both"),
  control("textbox", "First Name"),
  control("textbox", "Last Name"),
  control("button", "Search"),
  control("button", "Add Person"),
] as const;

const auditCaseProviderStates = async (page: Page): Promise<void> => {
  await openCase(page, GDC_CASE, "medical");
  await page.getByRole("button", { name: "Skip Provider" }).click();
  await expect(caseContent(page)).toContainText("No medical provider will be attached.");
  await page.getByRole("button", { name: "Add Medical Provider" }).click();
  const dialog = page.getByRole("dialog", { name: /Medical Provider/ });
  await assertInventory(dialog, CASE_PROVIDER_SEARCH);
  await exerciseEditableControls(dialog);
  await auditCaseProviderResults(dialog);
  await auditCaseProviderAdd(page);
};

const auditCaseProviderResults = async (dialog: Locator): Promise<void> => {
  await dialog.getByRole("button", { name: "Search" }).click();
  await assertProviderResults(dialog);
  await auditSecondProviderResult(dialog);
  await attachFirstProviderResult(dialog);
};

const assertProviderResults = async (dialog: Locator): Promise<void> => {
  await assertInventory(dialog, [
    ...CASE_PROVIDER_SEARCH,
    control("button", "Travis Larson"),
    control("button", "Travis Larson R Dr"),
  ]);
};

const auditSecondProviderResult = async (dialog: Locator): Promise<void> => {
  await dialog.getByRole("button", { name: "Travis Larson R Dr", exact: true }).click();
  await assertInventory(dialog, [control("button", "Attach"), control("button", "Back")]);
  await expect(dialog.getByRole("heading", { name: "Provider Details — Travis Larson R Dr" }))
    .toBeVisible();
  await dialog.getByRole("button", { name: "Back" }).click();
};

const attachFirstProviderResult = async (dialog: Locator): Promise<void> => {
  await dialog.getByRole("button", { name: "Search" }).click();
  await dialog.getByRole("button", { name: "Travis Larson", exact: true }).click();
  await dialog.getByRole("button", { name: "Attach" }).click();
  await expect(dialog).toHaveCount(0);
};

const auditCaseProviderAdd = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "Add Medical Provider" }).click();
  const dialog = page.getByRole("dialog", { name: /Medical Provider/ });
  await dialog.getByRole("button", { name: "Add Person" }).click();
  await assertInventory(dialog, [
    control("textbox", "First name"),
    control("textbox", "Last name"),
    control("button", "OK"),
  ]);
  await changeText(dialog.getByRole("textbox", { name: "First name" }), "Janet");
  await changeText(dialog.getByRole("textbox", { name: "Last name" }), "Smith");
  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toHaveCount(0);
};

export class LookupAudit {
  constructor(private readonly page: Page) {}

  async run(): Promise<void> {
    await auditLookupInventories(this.page);
    await exerciseLookupLinks(this.page);
    await exerciseLookupBackButtons(this.page);
  }
}

const LOOKUP_INVENTORIES: Readonly<Record<string, readonly ControlSpec[]>> = {
  uknow: [
    control("button", "Back to claim"),
    control("link", "ICD 10 Data"),
    control("link", "Google"),
    control("link", "ICD Codes: Reference Sheet"),
    control("link", "Common ICD10 Codes & Medical Category"),
  ],
  google: [control("button", "Back to claim")],
  icd10data: [
    control("button", "Back to claim"),
    control("link", "Common ICD-10 Codes Chart"),
  ],
  "icd-reference": [
    control("button", "Back to claim"),
    control("link", "Click here to view the file"),
  ],
  "icd-chart": [control("button", "Back to claim")],
};

const auditLookupInventories = async (page: Page): Promise<void> => {
  for (const [source, controls] of Object.entries(LOOKUP_INVENTORIES)) {
    await page.goto(`/lookups/${source}`);
    await assertInventory(page.locator(".fx-lookup"), controls);
  }
};

const exerciseLookupLinks = async (page: Page): Promise<void> => {
  await assertLookupLink(page, "uknow", "ICD 10 Data", /\/lookups\/icd10data$/);
  await assertLookupLink(page, "uknow", "Google", /\/lookups\/google$/);
  await assertLookupLink(page, "uknow", "ICD Codes: Reference Sheet", /\/lookups\/icd-reference$/);
  await assertLookupLink(page, "uknow", "Common ICD10 Codes & Medical Category", /\/lookups\/icd-chart$/);
  await assertLookupLink(page, "icd10data", "Common ICD-10 Codes Chart", /\/lookups\/icd-chart$/);
  await assertLookupLink(page, "icd-reference", "Click here to view the file", /\/lookups\/icd-chart$/);
};

const assertLookupLink = async (
  page: Page,
  source: string,
  name: string,
  url: RegExp,
): Promise<void> => {
  await page.goto(`/lookups/${source}`);
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(url);
};

const exerciseLookupBackButtons = async (page: Page): Promise<void> => {
  for (const source of Object.keys(LOOKUP_INVENTORIES)) {
    await page.goto("/dashboard");
    await page.goto(`/lookups/${source}`);
    await page.getByRole("button", { name: "Back to claim" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
};
