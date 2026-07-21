import type { CaseId } from "@fineos/contracts";
import type { Db } from "./database";

export const MISSING_CASE_ID = "NTN-000000" as CaseId;

const PARTIES = [
  ["PTY-80937", "80937", "Erica Alexander", "insured", "1980-10-05", "Fifth Third Bank National Association", null, null, null],
  ["PTY-77569", "77569", "David Hunter", "insured", "1980-10-20", "ACEDEX", "(207) 8182211", "(207) 0012222", "david_hunter.aoa7wupt@mailosaur.io"],
  ["PTY-TRAVIS", null, "Travis Larson", "medical_provider", null, null, null, null, null],
] as const;

const NOTIFICATIONS = [
  ["NTN-165775", "PTY-80937", "Phone", "2026-02-13", "leave_and_gdc", "leave_and_gdc", "SUBMITTED"],
  ["NTN-159898", "PTY-77569", "Phone", "2026-01-06", "leave_and_gdc", "leave_and_gdc", "SUBMITTED"],
] as const;

const ABSENCE_CASES = [
  ["NTN-165775-ABS-01", "NTN-165775", "PTY-80937", "serious_health_condition", null, "DE", "OPEN"],
  ["NTN-159898-ABS-01", "NTN-159898", "PTY-77569", "serious_health_condition", "Torn ligament in knee, injured from football game", "NJ", "ADJUDICATION"],
] as const;

const ABSENCE_PERIODS = [
  ["AP-165775-01", "NTN-165775-ABS-01", "2026-02-08", "2026-02-09", "2026-02-16"],
  ["AP-159898-01", "NTN-159898-ABS-01", "2026-01-07", "2026-01-08", "2026-03-09"],
] as const;

const GDC_CASES = [
  ["NTN-165775-GDC-02", "NTN-165775", "PTY-80937", null, null, "OPEN"],
  ["NTN-159898-GDC-02", "NTN-159898", "PTY-77569", "PTY-TRAVIS", "O80", "OPEN"],
] as const;

export const seedDatabase = (db: Db): void => {
  db.transaction(() => seedAll(db))();
};

const seedAll = (db: Db): void => {
  insertRows(db, "INSERT INTO party(id, customer_number, full_name, party_type, date_of_birth, employer, phone, home_phone, email) VALUES (?,?,?,?,?,?,?,?,?)", PARTIES);
  insertRows(db, "INSERT INTO notification(id, party_id, source, notification_date, scope, intake_type, status) VALUES (?,?,?,?,?,?,?)", NOTIFICATIONS);
  insertRows(db, "INSERT INTO absence_case(id, notification_id, employee_party_id, leave_reason, condition_description, work_state, status) VALUES (?,?,?,?,?,?,?)", ABSENCE_CASES);
  insertRows(db, "INSERT INTO absence_period(id, absence_case_id, last_day_worked, start_date, end_date) VALUES (?,?,?,?,?)", ABSENCE_PERIODS);
  insertRows(db, "INSERT INTO gdc_case(id, notification_id, claimant_party_id, provider_party_id, diagnosis_code, status) VALUES (?,?,?,?,?,?)", GDC_CASES);
};

const insertRows = (db: Db, sql: string, rows: readonly (readonly unknown[])[]): void => {
  const statement = db.prepare(sql);
  for (const row of rows) statement.run(...row);
};
