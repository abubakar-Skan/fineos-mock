import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  intakeFieldKey,
  serializeIntakeSection,
  type IntakeDraftSnapshot,
  type IntakeStepSlug,
} from "@fineos/contracts";
import { buildApp } from "../src/app";
import { resetDatabase } from "../src/infrastructure/database";
import { seedDatabase } from "../src/infrastructure/seed";

type Db = Database.Database;

let app: FastifyInstance;
let db: Db;

beforeEach(() => {
  db = resetDatabase(":memory:");
  seedDatabase(db);
  app = buildApp(db);
});

afterEach(async () => {
  await app.close();
  db.close();
});

const aBrowserIntake = (): IntakeDraftSnapshot => ({
  fields: {
    [intakeFieldKey("notification-details", "source")]: "Phone",
    [intakeFieldKey("notification-details", "notificationDate")]: "02/13/2026",
    [intakeFieldKey("notification-details", "notifiedBy")]: "Requester",
    [intakeFieldKey("reason-for-absence", "absenceReason")]: "Serious Health Condition",
    [intakeFieldKey("work-absence-details", "workState")]: "DE",
    [intakeFieldKey("additional-absence-details", "medicalCondition")]: "Digestive",
    [intakeFieldKey("additional-absence-details", "additionalDetail")]: "Post-surgical recovery",
    [intakeFieldKey("medical-details", "diagnosisCode")]: "O80 - Encounter for full-term uncomplicated delivery",
  },
  flags: { requestLeave: true, requestAccommodation: false, requestGdc: true },
  periods: [{ lastDayWorked: "02/08/2026", startDate: "02/09/2026", endDate: "02/16/2026" }],
  provider: { id: "PTY-TRAVIS", name: "Travis Larson" },
});

const save = (
  draftId: string,
  key: string,
  slug: IntakeStepSlug,
  draft: IntakeDraftSnapshot,
) => app.inject({
  method: "PUT",
  url: `/api/notifications/${draftId}/sections/${key}`,
  payload: serializeIntakeSection(draft, slug),
});

describe("Browser intake lifecycle", () => {
  it("should complete execution from the browser's grouped section payloads", async () => {
    const draft = aBrowserIntake();
    const created = await app.inject({
      method: "POST", url: "/api/parties/PTY-80937/notifications",
      payload: { source: "Phone", notificationDate: "2026-02-13" },
    });
    const draftId = created.json().value.draftId as string;
    await save(draftId, "notificationDetails", "notification-details", draft);
    await save(draftId, "notificationOptions", "notification-options", draft);
    await save(draftId, "leaveReason", "reason-for-absence", draft);
    await save(draftId, "absencePeriods", "dates-of-absence", draft);
    await save(draftId, "workPattern", "work-absence-details", draft);
    await save(draftId, "absenceDetails", "additional-absence-details", draft);
    await save(draftId, "medicalDetails", "medical-details", draft);
    const submitted = await app.inject({ method: "POST", url: `/api/notifications/${draftId}/submit`, payload: {} });
    const searched = await app.inject({ method: "GET", url: `/api/cases/search?term=${draftId}` });
    const details = await app.inject({ method: "GET", url: `/api/cases/${draftId}` });
    const executed = await app.inject({ method: "POST", url: `/api/cases/${draftId}/execute`, payload: {} });
    expect(submitted.json().value).toMatchObject({
      absenceCaseId: `${draftId}-ABS-01`, gdcCaseId: `${draftId}-GDC-02`,
    });
    expect(searched.json().value[0]).toMatchObject({ caseId: draftId, status: "SUBMITTED" });
    expect(details.json().value).toMatchObject({
      absence: {
        workState: "DE", conditionDescription: "Post-surgical recovery",
        periods: [{ startDate: "2026-02-09", endDate: "2026-02-16" }],
      },
      gdc: { diagnosisCode: "O80", providerPartyId: "PTY-TRAVIS" },
    });
    expect(executed.json()).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
  });
});
