import type { CaseId } from "@fineos/contracts";
import type { Db } from "./database";

export const MISSING_CASE_ID = "NTN-000000" as CaseId;

// The trailing parties/notifications/cases back the static Case Search fixture
// rows (Recent + intake popup) so every listed result opens a real record
// instead of a client-only dead route. NTN-165771 reuses the existing Erica
// party so the "Erica" party search stays a single, unambiguous result.
const PARTIES = [
  ["PTY-80937", "80937", "Erica Alexander", "insured", "1980-10-05", "Fifth Third Bank National Association", null, null, null],
  ["PTY-77569", "77569", "David Hunter", "insured", "1980-10-20", "ACEDEX", "(207) 8182211", "(207) 0012222", "david_hunter.aoa7wupt@mailosaur.io"],
  ["PTY-TRAVIS", null, "Travis Larson", "medical_provider", null, null, null, null, null],
  ["PTY-ANTHONY", null, "Anthony Ellis", "insured", null, "ACEDEX", null, null, null],
  ["PTY-EDNA", null, "EDNA TIERTEST1", "insured", null, "ACEDEX", null, null, null],
  ["PTY-ZACHARY", null, "Zachary Alexander", "insured", null, "Fifth Third Bank National Association", null, null, null],
  ["PTY-BETH", null, "Beth Alexander", "insured", null, "Fifth Third Bank National Association", null, null, null],
  ["PTY-DUSTIN", null, "Dustin Adams", "insured", null, "ACEDEX", null, null, null],
] as const;

const NOTIFICATIONS = [
  ["NTN-165775", "PTY-80937", "Phone", "2026-02-13", "leave_and_gdc", "leave_and_gdc", "SUBMITTED"],
  ["NTN-159898", "PTY-77569", "Phone", "2026-01-06", "leave_and_gdc", "leave_and_gdc", "SUBMITTED"],
  ["NTN-162642", "PTY-ANTHONY", "Phone", "2026-01-22", "leave_only", "leave", "SUBMITTED"],
  ["NTN-162641", "PTY-ANTHONY", "Phone", "2026-01-30", "leave_only", "leave", "SUBMITTED"],
  ["NTN-160306", "PTY-ANTHONY", "Phone", "2026-01-12", "leave_only", "leave", "SUBMITTED"],
  ["NTN-159901", "PTY-77569", "Phone", "2026-01-02", "leave_only", "leave", "SUBMITTED"],
  ["NTN-148123", "PTY-EDNA", "Phone", "2025-11-02", "leave_only", "leave", "SUBMITTED"],
  ["NTN-165773", "PTY-ZACHARY", "Phone", "2026-02-10", "leave_and_gdc", "leave_and_gdc", "SUBMITTED"],
  ["NTN-165772", "PTY-BETH", "Phone", "2026-04-01", "leave_and_gdc", "leave_and_gdc", "SUBMITTED"],
  ["NTN-165771", "PTY-80937", "Phone", "2026-02-12", "gdc_only", "gdc", "SUBMITTED"],
  ["NTN-165571", "PTY-DUSTIN", "Phone", "2026-02-05", "leave_only", "leave", "SUBMITTED"],
  ["NTN-165335", "PTY-77569", "Phone", "2026-01-15", null, "accommodation_only", "SUBMITTED"],
] as const;

const ABSENCE_CASES = [
  ["NTN-165775-ABS-01", "NTN-165775", "PTY-80937", "serious_health_condition", null, "DE", "OPEN"],
  ["NTN-159898-ABS-01", "NTN-159898", "PTY-77569", "serious_health_condition", "Torn ligament in knee, injured from football game", "NJ", "ADJUDICATION"],
  ["NTN-162642-ABS-01", "NTN-162642", "PTY-ANTHONY", "serious_health_condition", null, "DE", "OPEN"],
  ["NTN-162641-ABS-01", "NTN-162641", "PTY-ANTHONY", "serious_health_condition", null, "DE", "OPEN"],
  ["NTN-160306-ABS-01", "NTN-160306", "PTY-ANTHONY", "serious_health_condition", null, "DE", "OPEN"],
  ["NTN-159901-ABS-01", "NTN-159901", "PTY-77569", "serious_health_condition", null, "NJ", "OPEN"],
  ["NTN-148123-ABS-01", "NTN-148123", "PTY-EDNA", "serious_health_condition", null, "ME", "OPEN"],
  ["NTN-165773-ABS-01", "NTN-165773", "PTY-ZACHARY", "serious_health_condition", null, "DE", "OPEN"],
  ["NTN-165772-ABS-01", "NTN-165772", "PTY-BETH", "serious_health_condition", null, "DE", "OPEN"],
  ["NTN-165571-ABS-01", "NTN-165571", "PTY-DUSTIN", "serious_health_condition", null, "DE", "OPEN"],
] as const;

const ABSENCE_PERIODS = [
  ["AP-165775-01", "NTN-165775-ABS-01", "2026-02-08", "2026-02-09", "2026-02-16"],
  ["AP-159898-01", "NTN-159898-ABS-01", "2026-01-07", "2026-01-08", "2026-03-09"],
] as const;

const GDC_CASES = [
  ["NTN-165775-GDC-02", "NTN-165775", "PTY-80937", null, null, "OPEN"],
  ["NTN-159898-GDC-02", "NTN-159898", "PTY-77569", "PTY-TRAVIS", "O80", "OPEN"],
  ["NTN-165773-GDC-02", "NTN-165773", "PTY-ZACHARY", null, null, "OPEN"],
  ["NTN-165772-GDC-02", "NTN-165772", "PTY-BETH", null, null, "OPEN"],
  ["NTN-165771-GDC-02", "NTN-165771", "PTY-80937", null, null, "OPEN"],
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
