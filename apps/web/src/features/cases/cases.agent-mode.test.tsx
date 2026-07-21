// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AUTOMATION_SHORTCUTS_ENABLED } from "@fineos/contracts";
import { AppRoutes } from "../../app/router";

const ok = (value: unknown) => ({ ok: true, value });

const aParty = () => ({
  id: "PTY-77569", customerNumber: "77569", fullName: "David Hunter", partyType: "insured",
  dateOfBirth: "1980-10-20", employer: "ACEDEX", phone: "(207) 8182211",
  homePhone: "(207) 0012222", email: "david@example.com",
});

const aDetails = () => ({
  notification: {
    id: "NTN-159898", partyId: "PTY-77569", source: "Phone", notificationDate: "2026-01-06",
    scope: { kind: "selected", value: "leave_and_gdc" }, status: "SUBMITTED",
  },
  absence: {
    id: "NTN-159898-ABS-01", leaveReason: "serious_health_condition", conditionDescription: null,
    workState: "NJ", status: "ADJUDICATION", periods: [],
  },
  gdc: { id: "NTN-159898-GDC-02", providerPartyId: "PTY-TRAVIS", diagnosisCode: "O80", status: "OPEN" },
  claimant: aParty(),
  provider: { ...aParty(), id: "PTY-TRAVIS", fullName: "Travis Larson", partyType: "medical_provider" },
  sections: {},
});

const stubApi = () => {
  vi.stubGlobal("fetch", vi.fn((input: string) =>
    Promise.resolve({ json: async () => (input.includes("/cases/") ? ok(aDetails()) : ok(aParty())) } as Response)));
};

const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);

beforeEach(() => stubApi());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Agent-first case UI", () => {
  it("keeps the shared automation flag off by default", () => {
    expect(AUTOMATION_SHORTCUTS_ENABLED).toBe(false);
  });

  it("hides Run Case Execution on a case record by default", async () => {
    renderAt("/cases/NTN-159898/general");
    await screen.findByRole("heading", { name: /NTN-159898/i });
    expect(screen.queryByRole("button", { name: /run case execution/i })).toBeNull();
    expect(screen.queryByText(/case execution completed/i)).toBeNull();
  });

  it("keeps manual case tabs and actions available by default", async () => {
    renderAt("/cases/NTN-159898/general");
    await screen.findByRole("heading", { name: /NTN-159898/i });
    expect(screen.getByRole("tab", { name: /documents/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /add sub case/i })).toBeTruthy();
  });

  it("keeps manual medical provider and diagnosis controls available by default", async () => {
    renderAt("/cases/NTN-159898-GDC-02/medical");
    expect(await screen.findByRole("button", { name: /add medical provider/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /skip provider/i })).toBeTruthy();
    expect(screen.getByLabelText(/diagnosis code or description/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /run case execution/i })).toBeNull();
  });

  it("renders a deterministic lookup without auto-running the process", async () => {
    renderAt("/lookups/uknow");
    expect(await screen.findByRole("heading", { name: /getanswer/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /run case execution/i })).toBeNull();
  });
});
