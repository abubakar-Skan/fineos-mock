// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter } from "react-router-dom";

// This suite covers the code-enabled automation shortcut (Run Case Execution +
// execution outcome banners), so it forces the shared flag on. Default agent
// mode (button hidden) is covered in cases.agent-mode.test.tsx.
vi.mock("@fineos/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@fineos/contracts")>()),
  AUTOMATION_SHORTCUTS_ENABLED: true,
}));

import { AppRoutes } from "../../app/router";

const ok = (value: unknown) => ({ ok: true, value });
const err = (error: string, message: string) => ({ ok: false, error, message });

const aParty = (over: Record<string, unknown> = {}) => ({
  id: "PTY-77569", customerNumber: "77569", fullName: "David Hunter", partyType: "insured",
  dateOfBirth: "1980-10-20", employer: "ACEDEX", phone: "(207) 8182211",
  homePhone: "(207) 0012222", email: "david_hunter.aoa7wupt@mailosaur.io", ...over,
});

const aDetails = (over: Record<string, unknown> = {}) => ({
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
  provider: aParty({
    id: "PTY-TRAVIS", customerNumber: null, fullName: "Travis Larson",
    partyType: "medical_provider", dateOfBirth: null, employer: null, phone: null,
    homePhone: null, email: null,
  }),
  sections: {},
  ...over,
});

const generatedNotification = (scope: string) => ({
  id: "NTN-900001", partyId: "PTY-80937", source: "Phone",
  notificationDate: "2026-03-01", scope: { kind: "selected", value: scope },
  status: "SUBMITTED",
});

const generatedClaimant = () => aParty({
  id: "PTY-80937", fullName: "Erica Alexander",
  employer: "Fifth Third Bank National Association",
});

const generatedLeaveDetails = () => aDetails({
  notification: generatedNotification("leave_only"),
  claimant: generatedClaimant(),
  absence: {
    id: "NTN-900001-ABS-01", leaveReason: "serious_health_condition",
    conditionDescription: "Post-surgical recovery", workState: "DE", status: "OPEN",
    periods: [{ id: "P1", lastDayWorked: "2026-03-01", startDate: "2026-03-02", endDate: "2026-03-08" }],
  },
  gdc: undefined,
  provider: null,
  sections: {
    occupation: {
      jobTitle: "Warehouse Associate", employmentStatus: "Active",
      dateOfHire: "03/10/2024", hoursPerWeek: "32",
    },
  },
});

const generatedGdcDetails = () => aDetails({
  notification: generatedNotification("gdc_only"),
  claimant: generatedClaimant(),
  absence: undefined,
  gdc: {
    id: "NTN-900001-GDC-02", providerPartyId: null,
    diagnosisCode: "M25.561", status: "OPEN",
  },
  provider: null,
  sections: {
    gdcDetails: {
      incurredDate: "03/04/2026", accidentSickness: "Sickness",
      firstUnable: "03/05/2026", claimLastDayWorked: "03/03/2026",
    },
    medicalDetails: { firstTreatment: "03/06/2026", conditionText: "Knee recovery" },
  },
});

const anOutcome = (over: Record<string, unknown> = {}) => ({
  caseId: "NTN-159898", status: "COMPLETED", activatedTracks: ["absence", "gdc"],
  diagnosisUpdated: true, providerUpdated: true, runId: "RUN-1", ...over,
});

const JANE = { id: "PTY-PROVIDER-0001", customerNumber: null, fullName: "Jane Doe", partyType: "medical_provider", dateOfBirth: null, employer: null, phone: null, homePhone: null, email: null };

interface Stub {
  details?: unknown;
  execute?: unknown;
  party?: unknown;
  contact?: unknown;
  provider?: unknown;
}

const stubApi = (stub: Stub = {}) => {
  vi.stubGlobal("fetch", vi.fn((input: string) => resolve(input, stub)));
};

const resolve = (input: string, stub: Stub) =>
  Promise.resolve({ json: async () => bodyFor(input, stub) } as Response);

const bodyFor = (input: string, stub: Stub) => {
  if (input.includes("/execute")) return stub.execute ?? ok(anOutcome());
  if (input.includes("/providers")) return stub.provider ?? ok(JANE);
  if (input.includes("/contact")) return stub.contact ?? ok(aParty());
  if (input.includes("/cases/")) return stub.details ?? ok(aDetails());
  if (input.includes("/parties/")) return stub.party ?? ok(aParty());
  return ok(null);
};

const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);

const renderWithCaseSwitch = () =>
  render(<MemoryRouter initialEntries={["/cases/NTN-159898-GDC-02/medical"]}>
    <Link to="/cases/NTN-900001-GDC-02/medical">Open next case</Link>
    <AppRoutes />
  </MemoryRouter>);

const switchedCaseBody = (input: string) => {
  if (input.includes("/execute")) return ok(anOutcome());
  if (input.includes("NTN-900001")) return ok(generatedGdcDetails());
  if (input.includes("/cases/")) return ok(aDetails());
  return ok(null);
};

const stubCaseSwitchApi = () => {
  vi.stubGlobal("fetch", vi.fn((input: string) =>
    Promise.resolve({ json: async () => switchedCaseBody(input) } as Response)));
};

const refreshedDetails = () => aDetails({
  gdc: {
    id: "NTN-159898-GDC-02", providerPartyId: "PTY-PROVIDER-0001",
    diagnosisCode: "M25.561", status: "OPEN",
  },
  provider: JANE,
});

const stubRefreshApi = () => {
  let reads = 0;
  vi.stubGlobal("fetch", vi.fn((input: string) => {
    if (input.includes("/execute")) return resolve(input, { execute: ok(anOutcome()) });
    reads += 1;
    return resolve(input, { details: ok(reads === 1 ? aDetails() : refreshedDetails()) });
  }));
};

const runExecution = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByRole("button", { name: /run case execution/i });
  await user.click(screen.getByRole("button", { name: /run case execution/i }));
};

const executionRequest = () => {
  const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/execute"));
  return JSON.parse(String(call?.[1]?.body)) as Record<string, unknown>;
};

beforeEach(() => stubApi());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Notification documents", () => {
  it("lists documents for the case and opens the QuestionPath eForm", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/documents");
    expect(await screen.findByRole("heading", { name: /documents for case/i })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /questionpathclaim eform/i }));
    expect(await screen.findByRole("heading", { name: /questionpathclaimeform/i })).toBeTruthy();
    expect(screen.getByText(/torn ligament in knee/i)).toBeTruthy();
  });

  it("filters documents by date and sub-case inclusion", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/documents");
    await screen.findByRole("heading", { name: /documents for case/i });
    await user.clear(screen.getByLabelText(/^from$/i));
    await user.type(screen.getByLabelText(/^from$/i), "01/07/2026");
    expect(screen.queryByRole("button", { name: /questionpathclaim eform/i })).toBeNull();
    await user.clear(screen.getByLabelText(/^from$/i));
    await user.click(screen.getByLabelText(/include sub-cases/i));
    expect(screen.getByText(/no documents match/i)).toBeTruthy();
  });

  it("shows only relevant documents and components for a generated Leave-only case", async () => {
    stubApi({ details: ok(generatedLeaveDetails()) });
    renderAt("/cases/NTN-900001/documents");
    expect(await screen.findByRole("button", { name: /questionpathabsence eform/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /questionpathclaim eform/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /group disability claim/i })).toBeNull();
    expect(screen.queryByText("01/06/2026")).toBeNull();
  });

  it("shows only relevant documents and components for a generated GDC-only case", async () => {
    stubApi({ details: ok(generatedGdcDetails()) });
    renderAt("/cases/NTN-900001/documents");
    expect(await screen.findByRole("button", { name: /questionpathclaim eform/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /questionpathabsence eform/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /absence case/i })).toBeNull();
    expect(screen.queryByText("01/06/2026")).toBeNull();
  });
});

describe("Case map", () => {
  it("renders the notification hierarchy and opens a linked sub-case", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/case-map");
    expect(await screen.findByRole("heading", { name: /^case map$/i })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "NTN-159898-ABS-01" }));
    expect(await screen.findByRole("heading", { name: /absence case NTN-159898-ABS-01/i })).toBeTruthy();
  });

  it("uses Erica's participant data for Erica and generated cases", async () => {
    stubApi({ details: ok(aDetails({
      notification: {
        id: "NTN-900001", partyId: "PTY-80937", source: "Phone",
        notificationDate: "2026-02-13", scope: { kind: "selected", value: "leave_and_gdc" },
        status: "SUBMITTED",
      },
      claimant: aParty({
        id: "PTY-80937", fullName: "Erica Alexander",
        employer: "Fifth Third Bank National Association",
      }),
      provider: null,
    })) });
    renderAt("/cases/NTN-900001/case-map");
    expect(await screen.findAllByText(/erica alexander/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/fifth third bank national association/i)).not.toHaveLength(0);
    expect(screen.queryByText(/david hunter/i)).toBeNull();
    expect(screen.queryByText(/acedex/i)).toBeNull();
  });
});

describe("Claimant contact entry", () => {
  it("opens claimant Profile before Contact Details from the case participant link", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/general");
    const claimants = await screen.findAllByRole("link", { name: /david hunter/i });
    const claimant = claimants[0]!;
    expect(claimant.getAttribute("href")).toBe("/parties/PTY-77569");
    await user.click(claimant);
    expect(await screen.findByRole("heading", { name: /personal details/i })).toBeTruthy();
    await user.click(screen.getByRole("link", { name: /contact details/i }));
    expect(await screen.findByRole("heading", { name: /contact details/i })).toBeTruthy();
    expect(screen.getByText("(207) 0012222")).toBeTruthy();
  });

  it("records an updated claimant phone number through the Contacts tab", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/contacts");
    const phone = await screen.findByLabelText(/add phone number/i);
    await user.clear(phone);
    await user.type(phone, "(555) 0100000");
    await user.click(screen.getByRole("button", { name: /save/i }));
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/contact"));
    expect(call?.[1]).toMatchObject({ method: "PATCH" });
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ phone: "(555) 0100000" });
  });
});

describe("Case execution outcomes", () => {
  it("activates only the absence track for an absence-only completion", async () => {
    stubApi({ execute: ok(anOutcome({ activatedTracks: ["absence"], diagnosisUpdated: false, providerUpdated: false })) });
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898-ABS-01/absence-hub");
    await screen.findByRole("heading", { name: /absence summary/i });
    await runExecution(user);
    expect((await screen.findByRole("status")).textContent).toMatch(/absence component activated/i);
  });

  it("activates only the GDC track for a GDC-only completion", async () => {
    stubApi({ execute: ok(anOutcome({ activatedTracks: ["gdc"] })) });
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898-GDC-02/claim-hub");
    await screen.findByRole("heading", { name: /claim summary/i });
    await runExecution(user);
    expect((await screen.findByRole("status")).textContent).toMatch(/gdc component activated/i);
  });

  it("activates both tracks for a combined completion", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/general");
    await runExecution(user);
    expect((await screen.findByRole("status")).textContent).toMatch(/absence and gdc components activated/i);
  });

  it("shows the case-not-found escalation terminal", async () => {
    stubApi({ execute: ok(anOutcome({ status: "ESCALATED_CASE_NOT_FOUND", activatedTracks: [] })) });
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/general");
    await runExecution(user);
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not be found/i);
  });

  it("shows the ineligible-intake escalation terminal", async () => {
    stubApi({ execute: ok(anOutcome({ status: "ESCALATED_INELIGIBLE_INTAKE", activatedTracks: [] })) });
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/general");
    await runExecution(user);
    expect((await screen.findByRole("alert")).textContent).toMatch(/not eligible/i);
  });

  it("shows the conditions-not-met escalation terminal", async () => {
    stubApi({ execute: ok(anOutcome({ status: "ESCALATED_CONDITIONS_NOT_MET", activatedTracks: [] })) });
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/general");
    await runExecution(user);
    expect((await screen.findByRole("alert")).textContent).toMatch(/condition details are missing/i);
  });
});

describe("Case execution failures", () => {
  it("shows a missing diagnosis error", async () => {
    stubApi({ execute: err("missing_diagnosis_code", "A diagnosis code must be resolved.") });
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/general");
    await runExecution(user);
    expect((await screen.findByRole("alert")).textContent).toMatch(/diagnosis code must be resolved/i);
  });

  it("shows a terminal rerun error", async () => {
    stubApi({ execute: err("case_already_terminal", "Case already reached a terminal run.") });
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/general");
    await runExecution(user);
    expect((await screen.findByRole("alert")).textContent).toMatch(/already reached a terminal run/i);
  });

  it("shows an execution-in-progress error", async () => {
    stubApi({ execute: err("execution_in_progress", "Case already has an execution run in flight.") });
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/general");
    await runExecution(user);
    expect((await screen.findByRole("alert")).textContent).toMatch(/run in flight/i);
  });

  it("shows a request validation error", async () => {
    stubApi({ execute: err("invalid_request", "Provider decision is invalid.") });
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898/general");
    await runExecution(user);
    expect((await screen.findByRole("alert")).textContent).toMatch(/provider decision is invalid/i);
  });
});

describe("Absence condition details", () => {
  it("reveals explicit condition details from the Leave Details tab", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898-ABS-01/leave-details");
    await screen.findByRole("heading", { name: /^leave details$/i });
    await user.click(screen.getByRole("button", { name: /^condition$/i }));
    expect(screen.getByText(/condition description/i)).toBeTruthy();
  });

  it("renders the captured Employment Details route state", async () => {
    renderAt("/cases/NTN-159898-ABS-01/employment-details");
    expect(await screen.findByRole("heading", { name: /employment details/i })).toBeTruthy();
    expect(screen.getByText(/acedex main master plan/i)).toBeTruthy();
    expect(screen.getByDisplayValue(/test engineer/i)).toBeTruthy();
    expect(screen.getByDisplayValue("06/01/2015")).toBeTruthy();
  });

  it("derives generated Leave dates and employment from submitted sections", async () => {
    const user = userEvent.setup();
    stubApi({ details: ok(generatedLeaveDetails()) });
    renderAt("/cases/NTN-900001-ABS-01/leave-details");
    expect(await screen.findByText(/03\/02\/2026 through 03\/08\/2026/i)).toBeTruthy();
    expect(screen.queryByText(/01\/08\/2026 through 03\/09\/2026/i)).toBeNull();
    await user.click(screen.getByRole("link", { name: /employment information/i }));
    expect(await screen.findByDisplayValue("Warehouse Associate")).toBeTruthy();
    expect(screen.getByDisplayValue("03/10/2024")).toBeTruthy();
  });
});

describe("Diagnosis type-ahead", () => {
  it("shows the seeded diagnosis and adds a code chosen from the type-ahead", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898-GDC-02/medical");
    expect(await screen.findByRole("cell", { name: "O80" })).toBeTruthy();
    await user.type(screen.getByLabelText(/diagnosis code or description/i), "knee");
    await user.click(await screen.findByRole("button", { name: /Z96\.652 - Presence of left artificial knee joint/i }));
    expect(await screen.findByRole("cell", { name: "Z96.652" })).toBeTruthy();
  });

  it("links to the deterministic ICD-10 lookup", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898-GDC-02/medical");
    await user.click(await screen.findByRole("link", { name: /look up icd-10 code/i }));
    expect(await screen.findByRole("heading", { name: /getanswer/i })).toBeTruthy();
  });

  it("describes a saved knee diagnosis from the shared code mapping", async () => {
    stubApi({ details: ok(aDetails({
      gdc: {
        id: "NTN-159898-GDC-02", providerPartyId: "PTY-TRAVIS",
        diagnosisCode: "M25.561", status: "OPEN",
      },
    })) });
    renderAt("/cases/NTN-159898-GDC-02/claim-hub");
    expect(await screen.findByText(/M25\.561: Pain in right knee/i)).toBeTruthy();
    expect(screen.queryByText(/full-term uncomplicated delivery/i)).toBeNull();
  });
});

describe("Generated GDC details", () => {
  it("derives incident and treatment dates from submitted sections", async () => {
    stubApi({ details: ok(generatedGdcDetails()) });
    renderAt("/cases/NTN-900001-GDC-02/claim-hub");
    expect(await screen.findByText("03/03/2026")).toBeTruthy();
    expect(screen.getByText("03/06/2026")).toBeTruthy();
    expect(screen.getByText("Knee recovery")).toBeTruthy();
    expect(screen.queryByText("01/07/2026")).toBeNull();
  });
});

describe("Medical provider flow", () => {
  it("initializes the provider decision from the persisted provider", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898-GDC-02/medical");
    expect((await screen.findAllByText(/^travis larson$/i)).length).toBeGreaterThan(0);
    await runExecution(user);
    expect(executionRequest()).toMatchObject({
      providerDecision: { kind: "attach", providerPartyId: "PTY-TRAVIS" },
    });
  });

  it("attaches Travis Larson through the read-only provider details", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898-GDC-02/medical");
    await user.click(await screen.findByRole("button", { name: /add medical provider/i }));
    const dialog = screen.getByRole("dialog", { name: /choose the party/i });
    await user.click(within(dialog).getByRole("button", { name: /^search$/i }));
    await user.click(within(dialog).getByRole("button", { name: "Travis Larson" }));
    expect(within(dialog).getByText(/read-only mode/i)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: /^attach$/i }));
    expect(await screen.findAllByText(/travis larson/i)).toBeTruthy();
  });

  it("creates a provider through Add Person", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898-GDC-02/medical");
    await user.click(await screen.findByRole("button", { name: /add medical provider/i }));
    const dialog = screen.getByRole("dialog", { name: /choose the party/i });
    await user.click(within(dialog).getByRole("button", { name: /add person/i }));
    await user.type(within(dialog).getByLabelText(/first name/i), "Jane");
    await user.type(within(dialog).getByLabelText(/last name/i), "Doe");
    await user.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    expect(await screen.findByText(/jane doe/i)).toBeTruthy();
  });

  it("records skipping the provider when no provider is attached", async () => {
    const user = userEvent.setup();
    renderAt("/cases/NTN-159898-GDC-02/medical");
    await user.click(await screen.findByRole("button", { name: /skip provider/i }));
    expect(screen.getByText(/no medical provider will be attached/i)).toBeTruthy();
    await runExecution(user);
    expect(executionRequest()).toMatchObject({ providerDecision: { kind: "skip" } });
  });
});

describe("Case workflow lifecycle", () => {
  it("resets diagnosis, provider, and outcome when the root case changes", async () => {
    const user = userEvent.setup();
    stubCaseSwitchApi();
    renderWithCaseSwitch();
    await user.type(await screen.findByLabelText(/diagnosis code or description/i), "left");
    await user.click(await screen.findByRole("button", { name: /Z96\.652/i }));
    await runExecution(user);
    expect(await screen.findByText(/case execution completed/i)).toBeTruthy();
    await user.click(screen.getByRole("link", { name: /open next case/i }));
    expect(await screen.findByRole("heading", { name: /NTN-900001-GDC-02/i })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "M25.561" })).toBeTruthy();
    expect(screen.queryByRole("cell", { name: "Z96.652" })).toBeNull();
    expect(screen.queryByText(/case execution completed/i)).toBeNull();
  });

  it("refreshes diagnosis and provider panels immediately after execution", async () => {
    const user = userEvent.setup();
    stubRefreshApi();
    renderAt("/cases/NTN-159898-GDC-02/medical");
    expect(await screen.findByRole("cell", { name: "O80" })).toBeTruthy();
    await runExecution(user);
    expect(await screen.findByRole("cell", { name: "M25.561" })).toBeTruthy();
    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0);
    expect(screen.queryByRole("cell", { name: "O80" })).toBeNull();
  });
});

describe("Lookup pages", () => {
  it("renders the uKnow GetAnswer resources", async () => {
    renderAt("/lookups/uknow");
    expect(await screen.findByRole("heading", { name: /getanswer/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /icd codes: reference sheet/i })).toHaveProperty(
      "href", expect.stringContaining("/lookups/icd-reference"),
    );
  });

  it("renders the Google knee-surgery ICD overview", async () => {
    renderAt("/lookups/google");
    expect(await screen.findByRole("heading", { name: /ai overview/i })).toBeTruthy();
    expect(screen.getByText(/Z96\.651/)).toBeTruthy();
  });

  it("renders the common ICD-10 codes chart", async () => {
    renderAt("/lookups/icd-chart");
    expect(await screen.findByRole("heading", { name: /common icd-10 codes chart/i })).toBeTruthy();
    expect(screen.getByText(/annual physical/i)).toBeTruthy();
  });
});

describe("Missing case", () => {
  it("shows a not-found state when the case does not exist", async () => {
    stubApi({ details: err("case_not_found", "Case NTN-999999 was not found.") });
    renderAt("/cases/NTN-999999/documents");
    expect(await screen.findByText(/was not found/i)).toBeTruthy();
  });
});
