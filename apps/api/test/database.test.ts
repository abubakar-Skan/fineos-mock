import type Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { toCaseId, toPartyId, type CaseId, type Submission } from "@fineos/contracts";
import { resetDatabase } from "../src/infrastructure/database";
import { MISSING_CASE_ID, seedDatabase } from "../src/infrastructure/seed";
import {
  createCaseRepository,
  createNotificationRepository,
  createPartyRepository,
} from "../src/infrastructure/repositories";

type Db = Database.Database;

const aSeededDatabase = (): Db => {
  const db = resetDatabase(":memory:");
  seedDatabase(db);
  return db;
};

const aDraftRow = () => ({
  partyId: toPartyId("PTY-80937"),
  source: "Phone",
  notificationDate: "2026-03-01",
});

const aLeaveOnlyPlan = (): Submission => ({
  scope: "leave_only",
  createsAbsenceCase: true,
  createsGdcCase: false,
});

const selectLeave = (
  repo: ReturnType<typeof createNotificationRepository>,
  draftId: CaseId,
): void => repo.saveSection(draftId, {
  key: "notificationOptions",
  body: { requestLeave: true },
  scope: "leave_only",
  intakeType: "leave",
});

const unwrapRunId = (started: ReturnType<ReturnType<typeof createCaseRepository>["startExecution"]>): string => {
  if (!started.ok) throw new Error("Execution run should have started");
  return started.value.id;
};

const countAbsenceCases = (db: Db, notificationId: CaseId): number => {
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM absence_case WHERE notification_id = ?")
    .get(notificationId) as { c: number };
  return row.c;
};

const insertOrphanAbsenceCase = (db: Db): void => {
  db.prepare(
    "INSERT INTO absence_case(id, notification_id, employee_party_id) VALUES (?, ?, ?)",
  ).run("NTN-999999-ABS-01", "NTN-999999", "PTY-80937");
};

const insertInvalidPartyType = (db: Db): void => {
  db.prepare(
    "INSERT INTO party(id, full_name, party_type) VALUES (?, ?, ?)",
  ).run("PTY-BAD", "Nemo Nobody", "robot");
};

describe("SQLite persistence and seed fixtures", () => {
  it("should seed Erica Alexander's combined intake with both case tracks", () => {
    const db = aSeededDatabase();
    const notification = createNotificationRepository(db).findById(toCaseId("NTN-165775"));
    const absence = createCaseRepository(db).findAbsenceCase(toCaseId("NTN-165775-ABS-01"));
    const gdc = createCaseRepository(db).findGdcCase(toCaseId("NTN-165775-GDC-02"));
    expect([notification?.scope, absence?.id, gdc?.id]).toEqual([
      { kind: "selected", value: "leave_and_gdc" },
      "NTN-165775-ABS-01",
      "NTN-165775-GDC-02",
    ]);
  });

  it("should seed Erica Alexander's absence case with the captured leave dates", () => {
    const db = aSeededDatabase();
    const absence = createCaseRepository(db).findAbsenceCase(toCaseId("NTN-165775-ABS-01"));
    expect(absence).toMatchObject({
      workState: "DE",
      leaveReason: "serious_health_condition",
      periods: [{ lastDayWorked: "2026-02-08", startDate: "2026-02-09", endDate: "2026-02-16" }],
    });
  });

  it("should seed David Hunter's group disability claim with the O80 diagnosis and Travis Larson provider", () => {
    const db = aSeededDatabase();
    const gdc = createCaseRepository(db).findGdcCase(toCaseId("NTN-159898-GDC-02"));
    expect(gdc).toMatchObject({ diagnosisCode: "O80", providerPartyId: "PTY-TRAVIS" });
  });

  it("should seed David Hunter's captured knee condition description", () => {
    const db = aSeededDatabase();
    const absence = createCaseRepository(db).findAbsenceCase(toCaseId("NTN-159898-ABS-01"));
    expect(absence?.conditionDescription).toBe("Torn ligament in knee, injured from football game");
  });

  it("should seed David Hunter's captured contact details", () => {
    const db = aSeededDatabase();
    const david = createPartyRepository(db).findById(toPartyId("PTY-77569"));
    expect(david).toMatchObject({
      phone: "(207) 8182211",
      homePhone: "(207) 0012222",
      email: "david_hunter.aoa7wupt@mailosaur.io",
    });
  });

  it("should seed Travis Larson as a medical provider party", () => {
    const db = aSeededDatabase();
    const provider = createPartyRepository(db).findById(toPartyId("PTY-TRAVIS"));
    expect(provider).toMatchObject({ fullName: "Travis Larson", partyType: "medical_provider" });
  });

  it("should allocate distinct generated ids for consecutive notification drafts", () => {
    const db = aSeededDatabase();
    const repo = createNotificationRepository(db);
    const first = repo.createDraft(aDraftRow());
    const second = repo.createDraft(aDraftRow());
    expect([first, second]).toEqual(["NTN-900001", "NTN-900002"]);
  });

  it("should persist an unselected draft and round-trip its saved section", () => {
    const db = aSeededDatabase();
    const repo = createNotificationRepository(db);
    const draftId = repo.createDraft(aDraftRow());
    repo.saveSection(draftId, { key: "occupation", body: { title: "Analyst" } });
    expect(repo.findById(draftId)).toMatchObject({
      scope: { kind: "unselected" },
      sections: { occupation: { title: "Analyst" } },
    });
  });

  it("should return the same submission when a leave draft is submitted twice", () => {
    const db = aSeededDatabase();
    const repo = createNotificationRepository(db);
    const draftId = repo.createDraft(aDraftRow());
    selectLeave(repo, draftId);
    const first = repo.submit(draftId, aLeaveOnlyPlan());
    const second = repo.submit(draftId, aLeaveOnlyPlan());
    expect(second).toEqual(first);
  });

  it("should materialize exactly one absence case for a resubmitted leave draft", () => {
    const db = aSeededDatabase();
    const repo = createNotificationRepository(db);
    const draftId = repo.createDraft(aDraftRow());
    selectLeave(repo, draftId);
    repo.submit(draftId, aLeaveOnlyPlan());
    repo.submit(draftId, aLeaveOnlyPlan());
    expect(countAbsenceCases(db, draftId)).toBe(1);
  });

  it("should populate submitted cases from promoted draft fields", () => {
    const db = aSeededDatabase();
    const notifications = createNotificationRepository(db);
    const draftId = notifications.createDraft(aDraftRow());
    notifications.saveSection(draftId, {
      key: "notificationOptions",
      body: { requestLeave: true },
      scope: "leave_only",
      intakeType: "leave",
    });
    notifications.saveSection(draftId, {
      key: "leaveReason",
      body: { leaveReason: "serious_health_condition", conditionDescription: "Recovery" },
      leaveReason: "serious_health_condition",
      conditionDescription: "Recovery",
    });
    notifications.saveSection(draftId, {
      key: "absenceDetails",
      body: { workState: "DE" },
      workState: "DE",
    });
    notifications.saveSection(draftId, {
      key: "absencePeriods",
      body: { periods: ["captured"] },
      absencePeriods: [{
        lastDayWorked: "2026-03-01",
        startDate: "2026-03-02",
        endDate: "2026-03-08",
      }],
    });
    notifications.submit(draftId, aLeaveOnlyPlan());
    const absence = createCaseRepository(db).findComponentCases(draftId).absence;
    expect(absence).toMatchObject({
      leaveReason: "serious_health_condition",
      conditionDescription: "Recovery",
      workState: "DE",
      periods: [{ startDate: "2026-03-02", endDate: "2026-03-08" }],
    });
  });

  it("should clear omitted values owned by each replaced section", () => {
    const db = aSeededDatabase();
    const repo = createNotificationRepository(db);
    const draftId = repo.createDraft(aDraftRow());
    repo.saveSection(draftId, {
      key: "leaveReason", body: {}, leaveReason: "other", conditionDescription: "Recovery",
    });
    repo.saveSection(draftId, {
      key: "absencePeriods", body: {}, absencePeriods: [{
        lastDayWorked: "2026-03-01", startDate: "2026-03-02", endDate: "2026-03-08",
      }],
    });
    repo.saveSection(draftId, { key: "diagnosis", body: {}, diagnosisCode: "O80" });
    repo.saveSection(draftId, { key: "medicalProvider", body: {}, providerPartyId: toPartyId("PTY-TRAVIS") });
    repo.saveSection(draftId, { key: "leaveReason", body: {} });
    repo.saveSection(draftId, { key: "absencePeriods", body: {} });
    repo.saveSection(draftId, { key: "diagnosis", body: {} });
    repo.saveSection(draftId, { key: "medicalProvider", body: {} });
    expect(repo.findById(draftId)).toMatchObject({
      leaveReason: undefined,
      conditionDescription: undefined,
      absencePeriods: [],
      diagnosisCode: undefined,
      providerPartyId: undefined,
    });
  });

  it("should preserve values owned by other sections when diagnosis is replaced", () => {
    const db = aSeededDatabase();
    const repo = createNotificationRepository(db);
    const draftId = repo.createDraft(aDraftRow());
    repo.saveSection(draftId, {
      key: "leaveReason", body: {}, leaveReason: "other", conditionDescription: "Recovery",
    });
    repo.saveSection(draftId, { key: "medicalProvider", body: {}, providerPartyId: toPartyId("PTY-TRAVIS") });
    repo.saveSection(draftId, { key: "diagnosis", body: {}, diagnosisCode: "O80" });
    repo.saveSection(draftId, { key: "diagnosis", body: {} });
    expect(repo.findById(draftId)).toMatchObject({
      conditionDescription: "Recovery",
      providerPartyId: "PTY-TRAVIS",
      diagnosisCode: undefined,
    });
  });

  it("should reject a second execution run while one is in flight for the same case", () => {
    const db = aSeededDatabase();
    const repo = createCaseRepository(db);
    repo.startExecution(toCaseId("NTN-159898"));
    const blocked = repo.startExecution(toCaseId("NTN-159898"));
    expect(blocked).toMatchObject({ ok: false, error: { kind: "EXECUTION_IN_PROGRESS" } });
  });

  it("should allow a new execution run after the in-flight run finishes", () => {
    const db = aSeededDatabase();
    const repo = createCaseRepository(db);
    const started = repo.startExecution(toCaseId("NTN-159898"));
    repo.finishExecution(unwrapRunId(started), "COMPLETED");
    expect(repo.startExecution(toCaseId("NTN-159898"))).toMatchObject({ ok: true });
  });

  it("should not find an absence case for the seeded missing execution id", () => {
    const db = aSeededDatabase();
    expect(createCaseRepository(db).findAbsenceCase(MISSING_CASE_ID)).toBeUndefined();
  });

  it("should reject an absence case when its notification does not exist", () => {
    const db = aSeededDatabase();
    expect(() => insertOrphanAbsenceCase(db)).toThrow();
  });

  it("should reject a party whose type is outside the allowed set", () => {
    const db = aSeededDatabase();
    expect(() => insertInvalidPartyType(db)).toThrow();
  });
});
