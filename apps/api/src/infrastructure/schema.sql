CREATE TABLE party (
  id TEXT PRIMARY KEY,
  customer_number TEXT UNIQUE,
  full_name TEXT NOT NULL,
  party_type TEXT NOT NULL CHECK (party_type IN ('insured', 'medical_provider')),
  date_of_birth TEXT,
  employer TEXT,
  phone TEXT,
  home_phone TEXT,
  email TEXT,
  details_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE notification (
  id TEXT PRIMARY KEY,
  party_id TEXT NOT NULL REFERENCES party(id),
  source TEXT NOT NULL,
  notification_date TEXT NOT NULL,
  scope TEXT CHECK (scope IN ('leave_only', 'gdc_only', 'leave_and_gdc')),
  sections_json TEXT NOT NULL DEFAULT '{}',
  intake_type TEXT CHECK (intake_type IN ('leave', 'gdc', 'leave_and_gdc', 'accommodation_only')),
  leave_reason TEXT,
  condition_description TEXT,
  work_state TEXT,
  absence_periods_json TEXT NOT NULL DEFAULT '[]',
  diagnosis_code TEXT,
  provider_party_id TEXT REFERENCES party(id),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED')),
  scenario_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE absence_case (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL UNIQUE REFERENCES notification(id),
  employee_party_id TEXT NOT NULL REFERENCES party(id),
  leave_reason TEXT,
  condition_description TEXT,
  work_state TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE absence_period (
  id TEXT PRIMARY KEY,
  absence_case_id TEXT NOT NULL REFERENCES absence_case(id),
  last_day_worked TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  CHECK (start_date <= end_date)
);

CREATE TABLE gdc_case (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL UNIQUE REFERENCES notification(id),
  claimant_party_id TEXT NOT NULL REFERENCES party(id),
  provider_party_id TEXT REFERENCES party(id),
  diagnosis_code TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE case_execution_run (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES notification(id),
  status TEXT NOT NULL CHECK (status IN (
    'IN_FLIGHT',
    'COMPLETED',
    'ESCALATED_CASE_NOT_FOUND',
    'ESCALATED_INELIGIBLE_INTAKE',
    'ESCALATED_CONDITIONS_NOT_MET'
  )),
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE UNIQUE INDEX one_inflight_per_case
  ON case_execution_run(case_id) WHERE status = 'IN_FLIGHT';
