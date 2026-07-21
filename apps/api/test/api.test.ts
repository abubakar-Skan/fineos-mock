import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { toCaseId } from "@fineos/contracts";
import { resetDatabase, resetSeededDatabase } from "../src/infrastructure/database";
import { seedDatabase } from "../src/infrastructure/seed";
import { createCaseRepository } from "../src/infrastructure/repositories";
import { buildApp } from "../src/app";

type Db = Database.Database;

let db: Db;
let app: FastifyInstance;

const VALID_PASSWORD = "fineos";

beforeEach(() => {
  db = resetDatabase(":memory:");
  seedDatabase(db);
  // Orchestration branch coverage lives here, so the shared app opts into the
  // code-enabled automation shortcuts. Default agent-first behavior (routes
  // absent → 404) is asserted separately in "Agent-first defaults".
  app = buildApp(db, { automationShortcutsEnabled: true });
});

afterEach(async () => {
  await app.close();
  db.close();
});

const post = (url: string, payload: unknown) =>
  app.inject({ method: "POST", url, payload });
const put = (url: string, payload: unknown) =>
  app.inject({ method: "PUT", url, payload });
const patch = (url: string, payload: unknown) =>
  app.inject({ method: "PATCH", url, payload });
const get = (url: string) => app.inject({ method: "GET", url });

const aDraftRequest = () => ({
  source: "Phone",
  notificationDate: "2026-03-01",
});

const aProviderRequest = () => ({
  firstName: "Jane",
  lastName: "Doe",
});

const createDraft = async () => {
  const res = await post("/api/parties/PTY-80937/notifications", aDraftRequest());
  return res.json().value.draftId as string;
};

const selectLeave = (draftId: string) =>
  put(`/api/notifications/${draftId}/sections/notificationOptions`, {
    requestLeave: true,
    requestAccommodation: false,
    requestGdc: false,
  });

const createLeaveDraft = async () => {
  const draftId = await createDraft();
  await selectLeave(draftId);
  return draftId;
};

const SECTION_FIXTURES = [
  ["notificationDetails", { source: "Email", notificationDate: "2026-02-18", notifiedBy: "Employer" }],
  ["notificationOptions", { requestLeave: true, requestAccommodation: false, requestGdc: false }],
  ["occupation", { title: "Analyst" }],
  ["absenceDetails", { workState: "DE" }],
  ["absencePeriods", { periods: [{ lastDayWorked: "2026-03-01", startDate: "2026-03-02", endDate: "2026-03-08" }] }],
  ["leaveReason", { leaveReason: "serious_health_condition", conditionDescription: "Recovery" }],
  ["workPattern", { schedule: "Monday-Friday" }],
  ["concurrentLeave", { hasConcurrentLeave: false }],
  ["gdcDetails", { claimType: "STD" }],
  ["medicalProvider", { providerPartyId: "PTY-TRAVIS" }],
  ["diagnosis", { diagnosisCode: "O80" }],
  ["payment", { method: "check" }],
  ["contact", { preferred: "email" }],
  ["documents", { received: ["certificate"] }],
  ["review", { confirmed: true }],
] as const;

describe("Session boundary", () => {
  it("should create a session when the credentials are valid", async () => {
    const res = await post("/api/session", { username: "agent", password: VALID_PASSWORD });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, value: { username: "agent" } });
  });

  it("should reject sign in when the password is wrong", async () => {
    const res = await post("/api/session", { username: "agent", password: "nope" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ ok: false, error: "invalid_credentials" });
  });

  it("should reject sign in when the request body is malformed", async () => {
    const res = await post("/api/session", { username: "" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ ok: false, error: "invalid_request" });
  });
});

describe("Test reset boundary", () => {
  it("should not expose database reset outside test mode", async () => {
    const res = await post("/api/test/reset", {});
    expect(res.statusCode).toBe(404);
  });

  it("should restore deterministic seed data when test mode is enabled", async () => {
    await app.close();
    app = buildApp(db, { resetTestData: () => resetSeededDatabase(db) });
    await createDraft();
    const reset = await post("/api/test/reset", {});
    const created = await createDraft();
    expect(reset.json()).toEqual({ ok: true, value: { reset: true } });
    expect(created).toBe("NTN-900001");
  });
});

describe("Party boundary", () => {
  it("should persist a newly created medical provider", async () => {
    const created = await post("/api/providers", aProviderRequest());
    const providerId = created.json().value.id as string;
    const found = await get(`/api/parties/${providerId}`);
    expect(created.statusCode).toBe(201);
    expect(found.json()).toMatchObject({
      ok: true,
      value: { fullName: "Jane Doe", partyType: "medical_provider" },
    });
  });

  it("should reject a medical provider without a last name", async () => {
    const res = await post("/api/providers", { firstName: "Jane", lastName: "" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ ok: false, error: "invalid_request" });
  });

  it("should return matching parties when searching by name", async () => {
    const res = await get("/api/parties/search?term=Erica");
    expect(res.statusCode).toBe(200);
    expect(res.json().value[0]).toMatchObject({ fullName: "Erica Alexander" });
  });

  it("should return a party when the id exists", async () => {
    const res = await get("/api/parties/PTY-80937");
    expect(res.json()).toMatchObject({ ok: true, value: { fullName: "Erica Alexander" } });
  });

  it("should report not found when the party id is unknown", async () => {
    const res = await get("/api/parties/PTY-000");
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ ok: false, error: "party_not_found" });
  });

  it("should update contact details when the party exists", async () => {
    const res = await patch("/api/parties/PTY-80937/contact", {
      phone: "555-0100",
      email: "erica@example.com",
    });
    expect(res.json()).toMatchObject({ ok: true, value: { phone: "555-0100" } });
  });

  it("should report not found when updating contact for an unknown party", async () => {
    const res = await patch("/api/parties/PTY-000/contact", { phone: "555-0100" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ ok: false, error: "party_not_found" });
  });
});

describe("Notification boundary", () => {
  it("should submit a GDC with a newly created medical provider", async () => {
    const provider = await post("/api/providers", aProviderRequest());
    const providerId = provider.json().value.id as string;
    const draftId = await createDraft();
    await put(`/api/notifications/${draftId}/sections/notificationOptions`, {
      requestLeave: false, requestAccommodation: false, requestGdc: true,
    });
    await put(`/api/notifications/${draftId}/sections/medicalProvider`, { providerPartyId: providerId });
    await post(`/api/notifications/${draftId}/submit`, {});
    const details = await get(`/api/cases/${draftId}`);
    expect(details.json().value.gdc.providerPartyId).toBe(providerId);
  });

  it("should create an unselected draft before notification options are known", async () => {
    const res = await post("/api/parties/PTY-80937/notifications", aDraftRequest());
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      ok: true,
      value: { draftId: "NTN-900001", scope: { kind: "unselected" } },
    });
  });

  it("should require a component scope when an unselected draft is submitted", async () => {
    const draftId = await createDraft();
    const res = await post(`/api/notifications/${draftId}/submit`, {});
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ ok: false, error: "component_scope_required" });
  });

  it("should report party not found when creating a draft for an unknown party", async () => {
    const res = await post("/api/parties/PTY-000/notifications", aDraftRequest());
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ ok: false, error: "party_not_found" });
  });

  it("should reject a malformed notification date before creating a draft", async () => {
    const rejected = await post("/api/parties/PTY-80937/notifications", {
      source: "Phone", notificationDate: "2026-02-30",
    });
    const accepted = await post("/api/parties/PTY-80937/notifications", aDraftRequest());
    expect(rejected.statusCode).toBe(422);
    expect(rejected.json()).toMatchObject({ ok: false, error: "invalid_date" });
    expect(accepted.json()).toMatchObject({ value: { draftId: "NTN-900001" } });
  });

  it("should save a known section for a draft", async () => {
    const draftId = await createDraft();
    const res = await put(`/api/notifications/${draftId}/sections/occupation`, { title: "Analyst" });
    expect(res.json()).toMatchObject({ ok: true, value: { saved: true } });
  });

  it("should update persisted Notification Details instead of keeping cosmetic defaults", async () => {
    const draftId = await createDraft();
    await put(`/api/notifications/${draftId}/sections/notificationDetails`, {
      source: "Email", notificationDate: "2026-02-18", notifiedBy: "Employer",
    });
    const details = await get(`/api/cases/${draftId}`);
    expect(details.json().value.notification).toMatchObject({
      source: "Email", notificationDate: "2026-02-18",
    });
  });

  it("should widen the scope when the notification-options section is saved", async () => {
    const draftId = await createDraft();
    await put(`/api/notifications/${draftId}/sections/notificationOptions`, {
      requestLeave: true,
      requestAccommodation: false,
      requestGdc: true,
    });
    const submitted = await post(`/api/notifications/${draftId}/submit`, {});
    expect(submitted.json().value.gdcCaseId).toBe(`${draftId}-GDC-02`);
  });

  it("should reset a selected component scope to unselected", async () => {
    const draftId = await createLeaveDraft();
    const reset = await put(`/api/notifications/${draftId}/sections/notificationOptions`, {
      requestLeave: false, requestAccommodation: false, requestGdc: false,
    });
    const submitted = await post(`/api/notifications/${draftId}/submit`, {});
    expect(reset.json()).toMatchObject({ ok: true });
    expect(submitted.json()).toMatchObject({ ok: false, error: "component_scope_required" });
  });

  it("should reject an unknown section key", async () => {
    const draftId = await createDraft();
    const res = await put(`/api/notifications/${draftId}/sections/nonsense`, {});
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ ok: false, error: "unknown_section" });
  });

  it("should reject an invalid notification-options section body", async () => {
    const draftId = await createDraft();
    const res = await put(`/api/notifications/${draftId}/sections/notificationOptions`, { requestLeave: "yes" });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ ok: false, error: "invalid_section" });
  });

  it("should reject a malformed absence period date without saving the section", async () => {
    const draftId = await createDraft();
    const res = await put(`/api/notifications/${draftId}/sections/absencePeriods`, {
      periods: [{ lastDayWorked: "bad", startDate: "2026-03-02", endDate: "2026-03-08" }],
    });
    const details = await get(`/api/cases/${draftId}`);
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ ok: false, error: "invalid_date" });
    expect(details.json().value.notification.sections).not.toHaveProperty("absencePeriods");
  });

  it("should reject an end-before-start absence period without saving the section", async () => {
    const draftId = await createDraft();
    const res = await put(`/api/notifications/${draftId}/sections/absencePeriods`, {
      periods: [{ lastDayWorked: "2026-03-01", startDate: "2026-03-08", endDate: "2026-03-02" }],
    });
    const details = await get(`/api/cases/${draftId}`);
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ ok: false, error: "invalid_date_range" });
    expect(details.json().value.notification.sections).not.toHaveProperty("absencePeriods");
  });

  it("should reject an unknown medical provider without saving the section", async () => {
    const draftId = await createDraft();
    const res = await put(`/api/notifications/${draftId}/sections/medicalProvider`, {
      providerPartyId: "PTY-UNKNOWN",
    });
    const details = await get(`/api/cases/${draftId}`);
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ ok: false, error: "provider_not_found" });
    expect(details.json().value.notification.sections).not.toHaveProperty("medicalProvider");
  });

  it("should reject an insured party used as a medical provider", async () => {
    const draftId = await createDraft();
    const res = await put(`/api/notifications/${draftId}/sections/medicalProvider`, {
      providerPartyId: "PTY-80937",
    });
    const details = await get(`/api/cases/${draftId}`);
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ ok: false, error: "invalid_provider_type" });
    expect(details.json().value.notification.sections).not.toHaveProperty("medicalProvider");
  });

  it("should reject saving a section after submission", async () => {
    const draftId = await createLeaveDraft();
    await post(`/api/notifications/${draftId}/submit`, {});
    const res = await put(`/api/notifications/${draftId}/sections/occupation`, { title: "Analyst" });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ ok: false, error: "already_submitted" });
  });

  it("should submit a draft and return generated case references", async () => {
    const draftId = await createLeaveDraft();
    const res = await post(`/api/notifications/${draftId}/submit`, {});
    expect(res.json()).toMatchObject({
      ok: true,
      value: { absenceCaseId: `${draftId}-ABS-01`, gdcCaseId: null },
    });
  });

  it("should return the same references when a draft is submitted twice", async () => {
    const draftId = await createLeaveDraft();
    const first = await post(`/api/notifications/${draftId}/submit`, {});
    const second = await post(`/api/notifications/${draftId}/submit`, {});
    expect(second.json()).toEqual(first.json());
  });

  it("should report case not found when submitting an unknown draft", async () => {
    const res = await post("/api/notifications/NTN-000000/submit", {});
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ ok: false, error: "case_not_found" });
  });

  it.each(SECTION_FIXTURES)("should round-trip the %s section body", async (sectionKey, body) => {
    const draftId = await createDraft();
    await put(`/api/notifications/${draftId}/sections/${sectionKey}`, body);
    const res = await get(`/api/cases/${draftId}`);
    expect(res.json().value.notification.sections[sectionKey]).toEqual(body);
  });

  it("should populate submitted component cases from saved sections", async () => {
    const draftId = await createDraft();
    await put(`/api/notifications/${draftId}/sections/notificationOptions`, {
      requestLeave: true, requestAccommodation: false, requestGdc: true,
    });
    await put(`/api/notifications/${draftId}/sections/absenceDetails`, { workState: "DE" });
    await put(`/api/notifications/${draftId}/sections/leaveReason`, {
      leaveReason: "serious_health_condition", conditionDescription: "Post-surgical recovery",
    });
    await put(`/api/notifications/${draftId}/sections/absencePeriods`, {
      periods: [{ lastDayWorked: "2026-03-01", startDate: "2026-03-02", endDate: "2026-03-08" }],
    });
    await put(`/api/notifications/${draftId}/sections/diagnosis`, { diagnosisCode: "O80" });
    await put(`/api/notifications/${draftId}/sections/medicalProvider`, { providerPartyId: "PTY-TRAVIS" });
    await post(`/api/notifications/${draftId}/submit`, {});
    const details = await get(`/api/cases/${draftId}`);
    expect(details.json().value).toMatchObject({
      sections: {
        absenceDetails: { workState: "DE" },
        leaveReason: { conditionDescription: "Post-surgical recovery" },
      },
      absence: {
        leaveReason: "serious_health_condition",
        workState: "DE",
        conditionDescription: "Post-surgical recovery",
        periods: [{ startDate: "2026-03-02", endDate: "2026-03-08" }],
      },
      gdc: { diagnosisCode: "O80", providerPartyId: "PTY-TRAVIS" },
    });
  });

  it("should execute using values saved before submission", async () => {
    const draftId = await createDraft();
    await put(`/api/notifications/${draftId}/sections/notificationOptions`, {
      requestLeave: true, requestAccommodation: false, requestGdc: true,
    });
    await put(`/api/notifications/${draftId}/sections/leaveReason`, {
      leaveReason: "serious_health_condition", conditionDescription: "Recovery",
    });
    await put(`/api/notifications/${draftId}/sections/diagnosis`, { diagnosisCode: "O80" });
    await put(`/api/notifications/${draftId}/sections/medicalProvider`, { providerPartyId: "PTY-TRAVIS" });
    await post(`/api/notifications/${draftId}/submit`, {});
    const executed = await post(`/api/cases/${draftId}/execute`, {});
    expect(executed.json()).toMatchObject({
      ok: true,
      value: { status: "COMPLETED", providerUpdated: true },
    });
  });

  it("should clear a saved diagnosis when its section replacement omits it", async () => {
    const draftId = await createDraft();
    await put(`/api/notifications/${draftId}/sections/notificationOptions`, {
      requestLeave: false, requestAccommodation: false, requestGdc: true,
    });
    await put(`/api/notifications/${draftId}/sections/diagnosis`, { diagnosisCode: "O80" });
    await put(`/api/notifications/${draftId}/sections/diagnosis`, {});
    await post(`/api/notifications/${draftId}/submit`, {});
    const executed = await post(`/api/cases/${draftId}/execute`, {});
    expect(executed.statusCode).toBe(422);
    expect(executed.json()).toMatchObject({ ok: false, error: "missing_diagnosis_code" });
  });
});

describe("Case retrieval boundary", () => {
  it("should find a generated case when searching by number", async () => {
    const res = await get("/api/cases/search?term=165775");
    expect(res.json().value[0]).toMatchObject({ caseId: "NTN-165775" });
  });

  it("should return aggregated case details when the case exists", async () => {
    const res = await get("/api/cases/NTN-165775");
    expect(res.json()).toMatchObject({
      ok: true,
      value: {
        notification: { id: "NTN-165775" },
        absence: { id: "NTN-165775-ABS-01" },
        gdc: { id: "NTN-165775-GDC-02" },
        claimant: {
          fullName: "Erica Alexander",
          employer: "Fifth Third Bank National Association",
        },
        provider: null,
      },
    });
  });

  it("should return the seeded provider details with David Hunter's case", async () => {
    const res = await get("/api/cases/NTN-159898");
    expect(res.json().value).toMatchObject({
      claimant: { fullName: "David Hunter", employer: "ACEDEX" },
      provider: { id: "PTY-TRAVIS", fullName: "Travis Larson" },
    });
  });

  it("should report case not found for an unknown case", async () => {
    const res = await get("/api/cases/NTN-000000");
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ ok: false, error: "case_not_found" });
  });
});

describe("Search-fixture background cases", () => {
  const BACKGROUND_CASES = [
    ["NTN-162642", "Anthony Ellis", true, false],
    ["NTN-162641", "Anthony Ellis", true, false],
    ["NTN-160306", "Anthony Ellis", true, false],
    ["NTN-159901", "David Hunter", true, false],
    ["NTN-148123", "EDNA TIERTEST1", true, false],
    ["NTN-165773", "Zachary Alexander", true, true],
    ["NTN-165772", "Beth Alexander", true, true],
    ["NTN-165771", "Erica Alexander", false, true],
    ["NTN-165571", "Dustin Adams", true, false],
    ["NTN-165335", "David Hunter", false, false],
  ] as const;

  it.each(BACKGROUND_CASES)(
    "should resolve search result %s to a deterministic record for %s",
    async (caseId, party, hasAbsence, hasGdc) => {
      const res = await get(`/api/cases/${caseId}`);
      expect(res.statusCode).toBe(200);
      expect(res.json().value.notification.id).toBe(caseId);
      expect(res.json().value.claimant.fullName).toBe(party);
      expect(Boolean(res.json().value.absence)).toBe(hasAbsence);
      expect(Boolean(res.json().value.gdc)).toBe(hasGdc);
    },
  );

  it("should keep the Erica case-number search unambiguous after seeding sibling notifications", async () => {
    const res = await get("/api/cases/search?term=165775");
    expect(res.json().value).toHaveLength(1);
    expect(res.json().value[0]).toMatchObject({ caseId: "NTN-165775" });
  });
});

describe("Case execution boundary", () => {
  const executeDavid = (payload: unknown) => post("/api/cases/NTN-159898/execute", payload);

  it("should complete execution for a submitted both-track case", async () => {
    const res = await executeDavid({
      conditionDescription: "Post-surgical recovery",
      diagnosisCode: "O80",
      providerDecision: { kind: "attach", providerPartyId: "PTY-TRAVIS" },
    });
    expect(res.json()).toMatchObject({
      ok: true,
      value: { status: "COMPLETED", activatedTracks: ["absence", "gdc"], providerUpdated: true },
    });
  });

  it("should escalate as case not found when executing an unsubmitted draft", async () => {
    const draftId = await createDraft();
    const res = await post(`/api/cases/${draftId}/execute`, {});
    expect(res.json()).toMatchObject({ ok: true, value: { status: "ESCALATED_CASE_NOT_FOUND" } });
  });

  it("should escalate as conditions not met when a serious leave case lacks a condition", async () => {
    const res = await post("/api/cases/NTN-165775/execute", {});
    expect(res.json()).toMatchObject({ ok: true, value: { status: "ESCALATED_CONDITIONS_NOT_MET" } });
  });

  it("should escalate as ineligible intake when overridden", async () => {
    const res = await executeDavid({ override: "ESCALATED_INELIGIBLE_INTAKE" });
    expect(res.json()).toMatchObject({ ok: true, value: { status: "ESCALATED_INELIGIBLE_INTAKE" } });
  });

  it("should naturally escalate an accommodation-only persisted intake", async () => {
    const draftId = await createDraft();
    await put(`/api/notifications/${draftId}/sections/notificationOptions`, {
      requestLeave: false, requestAccommodation: true, requestGdc: false,
    });
    await post(`/api/notifications/${draftId}/submit`, {});
    const res = await post(`/api/cases/${draftId}/execute`, {});
    expect(res.json()).toMatchObject({
      ok: true,
      value: { status: "ESCALATED_INELIGIBLE_INTAKE" },
    });
  });

  it("should return a typed guardrail when a persisted gdc case has no diagnosis", async () => {
    const draftId = await createDraft();
    await put(`/api/notifications/${draftId}/sections/notificationOptions`, {
      requestLeave: false, requestAccommodation: false, requestGdc: true,
    });
    await post(`/api/notifications/${draftId}/submit`, {});
    const res = await post(`/api/cases/${draftId}/execute`, {});
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ ok: false, error: "missing_diagnosis_code" });
  });

  it("should reject an invalid decision override", async () => {
    const res = await executeDavid({ override: "NONSENSE" });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ ok: false, error: "invalid_decision_override" });
  });

  it("should not wedge execution after rejecting an unknown provider", async () => {
    const rejected = await executeDavid({
      conditionDescription: "Recovery", diagnosisCode: "O80",
      providerDecision: { kind: "attach", providerPartyId: "PTY-UNKNOWN" },
    });
    const run = createCaseRepository(db).findLatestRun(toCaseId("NTN-159898"));
    const accepted = await executeDavid({
      conditionDescription: "Recovery", diagnosisCode: "O80",
      providerDecision: { kind: "attach", providerPartyId: "PTY-TRAVIS" },
    });
    expect(rejected.statusCode).toBe(422);
    expect(rejected.json()).toMatchObject({ ok: false, error: "provider_not_found" });
    expect(run).toBeUndefined();
    expect(accepted.json()).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
  });

  it("should reject an insured party before starting execution", async () => {
    const res = await executeDavid({
      conditionDescription: "Recovery", diagnosisCode: "O80",
      providerDecision: { kind: "attach", providerPartyId: "PTY-80937" },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ ok: false, error: "invalid_provider_type" });
    expect(createCaseRepository(db).findLatestRun(toCaseId("NTN-159898"))).toBeUndefined();
  });

  it("should skip an existing provider for one execution run", async () => {
    const res = await executeDavid({
      diagnosisCode: "O80", providerDecision: { kind: "skip" },
    });
    expect(res.json()).toMatchObject({
      ok: true, value: { status: "COMPLETED", providerUpdated: false },
    });
    expect(createCaseRepository(db).findGdcCase(toCaseId("NTN-159898-GDC-02")))
      .toMatchObject({ providerPartyId: "PTY-TRAVIS" });
  });

  it("should report execution in progress when a run is already in flight", async () => {
    createCaseRepository(db).startExecution(toCaseId("NTN-159898"));
    const res = await executeDavid({ conditionDescription: "x", diagnosisCode: "O80" });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ ok: false, error: "execution_in_progress" });
  });

  it("should report case already terminal when re-executing a completed case", async () => {
    await executeDavid({ conditionDescription: "x", diagnosisCode: "O80" });
    const res = await executeDavid({ conditionDescription: "x", diagnosisCode: "O80" });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ ok: false, error: "case_already_terminal" });
  });

  it("should report case not found when executing an unknown case", async () => {
    const res = await post("/api/cases/NTN-000000/execute", {});
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ ok: false, error: "case_not_found" });
  });
});

describe("Agent-first defaults", () => {
  let agentApp: FastifyInstance;

  beforeEach(() => {
    agentApp = buildApp(db);
  });

  afterEach(async () => {
    await agentApp.close();
  });

  it("should not register the execute shortcut route by default", async () => {
    const res = await agentApp.inject({ method: "POST", url: "/api/cases/NTN-159898/execute", payload: {} });
    expect(res.statusCode).toBe(404);
  });

  it("should not register the execution-run shortcut route by default", async () => {
    const res = await agentApp.inject({ method: "GET", url: "/api/cases/NTN-159898/execution-runs/RUN-1" });
    expect(res.statusCode).toBe(404);
  });

  it("should keep manual case lookup available by default", async () => {
    const res = await agentApp.inject({ method: "GET", url: "/api/cases/NTN-159898" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, value: { notification: { id: "NTN-159898" } } });
  });

  it("should keep manual case search available by default", async () => {
    const res = await agentApp.inject({ method: "GET", url: "/api/cases/search?term=165775" });
    expect(res.statusCode).toBe(200);
    expect(res.json().value[0]).toMatchObject({ caseId: "NTN-165775" });
  });
});

describe("Execution run boundary", () => {
  it("should return an execution run after execution", async () => {
    const executed = await post("/api/cases/NTN-159898/execute", {
      conditionDescription: "x",
      diagnosisCode: "O80",
    });
    const runId = executed.json().value.runId as string;
    const res = await get(`/api/cases/NTN-159898/execution-runs/${runId}`);
    expect(res.json()).toMatchObject({ ok: true, value: { id: runId, status: "COMPLETED" } });
  });

  it("should report case not found for an unknown execution run", async () => {
    const res = await get("/api/cases/NTN-165775/execution-runs/RUN-999");
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ ok: false, error: "case_not_found" });
  });
});
