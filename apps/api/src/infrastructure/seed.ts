import type { CaseId } from "@fineos/contracts";
import type { PartyType } from "../application/ports";
import type { Db } from "./database";
import { PROCESS2_CASE_SEEDS } from "./seeds/process2/index.ts";
import type {
  AbsenceCaseSeedRow,
  AbsencePeriodSeedRow,
  GdcCaseSeedRow,
  Process2CaseSeed,
} from "./seeds/process2/types.ts";

export const MISSING_CASE_ID = "NTN-000000" as CaseId;

// The binding layer is the only place SQL NULLs appear: fixture modules leave
// optional fields `undefined`, and every column is derived from the five
// Process 2 seed roots plus the shared parties they reference.
interface PartyValues {
  readonly id: string;
  readonly fullName: string;
  readonly partyType: PartyType;
  readonly details: unknown;
  readonly customerNumber?: string;
  readonly dateOfBirth?: string;
  readonly employer?: string;
  readonly phone?: string;
  readonly homePhone?: string;
  readonly email?: string;
}

// Erica Alexander backs the Process 1 "Erica" party-search fixture and owns no
// Process 2 case; she is the one deliberately retained non-case party. Travis is
// retained implicitly as a deduplicated provider referenced by the seed roots.
const ERICA: PartyValues = {
  id: "PTY-80937",
  fullName: "Erica Alexander",
  partyType: "insured",
  customerNumber: "80937",
  dateOfBirth: "1980-10-05",
  employer: "Fifth Third Bank National Association",
  details: {},
};

const INSERT_PARTY =
  "INSERT INTO party(id, customer_number, full_name, party_type, date_of_birth, employer, phone, home_phone, email, details_json) VALUES (?,?,?,?,?,?,?,?,?,?)";
const INSERT_NOTIFICATION =
  "INSERT INTO notification(id, party_id, source, notification_date, scope, sections_json, intake_type, leave_reason, condition_description, work_state, absence_periods_json, diagnosis_code, provider_party_id, status, scenario_json, target_state_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
const INSERT_ABSENCE_CASE =
  "INSERT INTO absence_case(id, notification_id, employee_party_id, leave_reason, condition_description, work_state, status) VALUES (?,?,?,?,?,?,?)";
const INSERT_ABSENCE_PERIOD =
  "INSERT INTO absence_period(id, absence_case_id, last_day_worked, start_date, end_date) VALUES (?,?,?,?,?)";
const INSERT_GDC_CASE =
  "INSERT INTO gdc_case(id, notification_id, claimant_party_id, provider_party_id, diagnosis_code, status) VALUES (?,?,?,?,?,?)";

export const seedDatabase = (db: Db): void => {
  db.transaction(() => seedAll(db))();
};

const seedAll = (db: Db): void => {
  insertRows(db, INSERT_PARTY, collectParties().map(partyTuple));
  insertRows(db, INSERT_NOTIFICATION, PROCESS2_CASE_SEEDS.map(notificationTuple));
  insertRows(db, INSERT_ABSENCE_CASE, absenceCases().map(absenceCaseTuple));
  insertRows(db, INSERT_ABSENCE_PERIOD, absencePeriods().map(absencePeriodTuple));
  insertRows(db, INSERT_GDC_CASE, gdcCases().map(gdcCaseTuple));
};

const collectParties = (): readonly PartyValues[] => {
  const byId = new Map<string, PartyValues>([[ERICA.id, ERICA]]);
  for (const seed of PROCESS2_CASE_SEEDS) addSeedParties(byId, seed);
  return [...byId.values()];
};

const addSeedParties = (byId: Map<string, PartyValues>, seed: Process2CaseSeed): void => {
  byId.set(seed.party.id, seed.party);
  for (const provider of seed.providers ?? []) byId.set(provider.id, provider);
};

const absenceCases = (): readonly AbsenceCaseSeedRow[] =>
  PROCESS2_CASE_SEEDS.flatMap((seed) => (seed.absenceCase ? [seed.absenceCase] : []));

const absencePeriods = (): readonly AbsencePeriodSeedRow[] =>
  PROCESS2_CASE_SEEDS.flatMap((seed) => seed.absencePeriods ?? []);

const gdcCases = (): readonly GdcCaseSeedRow[] =>
  PROCESS2_CASE_SEEDS.flatMap((seed) => (seed.gdcCase ? [seed.gdcCase] : []));

const partyTuple = (party: PartyValues): readonly unknown[] => [
  party.id, orNull(party.customerNumber), party.fullName, party.partyType,
  orNull(party.dateOfBirth), orNull(party.employer), orNull(party.phone),
  orNull(party.homePhone), orNull(party.email), JSON.stringify(party.details),
];

// target_state_json always seeds as "{}": ACT_11-16 outputs are manually
// persisted by the UI/API rather than pre-filled, even for scenarios whose
// source dossier and gdc_case already carry evidence for those activities.
const notificationTuple = (seed: Process2CaseSeed): readonly unknown[] => {
  const { notification, absenceCase, gdcCase } = seed;
  return [
    notification.id, notification.partyId, notification.source, notification.notificationDate,
    orNull(notification.scope), JSON.stringify(seed.dossier), notification.intakeType,
    orNull(absenceCase?.leaveReason), orNull(absenceCase?.conditionDescription),
    orNull(absenceCase?.workState), periodsJson(seed.absencePeriods),
    orNull(gdcCase?.diagnosisCode), orNull(gdcCase?.providerPartyId),
    notification.status, JSON.stringify(seed.scenario), "{}",
  ];
};

const absenceCaseTuple = (row: AbsenceCaseSeedRow): readonly unknown[] => [
  row.id, row.notificationId, row.employeePartyId,
  orNull(row.leaveReason), orNull(row.conditionDescription), orNull(row.workState), row.status,
];

const absencePeriodTuple = (row: AbsencePeriodSeedRow): readonly unknown[] => [
  row.id, row.absenceCaseId, row.lastDayWorked, row.startDate, row.endDate,
];

const gdcCaseTuple = (row: GdcCaseSeedRow): readonly unknown[] => [
  row.id, row.notificationId, row.claimantPartyId,
  orNull(row.providerPartyId), orNull(row.diagnosisCode), row.status,
];

const periodsJson = (periods: readonly AbsencePeriodSeedRow[] | undefined): string =>
  JSON.stringify((periods ?? []).map(toPeriodInput));

const toPeriodInput = (period: AbsencePeriodSeedRow) => ({
  lastDayWorked: period.lastDayWorked,
  startDate: period.startDate,
  endDate: period.endDate,
});

const orNull = <T>(value: T | undefined): T | null => value ?? null;

const insertRows = (db: Db, sql: string, rows: readonly (readonly unknown[])[]): void => {
  const statement = db.prepare(sql);
  for (const row of rows) statement.run(...row);
};
