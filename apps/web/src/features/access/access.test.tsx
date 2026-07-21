// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../../app/router";

const aParty = (over: Record<string, unknown> = {}) => ({
  id: "PTY-77569",
  customerNumber: "77569",
  fullName: "David Hunter",
  partyType: "insured",
  dateOfBirth: "1980-10-20",
  employer: "ACEDEX",
  phone: "(207) 8182211",
  homePhone: "(207) 0012222",
  email: "david_hunter.aoa7wupt@mailosaur.io",
  ...over,
});

const aCaseSummary = (over: Record<string, unknown> = {}) => ({
  caseId: "NTN-159898",
  partyName: "David Hunter",
  scope: { kind: "selected", value: "leave_and_gdc" },
  status: "SUBMITTED",
  ...over,
});

const ok = (value: unknown) => ({ ok: true, value });
const err = (error: string, message: string) => ({ ok: false, error, message });

interface Routes {
  session?: unknown;
  parties?: unknown;
  party?: unknown;
  contact?: unknown;
  cases?: unknown;
  draft?: unknown;
}

const stubApi = (routes: Routes = {}) => {
  vi.stubGlobal("fetch", vi.fn((input: string) => resolve(input, routes)));
};

const resolve = (input: string, routes: Routes) =>
  Promise.resolve({ json: async () => bodyFor(input, routes) } as Response);

const bodyFor = (input: string, routes: Routes) => {
  if (input.includes("/session")) return routes.session ?? ok({ token: "t", username: "je" });
  if (input.includes("/parties/search")) return routes.parties ?? ok([aParty()]);
  if (input.includes("/contact")) return routes.contact ?? ok(aParty());
  if (input.endsWith("/notifications")) return routes.draft ?? ok({ draftId: "NTN-165775", scope: { kind: "unselected" } });
  if (input.includes("/parties/")) return routes.party ?? ok(aParty());
  if (input.includes("/cases/search")) return routes.cases ?? ok([aCaseSummary()]);
  return ok(null);
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

beforeEach(() => stubApi());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FINEOS sign-in", () => {
  it("shows the email and password fields on the sign-in card", () => {
    renderAt("/login");
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
  });

  it("should reject sign-in when the credentials are not recognized", async () => {
    stubApi({ session: err("invalid_credentials", "The supplied credentials were not recognized.") });
    const user = userEvent.setup();
    renderAt("/login");
    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), "je@unum.com");
    await user.type(screen.getByLabelText(/password/i), "nope");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/not recognized/i);
  });

  it("navigates to the dashboard after a successful sign-in", async () => {
    const user = userEvent.setup();
    renderAt("/login");
    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), "je@unum.com");
    await user.type(screen.getByLabelText(/password/i), "fineos");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("heading", { name: /dashboard/i })).toBeTruthy();
  });
});

describe("Dashboard", () => {
  it("renders the My Cases and Team Cases widgets", () => {
    renderAt("/dashboard");
    expect(screen.getByText(/my cases listview/i)).toBeTruthy();
    expect(screen.getByText(/team cases by user/i)).toBeTruthy();
  });

  it("removes a widget when its close button is used", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    const widget = screen.getByRole("region", { name: /team cases by user/i });
    await user.click(within(widget).getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("region", { name: /team cases by user/i })).toBeNull();
  });

  it("opens the case search dialog from the global search", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    await user.click(screen.getByRole("button", { name: /open search/i }));
    expect(screen.getByRole("dialog", { name: /case search/i })).toBeTruthy();
  });
});

describe("Primary navigation", () => {
  const useNavigation = async (name: RegExp, path = "/dashboard") => {
    const user = userEvent.setup();
    renderAt(path);
    const navigation = screen.getByRole("navigation", { name: /primary/i });
    await user.click(within(navigation).getByRole("button", { name }));
  };

  it("navigates Home to the dashboard", async () => {
    await useNavigation(/home/i, "/parties/PTY-77569");
    expect(await screen.findByRole("heading", { name: /dashboard/i })).toBeTruthy();
  });

  it("navigates Parties to the seeded party context", async () => {
    await useNavigation(/parties/i);
    expect(await screen.findByRole("heading", { name: /david hunter/i })).toBeTruthy();
  });

  it("navigates Cases to the existing Master Plan context", async () => {
    await useNavigation(/cases/i);
    expect(await screen.findByRole("heading", { name: /master plan 18489/i })).toBeTruthy();
  });

  it("shows an in-shell notice for Work Queues", async () => {
    await useNavigation(/work queues/i);
    expect((await screen.findByRole("status")).textContent).toMatch(/work queues.*not available/i);
  });

  it("shows an in-shell notice for Tasks", async () => {
    await useNavigation(/^tasks$/i);
    expect((await screen.findByRole("status")).textContent).toMatch(/tasks.*not available/i);
  });

  it("shows an in-shell notice for Library", async () => {
    await useNavigation(/library/i);
    expect((await screen.findByRole("status")).textContent).toMatch(/library.*not available/i);
  });
});

describe("Case search dialog", () => {
  const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
    renderAt("/dashboard");
    await user.click(screen.getByRole("button", { name: /open search/i }));
    return screen.getByRole("dialog", { name: /case search/i });
  };

  it("exposes Case, Party, and Recent tabs", async () => {
    const dialog = await openDialog(userEvent.setup());
    expect(within(dialog).getByRole("tab", { name: /case/i })).toBeTruthy();
    expect(within(dialog).getByRole("tab", { name: /party/i })).toBeTruthy();
    expect(within(dialog).getByRole("tab", { name: /recent/i })).toBeTruthy();
  });

  it("moves keyboard focus into the dialog when it opens", async () => {
    const dialog = await openDialog(userEvent.setup());
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("links each search tab to its labelled tab panel", async () => {
    const dialog = await openDialog(userEvent.setup());
    const tab = within(dialog).getByRole("tab", { name: /^case$/i });
    const panel = within(dialog).getByRole("tabpanel");
    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
  });

  it("keeps keyboard focus inside the search dialog", async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    const first = within(dialog).getByRole("button", { name: /^ok$/i });
    const last = within(dialog).getByRole("button", { name: /^search$/i });
    expect(document.activeElement).toBe(first);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
    await user.tab();
    expect(document.activeElement).toBe(first);
  });

  it("lists matching parties on the Party tab", async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("tab", { name: /party/i }));
    await user.type(within(dialog).getByLabelText(/search term/i), "hunter");
    await user.click(within(dialog).getByRole("button", { name: /^search$/i }));
    expect(await within(dialog).findByText(/david hunter/i)).toBeTruthy();
  });

  it("navigates to the party record when a party result is chosen", async () => {
    const user = userEvent.setup();
    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("tab", { name: /party/i }));
    await user.type(within(dialog).getByLabelText(/search term/i), "hunter");
    await user.click(within(dialog).getByRole("button", { name: /^search$/i }));
    await user.click(await within(dialog).findByRole("button", { name: /david hunter/i }));
    expect(await screen.findByRole("heading", { name: /david hunter/i })).toBeTruthy();
  });

  it("closes when Escape is pressed", async () => {
    const user = userEvent.setup();
    await openDialog(user);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /case search/i })).toBeNull();
  });
});

describe("Party record", () => {
  const renderPartyTabs = async () => {
    const user = userEvent.setup();
    renderAt("/parties/PTY-77569");
    await screen.findByRole("heading", { name: /david hunter/i });
    return { user, tabs: screen.getAllByRole("tab") };
  };

  it("renders the reference party tabs in order with overflow", async () => {
    renderAt("/parties/PTY-77569");
    expect(await screen.findByRole("heading", { name: /david hunter/i })).toBeTruthy();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Profile", "Policies for Client", "Party History", "Leave Information",
      "Payment Preferences", "Payment History", "Cases", "Tasks",
    ]);
    expect(screen.queryByRole("tab", { name: /contact details/i })).toBeNull();
    expect(screen.getByRole("button", { name: /more tabs/i })).toBeTruthy();
  });

  it("moves to and selects the next tab with ArrowRight", async () => {
    const { user, tabs } = await renderPartyTabs();
    tabs[0]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1]).toHaveProperty("ariaSelected", "true");
  });

  it("wraps to and selects the last tab with ArrowLeft", async () => {
    const { user, tabs } = await renderPartyTabs();
    tabs[0]?.focus();
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(tabs[7]);
    expect(tabs[7]).toHaveProperty("ariaSelected", "true");
  });

  it("moves to and selects the first tab with Home", async () => {
    const { user, tabs } = await renderPartyTabs();
    tabs[4]?.focus();
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(tabs[0]);
    expect(tabs[0]).toHaveProperty("ariaSelected", "true");
  });

  it("moves to and selects the last tab with End", async () => {
    const { user, tabs } = await renderPartyTabs();
    tabs[0]?.focus();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(tabs[7]);
    expect(tabs[7]).toHaveProperty("ariaSelected", "true");
  });

  it("marks Parties instead of Home current on party routes", async () => {
    renderAt("/parties/PTY-77569");
    await screen.findByRole("heading", { name: /david hunter/i });
    const navigation = screen.getByRole("navigation", { name: /primary/i });
    expect(within(navigation).getByRole("button", { name: /parties/i }).getAttribute("aria-current")).toBe("page");
    expect(within(navigation).getByRole("button", { name: /home/i }).hasAttribute("aria-current")).toBe(false);
  });

  it("edits and persists contact details from the Edit Party action", async () => {
    const user = userEvent.setup();
    stubApi({ contact: ok(aParty({ phone: "(555) 0100000" })) });
    renderAt("/parties/PTY-77569");
    await user.click(await screen.findByRole("button", { name: /^edit party$/i }));
    const dialog = screen.getByRole("dialog", { name: /edit party/i });
    await user.clear(screen.getByLabelText(/phone/i));
    await user.type(screen.getByLabelText(/phone/i), "(555) 0100000");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(dialog.isConnected).toBe(false);
    expect(vi.mocked(fetch).mock.calls.at(-1)?.[1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ phone: "(555) 0100000", email: "david_hunter.aoa7wupt@mailosaur.io" }),
    });
    await user.click(screen.getByRole("button", { name: /^edit party$/i }));
    expect(screen.getByLabelText(/phone/i)).toHaveProperty("value", "(555) 0100000");
  });

  it("starts a notification draft and opens the intake wizard when Create Notification is used", async () => {
    const user = userEvent.setup();
    renderAt("/parties/PTY-77569");
    await user.click(await screen.findByRole("button", { name: /create notification/i }));
    expect(await screen.findByRole("heading", { name: /notification details/i })).toBeTruthy();
  });

  it("renders Communication Preferences as a profile state without adding a tab", async () => {
    renderAt("/parties/PTY-77569/communication-preferences");
    expect(await screen.findByRole("heading", { name: /communication preferences/i })).toBeTruthy();
    expect(screen.getByText(/notify on update via email/i)).toBeTruthy();
    expect(screen.getByText(/preferred contact method/i)).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /contact details/i })).toBeNull();
  });

  it("navigates from Contact Details to Communication Preferences without adding tabs", async () => {
    const user = userEvent.setup();
    renderAt("/parties/PTY-77569/contact-details");
    expect(await screen.findByRole("heading", { name: /contact details/i })).toBeTruthy();
    expect(screen.getByText("(207) 8182211")).toBeTruthy();
    expect(screen.getByText("(207) 0012222")).toBeTruthy();
    await user.click(screen.getByRole("link", { name: /communication preferences/i }));
    expect(await screen.findByRole("heading", { name: /communication preferences/i })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /contact details/i })).toBeNull();
  });

  it("follows Profile to Contact Details to Communication Preferences and back", async () => {
    const user = userEvent.setup();
    renderAt("/parties/PTY-77569");
    await user.click(await screen.findByRole("link", { name: /contact details/i }));
    expect(await screen.findByRole("heading", { name: /contact details/i })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: /communication preferences/i }));
    expect(await screen.findByRole("heading", { name: /communication preferences/i })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: /back to contact details/i }));
    expect(await screen.findByRole("heading", { name: /contact details/i })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: /back to profile/i }));
    expect(await screen.findByRole("heading", { name: /personal details/i })).toBeTruthy();
  });

  it("leaves a named view when a regular party tab is selected", async () => {
    const user = userEvent.setup();
    renderAt("/parties/PTY-77569/communication-preferences");
    await screen.findByRole("heading", { name: /communication preferences/i });
    await user.click(screen.getByRole("tab", { name: /policies for client/i }));
    expect(await screen.findByText(/policies for client.*no data available/i)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /communication preferences/i })).toBeNull();
  });
});
