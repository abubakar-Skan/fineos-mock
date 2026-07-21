// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../../app/router";

const ok = (value: unknown) => ({ ok: true, value });

const aParty = (over: Record<string, unknown> = {}) => ({
  id: "PTY-77569", customerNumber: "77569", fullName: "David Hunter", partyType: "insured",
  dateOfBirth: "1980-10-20", employer: "ACEDEX", phone: null, homePhone: null, email: null, ...over,
});

const aCaseSummary = (over: Record<string, unknown> = {}) => ({
  caseId: "NTN-159898",
  partyName: "David Hunter",
  scope: { kind: "selected", value: "leave_and_gdc" },
  status: "SUBMITTED",
  ...over,
});

const rootFromCaseUrl = (input: string): string => {
  const match = input.match(/\/cases\/([^?]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
};

const detailsFor = (rootId: string) => ({
  notification: {
    id: rootId, partyId: "PTY-X", source: "Phone", notificationDate: "2026-01-01",
    scope: { kind: "selected", value: "leave_and_gdc" }, status: "SUBMITTED",
  },
  absence: {
    id: `${rootId}-ABS-01`, leaveReason: "serious_health_condition", conditionDescription: null,
    workState: "DE", status: "OPEN", periods: [],
  },
  gdc: { id: `${rootId}-GDC-02`, providerPartyId: null, diagnosisCode: null, status: "OPEN" },
  claimant: aParty({ id: "PTY-X", fullName: "Test Claimant", employer: "Test Employer" }),
  provider: null,
  sections: {},
});

const bodyFor = (input: string) => {
  if (input.includes("/parties/search")) return ok([aParty()]);
  if (input.includes("/cases/search")) return ok([aCaseSummary()]);
  if (input.includes("/cases/")) return ok(detailsFor(rootFromCaseUrl(input)));
  if (input.includes("/parties/")) return ok(aParty());
  return ok(null);
};

const stubApi = () =>
  vi.stubGlobal("fetch", vi.fn((input: string) =>
    Promise.resolve({ json: async () => bodyFor(input) } as Response)));

const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);

const openSearch = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /open search/i }));
  return screen.getByRole("dialog", { name: /case search/i });
};

const openViaNav = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
  const nav = screen.getByRole("navigation", { name: /primary/i });
  await user.click(within(nav).getByRole("button", { name }));
  return screen.getByRole("dialog", { name: /case search/i });
};

const openRecent = async (user: ReturnType<typeof userEvent.setup>) => {
  const dialog = await openSearch(user);
  await user.click(within(dialog).getByRole("tab", { name: /recent/i }));
  return dialog;
};

beforeEach(() => stubApi());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Side-navigation search shortcuts", () => {
  it("opens Case Search on the Party tab from the Parties icon without leaving the dashboard", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    const dialog = await openViaNav(user, /parties/i);
    expect(within(dialog).getByRole("tab", { name: /party/i }).getAttribute("aria-selected")).toBe("true");
    expect(within(dialog).getByLabelText(/search term/i)).toBeTruthy();
  });

  it("should not open Erica's party record directly when the Parties icon is used", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    await openViaNav(user, /parties/i);
    expect(screen.queryByRole("heading", { name: /erica alexander/i })).toBeNull();
    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeTruthy();
  });

  it("opens Case Search on the Case tab from the Cases icon", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    const dialog = await openViaNav(user, /cases/i);
    expect(within(dialog).getByRole("tab", { name: /^case$/i }).getAttribute("aria-selected")).toBe("true");
    expect(within(dialog).getByRole("textbox", { name: /case number/i })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /master plan 18489/i })).toBeNull();
  });

  it("keeps the header global search defaulting to the Case tab", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    const dialog = await openSearch(user);
    expect(within(dialog).getByRole("tab", { name: /^case$/i }).getAttribute("aria-selected")).toBe("true");
  });

  it("returns to the dashboard shell cleanly when the search is closed", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    await openViaNav(user, /cases/i);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /case search/i })).toBeNull();
    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeTruthy();
  });
});

describe("Case tab search routing", () => {
  it("opens the matching notification without injecting the Master Plan", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    const dialog = await openViaNav(user, /cases/i);
    await user.type(within(dialog).getByRole("textbox", { name: /case number/i }), "NTN-159898");
    await user.click(within(dialog).getByRole("button", { name: /^search$/i }));
    expect(within(dialog).queryByRole("button", { name: /master plan/i })).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "NTN-159898" }));
    expect(await screen.findByRole("heading", { name: /notification NTN-159898/i })).toBeTruthy();
  });
});

describe("Recent search results routing", () => {
  it("renders every recent row as a clickable button", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    const dialog = await openRecent(user);
    const rows = within(dialog).getByRole("table");
    expect(within(rows).getAllByRole("button")).toHaveLength(11);
  });

  it("opens the notification case record for the first recent row", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    const dialog = await openRecent(user);
    await user.click(within(dialog).getByRole("button", { name: /Notification - NTN-159898/i }));
    expect(await screen.findByRole("heading", { name: /notification NTN-159898/i })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /personal details/i })).toBeNull();
  });

  it("opens the absence-hub context for a middle absence row", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    const dialog = await openRecent(user);
    await user.click(within(dialog).getByRole("button", { name: /Absence Case - NTN-162642-ABS-01/i }));
    expect(await screen.findByRole("heading", { name: /absence case NTN-162642-ABS-01/i })).toBeTruthy();
  });

  it("opens the notification case record for the last recent row", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    const dialog = await openRecent(user);
    await user.click(within(dialog).getByRole("button", { name: /Notification - NTN-165775/i }));
    expect(await screen.findByRole("heading", { name: /notification NTN-165775/i })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /erica alexander/i })).toBeNull();
  });

  it("activates a recent result with the keyboard", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    const dialog = await openRecent(user);
    within(dialog).getByRole("button", { name: /Notification - NTN-159901/i }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: /notification NTN-159901/i })).toBeTruthy();
  });
});

describe("Intake popup search results routing", () => {
  it("renders every popup row as a clickable button", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard?search=popup");
    const dialog = await openSearch(user);
    const table = within(dialog).getByRole("table");
    expect(within(table).getAllByRole("button")).toHaveLength(10);
  });

  it("opens the GDC claim-hub context for the first popup row", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard?search=popup");
    const dialog = await openSearch(user);
    await user.click(within(dialog).getByRole("button", { name: /Group Disability Claim - NTN-165773-GDC-02/i }));
    expect(await screen.findByRole("heading", { name: /group disability claim NTN-165773-GDC-02/i })).toBeTruthy();
  });

  it("still opens the Master Plan members list from the popup", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard?search=popup");
    const dialog = await openSearch(user);
    await user.click(within(dialog).getByRole("button", { name: /Master Plan - 18489/i }));
    expect(await screen.findByRole("heading", { name: /master plan 18489/i })).toBeTruthy();
  });
});
