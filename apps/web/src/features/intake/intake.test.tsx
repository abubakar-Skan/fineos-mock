// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../../app/router";

const ok = (value: unknown) => ({ ok: true, value });

interface Stub {
  section?: unknown;
  submit?: unknown;
  provider?: unknown;
}

const BOTH_CASES = { notificationId: "NTN-165775", absenceCaseId: "NTN-165775-ABS-01", gdcCaseId: "NTN-165775-GDC-02" };
const JANE_PROVIDER = {
  id: "PTY-PROVIDER-0001",
  customerNumber: null,
  fullName: "Jane Doe",
  partyType: "medical_provider",
  dateOfBirth: null,
  employer: null,
  phone: null,
  email: null,
};

const stubApi = (stub: Stub = {}) => {
  vi.stubGlobal("fetch", vi.fn((input: string) => resolve(input, stub)));
};

const resolve = (input: string, stub: Stub) =>
  Promise.resolve({ json: async () => bodyFor(input, stub) } as Response);

const bodyFor = (input: string, stub: Stub) => {
  if (input.includes("/providers")) return stub.provider ?? ok(JANE_PROVIDER);
  if (input.includes("/submit")) return stub.submit ?? ok(BOTH_CASES);
  if (input.includes("/sections/")) return stub.section ?? ok({ saved: true });
  return ok(null);
};

const DRAFT = "NTN-165775";
const stepPath = (slug: string) => `/notifications/${DRAFT}/intake/${slug}`;

const renderStep = (slug: string) =>
  render(<MemoryRouter initialEntries={[stepPath(slug)]}><AppRoutes /></MemoryRouter>);

const renderStepWithBack = (slug: string) =>
  render(<MemoryRouter initialEntries={["/dashboard", stepPath(slug)]} initialIndex={1}><AppRoutes /></MemoryRouter>);

const clickNext = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getAllByRole("button", { name: /^(next|finish)$/i }).at(-1)!);

const clickPrevious = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getAllByRole("button", { name: /^previous$/i }).at(-1)!);

const processNav = () => screen.getByRole("navigation", { name: /process steps/i });

const expandRequestOptions = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("radio", { name: /accident or treatment required/i }));

beforeEach(() => {
  sessionStorage.clear();
  stubApi();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Intake wizard stages", () => {
  it("renders Notification Details as the first stage with its source and date fields", () => {
    renderStep("notification-details");
    expect(screen.getByRole("heading", { name: /notification details/i })).toBeTruthy();
    expect(screen.getByLabelText(/notification source/i)).toBeTruthy();
    expect(screen.getByLabelText(/notification date/i)).toBeTruthy();
  });

  it.each([
    ["notification-details", /notification details/i],
    ["member-occupation", /occupation details/i],
    ["notification-options", /type of request/i],
    ["reason-for-absence", /absence reason/i],
    ["dates-of-absence", /leave periods/i],
    ["work-absence-details", /work pattern/i],
    ["additional-absence-details", /hospitalization details/i],
    ["incident-details", /incident details/i],
    ["policy-details", /policy details/i],
    ["earnings-details", /earning details/i],
    ["medical-details", /medical provider/i],
  ])("renders a titled form for the %s stage", (slug, title) => {
    renderStep(slug);
    expect(screen.getAllByRole("heading", { name: title }).length).toBeGreaterThan(0);
  });
});

describe("Conditional Leave and GDC sections", () => {
  it("shows only the three common stages before a component is selected", () => {
    renderStep("notification-details");
    expect(within(processNav()).getByRole("button", { name: /notification options/i })).toBeTruthy();
    expect(within(processNav()).queryByRole("button", { name: /reason for absence/i })).toBeNull();
    expect(within(processNav()).queryByRole("button", { name: /incident details/i })).toBeNull();
  });

  it("reveals every leave and GDC stage when both components are requested", async () => {
    const user = userEvent.setup();
    renderStep("notification-options");
    await expandRequestOptions(user);
    await user.click(screen.getByRole("switch", { name: /request a leave/i }));
    await user.click(screen.getByRole("switch", { name: /group disability claim/i }));
    expect(within(processNav()).getByRole("button", { name: /reason for absence/i })).toBeTruthy();
    expect(within(processNav()).getByRole("button", { name: /medical details/i })).toBeTruthy();
  });

  it("keeps GDC stages hidden when only a leave is requested", async () => {
    const user = userEvent.setup();
    renderStep("notification-options");
    await expandRequestOptions(user);
    await user.click(screen.getByRole("switch", { name: /request a leave/i }));
    expect(within(processNav()).getByRole("button", { name: /dates of absence/i })).toBeTruthy();
    expect(within(processNav()).queryByRole("button", { name: /incident details/i })).toBeNull();
  });
});

describe("Wizard navigation controls", () => {
  it("advances to the next stage with Next and returns with Previous", async () => {
    const user = userEvent.setup();
    renderStep("notification-details");
    await clickNext(user);
    expect(await screen.findByRole("heading", { name: /occupation details/i })).toBeTruthy();
    await clickPrevious(user);
    expect(await screen.findByRole("heading", { name: /notification details/i })).toBeTruthy();
  });

  it("should reject advancing past Notification Options when no component is selected", async () => {
    const user = userEvent.setup();
    renderStep("notification-options");
    await clickNext(user);
    expect((await screen.findByRole("alert")).textContent).toMatch(/at least one/i);
    expect(screen.getByRole("heading", { name: /type of request/i })).toBeTruthy();
  });

  it("clears the current stage fields when Reset is used", async () => {
    const user = userEvent.setup();
    renderStep("member-occupation");
    const jobTitle = screen.getByLabelText(/job title/i);
    await user.clear(jobTitle);
    await user.type(jobTitle, "Analyst");
    await user.click(screen.getAllByRole("button", { name: /^reset$/i })[0]!);
    expect(screen.getByLabelText(/job title/i)).toHaveProperty("value", "");
  });

  it("leaves the wizard when Close is used", async () => {
    const user = userEvent.setup();
    renderStepWithBack("notification-details");
    await user.click(screen.getAllByRole("button", { name: /^close$/i })[0]!);
    expect(await screen.findByRole("heading", { name: /dashboard/i })).toBeTruthy();
  });
});

describe("Wizard controls and dropdowns", () => {
  it("associates each date label with its input", () => {
    renderStep("notification-details");
    const input = screen.getByLabelText(/notification date/i);
    const label = screen.getByText(/notification date/i);
    expect(label).toHaveProperty("htmlFor", input.id);
  });

  it("exposes the notification source dropdown options", () => {
    renderStep("notification-details");
    const source = screen.getByLabelText(/notification source/i);
    expect(within(source).getByRole("option", { name: "Email" })).toBeTruthy();
    expect(within(source).getByRole("option", { name: "Fax" })).toBeTruthy();
  });

  it("exposes the medical condition dropdown options", () => {
    renderStep("additional-absence-details");
    const condition = screen.getByLabelText(/describe your medical condition/i);
    expect(within(condition).getByRole("option", { name: "Cancer" })).toBeTruthy();
  });

  it("opens the February 2026 date picker and selects a day", async () => {
    const user = userEvent.setup();
    renderStep("notification-details");
    await user.click(screen.getByRole("button", { name: /open calendar/i }));
    expect(screen.getByText(/february 2026/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "18" }));
    expect(screen.getByLabelText(/notification date/i)).toHaveProperty("value", "02/18/2026");
  });
});

describe("Durable wizard state", () => {
  it("persists editable Notification Details and rehydrates them after remount", async () => {
    const user = userEvent.setup();
    const view = renderStep("notification-details");
    await user.selectOptions(screen.getByLabelText(/notification source/i), "Email");
    await user.clear(screen.getByLabelText(/notification date/i));
    await user.type(screen.getByLabelText(/notification date/i), "02/18/2026");
    await user.selectOptions(screen.getByLabelText(/notified by/i), "Employer");
    await clickNext(user);
    await screen.findByRole("heading", { name: /occupation details/i });
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/sections/notificationDetails"));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      source: "Email", notificationDate: "2026-02-18", notifiedBy: "Employer",
    });
    view.unmount();
    renderStep("notification-details");
    expect(screen.getByLabelText(/notification source/i)).toHaveProperty("value", "Email");
    expect(screen.getByLabelText(/notification date/i)).toHaveProperty("value", "02/18/2026");
  });

  it("rehydrates component scope when a saved draft opens on a deep link", async () => {
    const user = userEvent.setup();
    const view = renderStep("notification-options");
    await expandRequestOptions(user);
    await user.click(screen.getByRole("switch", { name: /request a leave/i }));
    await user.click(screen.getByRole("switch", { name: /group disability claim/i }));
    await clickNext(user);
    await screen.findByRole("heading", { name: /reason for absence/i });
    view.unmount();
    renderStep("medical-details");
    expect(within(processNav()).getByRole("button", { name: /reason for absence/i })).toBeTruthy();
    expect(within(processNav()).getByRole("button", { name: /medical details/i })).toBeTruthy();
  });

  it("saves the current section before process-sidebar navigation", async () => {
    const user = userEvent.setup();
    renderStep("member-occupation");
    await user.clear(screen.getByLabelText(/job title/i));
    await user.type(screen.getByLabelText(/job title/i), "Analyst");
    await user.click(within(processNav()).getByRole("button", { name: /notification details/i }));
    await screen.findByRole("heading", { name: /notification details/i });
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/sections/occupation"));
    expect(call?.[1]).toMatchObject({ method: "PUT", body: expect.stringContaining("Analyst") });
  });
});

describe("Absence period modal", () => {
  it("adds an absence period through the Add Absence Period modal", async () => {
    const user = userEvent.setup();
    renderStep("dates-of-absence");
    await user.click(screen.getByRole("button", { name: /add absence period/i }));
    const dialog = screen.getByRole("dialog", { name: /add absence period/i });
    await user.type(within(dialog).getByLabelText(/absence start date/i), "02/09/2026");
    await user.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    expect(await screen.findByText("02/09/2026")).toBeTruthy();
  });
});

describe("Authoritative step reset", () => {
  it("restores and persists valid Notification Details defaults", async () => {
    const user = userEvent.setup();
    renderStep("notification-details");
    await user.selectOptions(screen.getByLabelText(/notification source/i), "Email");
    await user.clear(screen.getByLabelText(/notification date/i));
    await user.type(screen.getByLabelText(/notification date/i), "02/18/2026");
    await user.click(screen.getAllByRole("button", { name: /^reset$/i })[0]!);
    expect(screen.getByLabelText(/notification source/i)).toHaveProperty("value", "Phone");
    expect(screen.getByLabelText(/notification date/i)).toHaveProperty("value", "02/13/2026");
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/sections/notificationDetails"));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ source: "Phone", notificationDate: "2026-02-13", notifiedBy: "Requester" });
  });

  it("clears component flags and conditional sections", async () => {
    const user = userEvent.setup();
    renderStep("notification-options");
    await expandRequestOptions(user);
    await user.click(screen.getByRole("switch", { name: /request a leave/i }));
    await user.click(screen.getByRole("switch", { name: /group disability claim/i }));
    await user.click(screen.getAllByRole("button", { name: /^reset$/i })[0]!);
    expect(screen.queryByRole("switch", { name: /request a leave/i })).toBeNull();
    expect(within(processNav()).queryByRole("button", { name: /medical details/i })).toBeNull();
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/sections/notificationOptions"));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      requestLeave: false, requestAccommodation: false, requestGdc: false,
    });
  });

  it("clears absence periods owned by Dates of Absence", async () => {
    const user = userEvent.setup();
    renderStep("dates-of-absence");
    await user.click(screen.getByRole("button", { name: /add absence period/i }));
    const dialog = screen.getByRole("dialog", { name: /add absence period/i });
    await user.type(within(dialog).getByLabelText(/absence start date/i), "02/09/2026");
    await user.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await user.click(screen.getAllByRole("button", { name: /^reset$/i })[0]!);
    expect(screen.getByText(/no absence periods added/i)).toBeTruthy();
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/sections/absencePeriods"));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ periods: [] });
  });

  it("clears the provider owned by Medical Details", async () => {
    const user = userEvent.setup();
    renderStep("medical-details");
    await user.click(screen.getByRole("button", { name: /add medical provider/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^search$/i }));
    await user.click(await screen.findByRole("button", { name: /travis larson/i }));
    await user.click(screen.getAllByRole("button", { name: /^reset$/i })[0]!);
    expect(screen.getByText(/no medical provider identified/i)).toBeTruthy();
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/sections/medicalDetails"));
    expect(JSON.parse(String(call?.[1]?.body))).not.toHaveProperty("providerPartyId");
  });
});

describe("Medical provider modal", () => {
  it("attaches Travis Larson through the provider search", async () => {
    const user = userEvent.setup();
    renderStep("medical-details");
    await user.click(screen.getByRole("button", { name: /add medical provider/i }));
    const dialog = screen.getByRole("dialog", { name: /choose the party/i });
    await user.click(within(dialog).getByRole("button", { name: /^search$/i }));
    await user.click(await within(dialog).findByRole("button", { name: /travis larson/i }));
    expect(await screen.findByText(/travis larson/i)).toBeTruthy();
  });

  it("creates and submits a real provider through Add Person", async () => {
    const user = userEvent.setup();
    renderStep("notification-options");
    await expandRequestOptions(user);
    await user.click(screen.getByRole("switch", { name: /group disability claim/i }));
    await user.click(within(processNav()).getByRole("button", { name: /medical details/i }));
    await screen.findByRole("heading", { name: /medical provider/i });
    await user.click(screen.getByRole("button", { name: /add medical provider/i }));
    const dialog = screen.getByRole("dialog", { name: /choose the party/i });
    await user.click(within(dialog).getByRole("button", { name: /add person/i }));
    await user.type(within(dialog).getByLabelText(/first name/i), "Jane");
    await user.type(within(dialog).getByLabelText(/last name/i), "Doe");
    await user.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    expect(await screen.findByText(/jane doe/i)).toBeTruthy();
    await clickNext(user);
    await screen.findByText(/notification submitted/i);
    const created = vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith("/providers"));
    const saved = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/sections/medicalDetails"));
    expect(created?.[1]).toMatchObject({ method: "POST", body: JSON.stringify({ firstName: "Jane", lastName: "Doe" }) });
    expect(saved?.[1]).toMatchObject({ method: "PUT" });
    expect(JSON.parse(String(saved?.[1]?.body))).toMatchObject({ providerPartyId: "PTY-PROVIDER-0001" });
  });
});

describe("Grouped section serialization", () => {
  it("serializes Work Pattern workState under its actual grouped key", async () => {
    const user = userEvent.setup();
    renderStep("work-absence-details");
    await user.selectOptions(screen.getByLabelText(/usa work state/i), "NY");
    await clickNext(user);
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/sections/workPattern"));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ workState: "NY" });
  });

  it("derives conditionDescription from Additional Absence details", async () => {
    const user = userEvent.setup();
    renderStep("additional-absence-details");
    await user.selectOptions(screen.getByLabelText(/describe your medical condition/i), "Digestive");
    await user.type(screen.getByLabelText(/additional detail/i), "Post-surgical recovery");
    await clickNext(user);
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/sections/absenceDetails"));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ conditionDescription: "Post-surgical recovery" });
  });

  it("serializes canonical diagnosis and provider from Medical Details", async () => {
    const user = userEvent.setup();
    renderStep("notification-options");
    await expandRequestOptions(user);
    await user.click(screen.getByRole("switch", { name: /group disability claim/i }));
    await user.click(within(processNav()).getByRole("button", { name: /medical details/i }));
    await user.selectOptions(screen.getByLabelText(/diagnosis code or description/i), "O80 - Encounter for full-term uncomplicated delivery");
    await user.click(screen.getByRole("button", { name: /add medical provider/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^search$/i }));
    await user.click(await screen.findByRole("button", { name: /travis larson/i }));
    await clickNext(user);
    const call = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes("/sections/medicalDetails"));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ diagnosisCode: "O80", providerPartyId: "PTY-TRAVIS" });
  });
});

describe("Reference-only intake panels", () => {
  it("shows the captured member address and contact details", () => {
    renderStep("member-occupation");
    expect(screen.getByRole("heading", { name: /member address & contact details/i })).toBeTruthy();
    expect(screen.getByText(/170 main street/i)).toBeTruthy();
    expect(screen.getByText(/erica_alexander/i)).toBeTruthy();
  });

  it("expands request sub-options after a request type is selected", async () => {
    const user = userEvent.setup();
    renderStep("notification-options");
    expect(screen.queryByRole("switch", { name: /request a leave/i })).toBeNull();
    await expandRequestOptions(user);
    expect(screen.getByRole("switch", { name: /request a leave/i })).toBeTruthy();
  });

  it("shows the captured work-schedule grid", () => {
    renderStep("work-absence-details");
    expect(screen.getByRole("heading", { name: /^work schedule$/i })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /pattern start date/i })).toBeTruthy();
    expect(screen.getByText("01/05/2026")).toBeTruthy();
  });

  it("shows Claim Employment Details", () => {
    renderStep("incident-details");
    expect(screen.getByRole("heading", { name: /claim employment details/i })).toBeTruthy();
    expect(screen.getByLabelText(/salary continuance number of days/i)).toBeTruthy();
  });
});

describe("Section persistence and submission", () => {
  it("persists the occupation section through the save API when advancing", async () => {
    const user = userEvent.setup();
    renderStep("member-occupation");
    await clickNext(user);
    await screen.findByRole("heading", { name: /type of request/i });
    const [url, options] = vi.mocked(fetch).mock.calls.at(-1)!;
    expect(String(url)).toContain("/sections/occupation");
    expect((options as RequestInit).method).toBe("PUT");
  });

  it("shows the generated confirmation references after submission", async () => {
    render(<MemoryRouter initialEntries={[`/notifications/${DRAFT}/confirmation`]}><AppRoutes /></MemoryRouter>);
    expect((await screen.findAllByText(/NTN-165775-ABS-01/)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/NTN-165775-GDC-02/)).length).toBeGreaterThan(0);
  });

  it("shows only the absence reference for a leave-only submission", async () => {
    stubApi({ submit: ok({ notificationId: DRAFT, absenceCaseId: "NTN-165775-ABS-01", gdcCaseId: null }) });
    render(<MemoryRouter initialEntries={[`/notifications/${DRAFT}/confirmation`]}><AppRoutes /></MemoryRouter>);
    expect((await screen.findAllByText(/NTN-165775-ABS-01/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/NTN-165775-GDC-02/)).toBeNull();
  });
});
