// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../../app/router";

const anEricaParty = () => ({
  id: "PTY-80937",
  customerNumber: "80937",
  fullName: "Erica Alexander",
  partyType: "insured",
  dateOfBirth: "1980-10-05",
  employer: "Fifth Third Bank National Association",
  phone: null,
  email: null,
});

const responseFor = (input: string) => ({
  json: async () => input.includes("/parties/") ?
    { ok: true, value: anEricaParty() } :
    { ok: true, value: [] },
}) as Response;

const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);

beforeEach(() => vi.stubGlobal("fetch", vi.fn(responseFor)));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Master Plan member list", () => {
  it("opens Master Plan 18489 members from case search", async () => {
    const user = userEvent.setup();
    renderAt("/dashboard");
    await user.click(screen.getByRole("button", { name: /open search/i }));
    const dialog = screen.getByRole("dialog", { name: /case search/i });
    await user.type(within(dialog).getByLabelText(/case number/i), "18489");
    await user.click(within(dialog).getByRole("button", { name: /^search$/i }));
    await user.click(await within(dialog).findByRole("button", { name: /master plan - 18489/i }));
    expect(await screen.findByRole("heading", { name: /master plan 18489/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /^members$/i })).toHaveProperty("ariaSelected", "true");
  });

  it("navigates from the second member page to Erica Alexander", async () => {
    const user = userEvent.setup();
    renderAt("/master-plans/18489/members");
    expect(screen.getByRole("button", { name: /laura adams/i })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /next page/i }));
    await user.click(screen.getByRole("button", { name: /erica alexander/i }));
    expect(await screen.findByRole("heading", { name: /erica alexander/i })).toBeTruthy();
  });

  it("marks Cases instead of Home current on Master Plan routes", () => {
    renderAt("/master-plans/18489/members");
    const navigation = screen.getByRole("navigation", { name: /primary/i });
    expect(within(navigation).getByRole("button", { name: /cases/i }).getAttribute("aria-current")).toBe("page");
    expect(within(navigation).getByRole("button", { name: /home/i }).hasAttribute("aria-current")).toBe(false);
  });
});
