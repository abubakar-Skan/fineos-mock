import {
  fail,
  succeed,
  toCaseId,
  toPartyId,
  type CaseId,
  type DomainResult,
  type DraftComponentScope,
  type ExecutionStatus,
  type IntakeComponentScope,
  type IntakeType,
  type PartyProfileDetails,
  type Process2Dossier,
  type RecentCaseRow,
  type Submission,
} from "@fineos/contracts";
import type {
  AbsenceCaseRecord,
  AbsencePeriodInput,
  AbsencePeriodRecord,
  CaseRepository,
  CaseSummaryRecord,
  ComponentCases,
  ContactInput,
  ExecutionRunRecord,
  GdcCaseRecord,
  NotificationDraftRow,
  NotificationRecord,
  NotificationRepository,
  OutcomeCommit,
  PartyRecord,
  PartyRepository,
  PartyType,
  PersistenceError,
  ProviderInput,
  RunStatus,
  SectionSave,
  SubmissionRecord,
} from "../application/ports";
import type { Db } from "./database";

const GENERATED_BASE = 900000;

interface PartyRow {
  id: string;
  customer_number: string | null;
  full_name: string;
  party_type: PartyType;
  date_of_birth: string | null;
  employer: string | null;
  phone: string | null;
  home_phone: string | null;
  email: string | null;
  details_json: string;
}

interface CaseSummaryRow {
  id: string;
  full_name: string;
  scope: IntakeComponentScope | null;
  status: "DRAFT" | "SUBMITTED";
}

interface NotificationRow {
  id: string;
  party_id: string;
  source: string;
  notification_date: string;
  scope: IntakeComponentScope | null;
  sections_json: string;
  intake_type: IntakeType | null;
  leave_reason: string | null;
  condition_description: string | null;
  work_state: string | null;
  absence_periods_json: string;
  diagnosis_code: string | null;
  provider_party_id: string | null;
  status: "DRAFT" | "SUBMITTED";
}

interface AbsenceCaseRow {
  id: string;
  notification_id: string;
  employee_party_id: string;
  leave_reason: string | null;
  condition_description: string | null;
  work_state: string | null;
  status: string;
}

interface AbsencePeriodRow {
  id: string;
  absence_case_id: string;
  last_day_worked: string;
  start_date: string;
  end_date: string;
}

interface GdcCaseRow {
  id: string;
  notification_id: string;
  claimant_party_id: string;
  provider_party_id: string | null;
  diagnosis_code: string | null;
  status: string;
}

interface RunRow {
  id: string;
  case_id: string;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
}

export const createPartyRepository = (db: Db): PartyRepository => ({
  findById: (id) => findParty(db, id),
  search: (term) => searchParties(db, term),
  updateContact: (id, contact) => updateContact(db, id, contact),
  createProvider: (input) => insertProvider(db, input),
});

export const createNotificationRepository = (db: Db): NotificationRepository => ({
  createDraft: (input) => insertDraft(db, input),
  findById: (id) => findNotification(db, id),
  saveSection: (id, section) => db.transaction(() => saveSection(db, id, section))(),
  submit: (id, plan) => db.transaction(() => runSubmit(db, id, plan))(),
});

export const createCaseRepository = (db: Db): CaseRepository => ({
  findAbsenceCase: (id) => findAbsenceCase(db, id),
  findGdcCase: (id) => findGdcCase(db, id),
  findComponentCases: (id) => findComponentCases(db, id),
  search: (term) => searchCases(db, term),
  recent: () => recentCases(db),
  startExecution: (caseId) => db.transaction(() => runStart(db, caseId))(),
  finishExecution: (runId, status) => finishRun(db, runId, status),
  commitOutcome: (commit) => db.transaction(() => commitOutcome(db, commit))(),
  findLatestRun: (caseId) => findLatestRun(db, caseId),
  findRun: (runId) => findRun(db, runId),
});

const findParty = (db: Db, id: string): PartyRecord | undefined => {
  const row = db.prepare("SELECT * FROM party WHERE id = ?").get(id) as PartyRow | undefined;
  return row ? toParty(row) : undefined;
};

const searchParties = (db: Db, term: string): readonly PartyRecord[] =>
  (db.prepare("SELECT * FROM party WHERE full_name LIKE ? ORDER BY id").all(`%${term}%`) as PartyRow[]).map(toParty);

const updateContact = (db: Db, id: string, contact: ContactInput): PartyRecord | undefined => {
  if (!findParty(db, id)) return undefined;
  db.prepare("UPDATE party SET phone = ?, email = ? WHERE id = ?").run(contact.phone, contact.email, id);
  return findParty(db, id);
};

const insertProvider = (db: Db, input: ProviderInput): PartyRecord => {
  const id = nextProviderId(db);
  db.prepare("INSERT INTO party(id, full_name, party_type) VALUES (?, ?, 'medical_provider')")
    .run(id, `${input.firstName} ${input.lastName}`);
  return findParty(db, id)!;
};

const nextProviderId = (db: Db): string => {
  const sql = "SELECT MAX(CAST(SUBSTR(id, 14) AS INTEGER)) AS m FROM party WHERE id LIKE 'PTY-PROVIDER-%'";
  const row = db.prepare(sql).get() as { m: number | null };
  return `PTY-PROVIDER-${String((row.m ?? 0) + 1).padStart(4, "0")}`;
};

const searchCases = (db: Db, term: string): readonly CaseSummaryRecord[] =>
  (db.prepare(SEARCH_CASES_SQL).all(`%${term}%`, `%${term}%`) as CaseSummaryRow[]).map(toCaseSummary);

const SEARCH_CASES_SQL =
  "SELECT n.id, p.full_name, n.scope, n.status FROM notification n " +
  "JOIN party p ON p.id = n.party_id WHERE n.id LIKE ? OR p.full_name LIKE ? ORDER BY n.id";

interface RecentNotifRow {
  id: string;
  full_name: string;
  condition_description: string | null;
}

const RECENT_NOTIF_SQL =
  "SELECT n.id, p.full_name, n.condition_description FROM notification n " +
  "JOIN party p ON p.id = n.party_id ORDER BY n.id";

// Flattens exactly the seeded roots plus the Absence/GDC subcases that actually
// exist, so every recent row is a real, clickable case record.
const recentCases = (db: Db): readonly RecentCaseRow[] =>
  (db.prepare(RECENT_NOTIF_SQL).all() as RecentNotifRow[]).flatMap((n) => recentGroup(db, n));

const recentGroup = (db: Db, n: RecentNotifRow): readonly RecentCaseRow[] => [
  { caseId: toCaseId(n.id), kind: "notification", label: `Notification - ${n.id}`, description: n.condition_description ?? "", partyName: n.full_name },
  ...recentAbsence(db, n),
  ...recentGdc(db, n),
];

const recentAbsence = (db: Db, n: RecentNotifRow): readonly RecentCaseRow[] => {
  const row = db.prepare("SELECT * FROM absence_case WHERE notification_id = ?").get(n.id) as AbsenceCaseRow | undefined;
  if (!row) return [];
  const description = [row.leave_reason, row.condition_description, row.work_state].filter(Boolean).join(" | ");
  return [{ caseId: toCaseId(row.id), kind: "absence", label: `Absence Case - ${row.id}`, description, partyName: n.full_name }];
};

const recentGdc = (db: Db, n: RecentNotifRow): readonly RecentCaseRow[] => {
  const row = db.prepare("SELECT * FROM gdc_case WHERE notification_id = ?").get(n.id) as GdcCaseRow | undefined;
  if (!row) return [];
  return [{ caseId: toCaseId(row.id), kind: "gdc", label: `Group Disability Claim - ${row.id}`, description: row.diagnosis_code ?? "", partyName: n.full_name }];
};

const insertDraft = (db: Db, input: NotificationDraftRow): CaseId => {
  const id = nextNotificationId(db);
  db.prepare("INSERT INTO notification(id, party_id, source, notification_date) VALUES (?,?,?,?)")
    .run(id, input.partyId, input.source, input.notificationDate);
  return toCaseId(id);
};

const nextNotificationId = (db: Db): string => {
  const row = db.prepare("SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) AS m FROM notification").get() as { m: number | null };
  return `NTN-${Math.max(row.m ?? 0, GENERATED_BASE) + 1}`;
};

const findNotification = (db: Db, id: CaseId): NotificationRecord | undefined => {
  const row = db.prepare("SELECT * FROM notification WHERE id = ?").get(id) as NotificationRow | undefined;
  return row ? toNotification(row) : undefined;
};

const saveSection = (db: Db, id: CaseId, update: SectionSave): void => {
  const notification = findNotification(db, id);
  if (!notification) return;
  const sections = { ...notification.sections, [update.key]: update.body };
  db.prepare("UPDATE notification SET sections_json = ? WHERE id = ?")
    .run(JSON.stringify(sections), id);
  SECTION_WRITERS[update.key]?.(db, id, update);
};

type SectionWriter = (db: Db, id: CaseId, update: SectionSave) => void;

const saveNotificationDetails: SectionWriter = (db, id, update) => {
  db.prepare("UPDATE notification SET source = ?, notification_date = ? WHERE id = ?")
    .run(update.source, update.notificationDate, id);
};

const saveOptions: SectionWriter = (db, id, update) => {
  db.prepare("UPDATE notification SET scope = ?, intake_type = ? WHERE id = ?")
    .run(update.scope ?? null, update.intakeType ?? null, id);
};

const saveLeaveReason: SectionWriter = (db, id, update) => {
  db.prepare("UPDATE notification SET leave_reason = ?, condition_description = ? WHERE id = ?")
    .run(update.leaveReason ?? null, update.conditionDescription ?? null, id);
};

const saveAbsenceDetails: SectionWriter = (db, id, update) => {
  if (update.conditionDescription !== undefined) saveConditionDescription(db, id, update);
  if (update.workState !== undefined) saveWorkState(db, id, update);
};

const saveConditionDescription: SectionWriter = (db, id, update) => {
  db.prepare("UPDATE notification SET condition_description = ? WHERE id = ?")
    .run(update.conditionDescription, id);
};

const saveWorkState: SectionWriter = (db, id, update) => {
  db.prepare("UPDATE notification SET work_state = ? WHERE id = ?")
    .run(update.workState ?? null, id);
};

const saveAbsencePeriods: SectionWriter = (db, id, update) => {
  db.prepare("UPDATE notification SET absence_periods_json = ? WHERE id = ?")
    .run(JSON.stringify(update.absencePeriods ?? []), id);
};

const saveDiagnosis: SectionWriter = (db, id, update) => {
  db.prepare("UPDATE notification SET diagnosis_code = ? WHERE id = ?")
    .run(update.diagnosisCode ?? null, id);
};

const saveMedicalProvider: SectionWriter = (db, id, update) => {
  db.prepare("UPDATE notification SET provider_party_id = ? WHERE id = ?")
    .run(update.providerPartyId ?? null, id);
};

const saveMedicalDetails: SectionWriter = (db, id, update) => {
  db.prepare("UPDATE notification SET diagnosis_code = ?, provider_party_id = ? WHERE id = ?")
    .run(update.diagnosisCode ?? null, update.providerPartyId ?? null, id);
};

const SECTION_WRITERS: Readonly<Record<string, SectionWriter | undefined>> = {
  notificationDetails: saveNotificationDetails,
  notificationOptions: saveOptions,
  leaveReason: saveLeaveReason,
  workPattern: saveWorkState,
  absenceDetails: saveAbsenceDetails,
  absencePeriods: saveAbsencePeriods,
  diagnosis: saveDiagnosis,
  medicalDetails: saveMedicalDetails,
  medicalProvider: saveMedicalProvider,
};

const runSubmit = (
  db: Db,
  id: CaseId,
  plan: Submission,
): DomainResult<SubmissionRecord, PersistenceError> => {
  const notif = findNotification(db, id);
  if (!notif) return fail(draftNotFound(id));
  if (notif.status === "SUBMITTED") return succeed(readSubmission(db, notif));
  markSubmitted(db, id);
  return succeed(materialize(db, notif, plan));
};

const markSubmitted = (db: Db, id: CaseId): void => {
  db.prepare("UPDATE notification SET status = 'SUBMITTED' WHERE id = ?").run(id);
};

const materialize = (db: Db, notif: NotificationRecord, plan: Submission): SubmissionRecord => ({
  notificationId: notif.id,
  absenceCaseId: plan.createsAbsenceCase ? insertAbsenceCase(db, notif) : null,
  gdcCaseId: plan.createsGdcCase ? insertGdcCase(db, notif) : null,
});

const readSubmission = (db: Db, notif: NotificationRecord): SubmissionRecord => ({
  notificationId: notif.id,
  absenceCaseId: findCaseIdByNotification(db, "absence_case", notif.id),
  gdcCaseId: findCaseIdByNotification(db, "gdc_case", notif.id),
});

const insertAbsenceCase = (db: Db, notif: NotificationRecord): CaseId => {
  const id = `${notif.id}-ABS-01`;
  db.prepare(INSERT_ABSENCE_SQL).run(
    id, notif.id, notif.partyId, notif.leaveReason ?? null,
    notif.conditionDescription ?? null, notif.workState ?? null,
  );
  notif.absencePeriods.forEach((period, index) => insertPeriod(db, id, period, index));
  return toCaseId(id);
};

const INSERT_ABSENCE_SQL = `INSERT INTO absence_case(
  id, notification_id, employee_party_id, leave_reason, condition_description, work_state
) VALUES (?,?,?,?,?,?)`;

const insertPeriod = (
  db: Db,
  caseId: string,
  period: AbsencePeriodInput,
  index: number,
): void => {
  db.prepare("INSERT INTO absence_period VALUES (?,?,?,?,?)").run(
    `${caseId}-PERIOD-${index + 1}`, caseId,
    period.lastDayWorked, period.startDate, period.endDate,
  );
};

const insertGdcCase = (db: Db, notif: NotificationRecord): CaseId => {
  const id = `${notif.id}-GDC-02`;
  db.prepare(INSERT_GDC_SQL).run(
    id, notif.id, notif.partyId,
    notif.providerPartyId ?? null, notif.diagnosisCode ?? null,
  );
  return toCaseId(id);
};

const INSERT_GDC_SQL = `INSERT INTO gdc_case(
  id, notification_id, claimant_party_id, provider_party_id, diagnosis_code
) VALUES (?,?,?,?,?)`;

// ponytail: `table` is a fixed internal literal, not caller input, so interpolation is safe.
const findCaseIdByNotification = (db: Db, table: string, notificationId: CaseId): CaseId | null => {
  const row = db.prepare(`SELECT id FROM ${table} WHERE notification_id = ?`).get(notificationId) as { id: string } | undefined;
  return row ? toCaseId(row.id) : null;
};

const findAbsenceCase = (db: Db, id: CaseId): AbsenceCaseRecord | undefined => {
  const row = db.prepare("SELECT * FROM absence_case WHERE id = ?").get(id) as AbsenceCaseRow | undefined;
  return row ? toAbsenceCase(db, row) : undefined;
};

const findGdcCase = (db: Db, id: CaseId): GdcCaseRecord | undefined => {
  const row = db.prepare("SELECT * FROM gdc_case WHERE id = ?").get(id) as GdcCaseRow | undefined;
  return row ? toGdc(row) : undefined;
};

const findComponentCases = (db: Db, notificationId: CaseId): ComponentCases => ({
  absence: findAbsenceByNotification(db, notificationId),
  gdc: findGdcByNotification(db, notificationId),
});

const findAbsenceByNotification = (db: Db, notificationId: CaseId): AbsenceCaseRecord | undefined => {
  const row = db.prepare("SELECT * FROM absence_case WHERE notification_id = ?").get(notificationId) as AbsenceCaseRow | undefined;
  return row ? toAbsenceCase(db, row) : undefined;
};

const findGdcByNotification = (db: Db, notificationId: CaseId): GdcCaseRecord | undefined => {
  const row = db.prepare("SELECT * FROM gdc_case WHERE notification_id = ?").get(notificationId) as GdcCaseRow | undefined;
  return row ? toGdc(row) : undefined;
};

const loadPeriods = (db: Db, absenceCaseId: string): readonly AbsencePeriodRecord[] =>
  (db.prepare("SELECT * FROM absence_period WHERE absence_case_id = ? ORDER BY id").all(absenceCaseId) as AbsencePeriodRow[]).map(toPeriod);

// ponytail: single synchronous better-sqlite3 connection makes the in-flight pre-check
// race-free; the partial unique index backstops it. Upgrade path: a distributed lock if
// execution ever moves to multiple processes.
const runStart = (db: Db, caseId: CaseId): DomainResult<ExecutionRunRecord, PersistenceError> => {
  if (hasInFlight(db, caseId)) return fail(executionInProgress(caseId));
  const run: ExecutionRunRecord = { id: nextRunId(db), caseId, status: "IN_FLIGHT", startedAt: nowIso(), finishedAt: null };
  db.prepare("INSERT INTO case_execution_run(id, case_id, status, started_at) VALUES (?,?,?,?)")
    .run(run.id, caseId, run.status, run.startedAt);
  return succeed(run);
};

const hasInFlight = (db: Db, caseId: CaseId): boolean =>
  db.prepare("SELECT 1 FROM case_execution_run WHERE case_id = ? AND status = 'IN_FLIGHT'").get(caseId) !== undefined;

const nextRunId = (db: Db): string => {
  const row = db.prepare("SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) AS m FROM case_execution_run").get() as { m: number | null };
  return `RUN-${(row.m ?? 0) + 1}`;
};

const finishRun = (db: Db, runId: string, status: ExecutionStatus): void => {
  db.prepare("UPDATE case_execution_run SET status = ?, finished_at = ? WHERE id = ?").run(status, nowIso(), runId);
};

const commitOutcome = (db: Db, commit: OutcomeCommit): void => {
  finishRun(db, commit.runId, commit.status);
  if (commit.gdcCaseId) applyGdcUpdate(db, commit);
};

const applyGdcUpdate = (db: Db, commit: OutcomeCommit): void => {
  db.prepare(
    "UPDATE gdc_case SET diagnosis_code = COALESCE(?, diagnosis_code), provider_party_id = COALESCE(?, provider_party_id) WHERE id = ?",
  ).run(commit.diagnosisCode, commit.providerPartyId, commit.gdcCaseId);
};

const findLatestRun = (db: Db, caseId: CaseId): ExecutionRunRecord | undefined => {
  const row = db
    .prepare("SELECT * FROM case_execution_run WHERE case_id = ? ORDER BY CAST(SUBSTR(id, 5) AS INTEGER) DESC LIMIT 1")
    .get(caseId) as RunRow | undefined;
  return row ? toRun(row) : undefined;
};

const findRun = (db: Db, runId: string): ExecutionRunRecord | undefined => {
  const row = db.prepare("SELECT * FROM case_execution_run WHERE id = ?").get(runId) as RunRow | undefined;
  return row ? toRun(row) : undefined;
};

const toParty = (row: PartyRow): PartyRecord => ({
  id: toPartyId(row.id),
  customerNumber: row.customer_number,
  fullName: row.full_name,
  partyType: row.party_type,
  dateOfBirth: row.date_of_birth,
  employer: row.employer,
  phone: row.phone,
  homePhone: row.home_phone,
  email: row.email,
  details: parseDetails(row.details_json),
});

// An empty object (created providers, retained non-case parties) has no typed
// profile, so it maps to null rather than a hollow details payload.
const parseDetails = (json: string): PartyProfileDetails | null => {
  const value = safeParse(json);
  return value && Object.keys(value).length > 0 ? (value as unknown as PartyProfileDetails) : null;
};

const parseDossier = (json: string): Process2Dossier | null => {
  const value = safeParse(json);
  return value && "caseId" in value && "summary" in value ? (value as unknown as Process2Dossier) : null;
};

const safeParse = (json: string): Record<string, unknown> | null => {
  const value = JSON.parse(json) as unknown;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

const toCaseSummary = (row: CaseSummaryRow): CaseSummaryRecord => ({
  caseId: toCaseId(row.id),
  partyName: row.full_name,
  scope: toDraftScope(row.scope),
  status: row.status,
});

const toNotification = (row: NotificationRow): NotificationRecord => ({
  id: toCaseId(row.id),
  partyId: toPartyId(row.party_id),
  source: row.source,
  notificationDate: row.notification_date,
  scope: toDraftScope(row.scope),
  sections: JSON.parse(row.sections_json) as Readonly<Record<string, unknown>>,
  intakeType: row.intake_type ?? undefined,
  leaveReason: row.leave_reason ?? undefined,
  conditionDescription: row.condition_description ?? undefined,
  workState: row.work_state ?? undefined,
  absencePeriods: JSON.parse(row.absence_periods_json) as readonly AbsencePeriodInput[],
  diagnosisCode: row.diagnosis_code ?? undefined,
  providerPartyId: row.provider_party_id ? toPartyId(row.provider_party_id) : undefined,
  status: row.status,
  dossier: parseDossier(row.sections_json),
});

const toDraftScope = (scope: IntakeComponentScope | null): DraftComponentScope =>
  scope ? { kind: "selected", value: scope } : { kind: "unselected" };

const toAbsenceCase = (db: Db, row: AbsenceCaseRow): AbsenceCaseRecord => ({
  id: toCaseId(row.id),
  notificationId: toCaseId(row.notification_id),
  employeePartyId: toPartyId(row.employee_party_id),
  leaveReason: row.leave_reason ?? undefined,
  conditionDescription: row.condition_description ?? undefined,
  workState: row.work_state ?? undefined,
  status: row.status,
  periods: loadPeriods(db, row.id),
});

const toPeriod = (row: AbsencePeriodRow): AbsencePeriodRecord => ({
  id: row.id,
  absenceCaseId: toCaseId(row.absence_case_id),
  lastDayWorked: row.last_day_worked,
  startDate: row.start_date,
  endDate: row.end_date,
});

const toGdc = (row: GdcCaseRow): GdcCaseRecord => ({
  id: toCaseId(row.id),
  notificationId: toCaseId(row.notification_id),
  claimantPartyId: toPartyId(row.claimant_party_id),
  providerPartyId: row.provider_party_id ? toPartyId(row.provider_party_id) : null,
  diagnosisCode: row.diagnosis_code,
  status: row.status,
});

const toRun = (row: RunRow): ExecutionRunRecord => ({
  id: row.id,
  caseId: toCaseId(row.case_id),
  status: row.status,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
});

const nowIso = (): string => new Date().toISOString();

const draftNotFound = (id: CaseId): PersistenceError => ({
  kind: "DRAFT_NOT_FOUND",
  message: `Draft notification ${id} was not found.`,
});

const executionInProgress = (caseId: CaseId): PersistenceError => ({
  kind: "EXECUTION_IN_PROGRESS",
  message: `Case ${caseId} already has an execution run in flight.`,
});
