import { useState, type ReactNode } from "react";
import type { ComponentFlags } from "../intake-steps";
import { AbsencePeriodDialog, type AbsencePeriod } from "../modals/AbsencePeriodDialog";
import { ProviderDialog, type ProviderChoice } from "../modals/ProviderDialog";
import {
  CheckboxField, DateField, FieldRow, RadioGroup, SelectField, TextArea, TextField, ToggleField,
} from "./controls";

export interface DraftState {
  readonly flags: ComponentFlags;
  readonly fields: Readonly<Record<string, string>>;
  readonly periods: readonly AbsencePeriod[];
  readonly provider: ProviderChoice | null;
}

export interface DraftActions {
  readonly setField: (name: string, value: string) => void;
  readonly setFlag: (flag: keyof ComponentFlags, value: boolean) => void;
  readonly addPeriod: (period: AbsencePeriod) => void;
  readonly setProvider: (choice: ProviderChoice) => void;
}

export interface StepProps {
  readonly state: DraftState;
  readonly actions: DraftActions;
  readonly get: (name: string) => string;
}

const NOTIFICATION_SOURCES = ["Unknown", "Phone", "Paper", "Fax", "Email", "Mail/Post", "Chat", "Split Experience Portal", "Split Experience Phone", "Data Failure"];
const NOTIFIED_BY = ["Requester", "Employee", "Employer", "Other"];
const ABSENCE_RELATES = ["Employee", "Family Member", "Other"];
const ABSENCE_REASONS = ["Please Select", "Serious Health Condition", "Pregnancy/Maternity", "Bonding with a new child", "Military Exigency"];
const QUALIFIER1 = ["Please Select", "Not Work Related", "Work Related"];
const QUALIFIER2 = ["Please Select", "Sickness", "Accident / Injury"];
const YES_NO_UNKNOWN = ["Unknown", "No", "Yes"];
const EMPLOYMENT_STATUS = ["Active", "Inactive", "Terminated"];
const EARNINGS_BASIS = ["Weekly", "Bi-Weekly", "Monthly", "Annual"];
const LEVEL_INDICATOR = ["Primary", "Secondary", "Contributing"];
const MEDICAL_CONDITIONS = ["Not Applicable", "Auditory", "Autoimmune disorder", "Back", "Cancer", "Cardiovascular", "Coronavirus", "Diabetes", "Digestive", "Pregnancy"];
const DIAGNOSIS_CODES = ["Please Select", "O80 - Encounter for full-term uncomplicated delivery", "M25.561 - Pain in right knee", "S83.511 - Sprain of ACL of right knee"];
const CONDITION_CATEGORY = ["Unknown", "Chronic", "Acute", "Pregnancy"];
const REQUESTER_DETAILS = [
  ["Title", "Unknown"], ["First name", "Erica"], ["Last name", "Alexander"],
  ["Date of birth", "10/05/1980"], ["Gender", "Female"],
  ["Identification number type", "Social Security Number"], ["ID number", "114668847"],
] as const;
const MEMBER_CONTACT = [
  ["Mailing address", "170 Main Street\nWilmington DE 19801\nUSA"],
  ["Effective from", "11/16/2022"], ["Status", "Verified"],
  ["Email", "erica_alexander.aoa7wupt@mailosaur.io"],
] as const;

function Detail({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="fx-detail-field"><div className="fx-detail-label">{label}</div><div className="fx-detail-value">{value}</div></div>;
}

function DetailList({ items }: { readonly items: readonly (readonly [string, string])[] }) {
  return <div className="fx-detail-grid">{items.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div>;
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <section><h3 className="fx-section-title">{title}</h3>{children}</section>;
}

function NotificationDetailsForm({ actions, get }: StepProps) {
  return (
    <>
      <NotificationSource actions={actions} get={get} />
      <RequesterDetails />
    </>
  );
}

function NotificationSource({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return (
    <Section title="Notification Source"><FieldRow>
      <SelectField label="Notification source" options={NOTIFICATION_SOURCES} value={get("source")} onChange={(v) => actions.setField("source", v)} />
      <DateField label="Notification date" value={get("notificationDate")} onChange={(v) => actions.setField("notificationDate", v)} />
      <SelectField label="Notified by" options={NOTIFIED_BY} value={get("notifiedBy")} onChange={(v) => actions.setField("notifiedBy", v)} />
    </FieldRow></Section>
  );
}

function RequesterDetails() {
  return <Section title="Requester Details"><DetailList items={REQUESTER_DETAILS} /></Section>;
}

function MemberContactDetails() {
  return <Section title="Member address & Contact Details"><DetailList items={MEMBER_CONTACT} /></Section>;
}

function MemberOccupationForm({ actions, get }: StepProps) {
  return (
    <>
      <MemberDetails />
      <MemberContactDetails />
      <OccupationDetails actions={actions} get={get} />
    </>
  );
}

function MemberDetails() {
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <Section title="Member Details">
      <SelectField label="Employer" options={["Fifth Third Bank National Association (Member ID: 23456876)"]} />
      <button type="button" className="fx-link" onClick={() => setNotice("Create new Member opened.")}>+ Create new Member</button>
      {notice && <p role="status" className="fx-status">{notice}</p>}
    </Section>
  );
}

function OccupationDetails({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return (
    <Section title="Occupation Details"><FieldRow>
      <TextField label="Job title" value={get("jobTitle")} onChange={(v) => actions.setField("jobTitle", v)} />
      <SelectField label="Employment status" options={EMPLOYMENT_STATUS} value={get("employmentStatus")} onChange={(v) => actions.setField("employmentStatus", v)} />
      <DateField label="Date of hire" value={get("dateOfHire")} onChange={(v) => actions.setField("dateOfHire", v)} />
      <TextField label="Hours worked per week" value={get("hoursPerWeek")} onChange={(v) => actions.setField("hoursPerWeek", v)} />
    </FieldRow></Section>
  );
}

const TYPE_OF_REQUEST = ["Accident or treatment required for an injury", "Sickness, treatment required for a medical condition or any other medical procedure", "Pregnancy, birth or related medical treatment", "Bonding with a new child (adoption/ foster care/ newborn)", "Caring for a family member", "Out of work for another reason", "Accommodation required to remain at work"];

function NotificationOptionsForm({ state, actions, get }: StepProps) {
  return (
    <>
      <Section title="Type of Request">
        <RadioGroup legend="Type of Request" options={TYPE_OF_REQUEST} value={get("typeOfRequest")} onChange={(v) => actions.setField("typeOfRequest", v)} />
      </Section>
      {get("typeOfRequest") && <ComponentToggles flags={state.flags} onFlag={actions.setFlag} />}
    </>
  );
}

function ComponentToggles({ flags, onFlag }: { readonly flags: ComponentFlags; readonly onFlag: DraftActions["setFlag"] }) {
  return (
    <div className="fx-toggle-cards">
      <ToggleField label="Request a Leave" description="Warning: EE Centric API applied Employer level default due to Employer Eligibility feed being not trustworthy." checked={flags.requestLeave} onChange={(v) => onFlag("requestLeave", v)} />
      <ToggleField label="Request an Accommodation" description="The requester may be entitled to an accommodation as there is an active service agreement." checked={flags.requestAccommodation} onChange={(v) => onFlag("requestAccommodation", v)} />
      <ToggleField label="Group Disability Claim" description="Warning: EE Centric API applied Employer level default due to Employer Eligibility feed being not trustworthy." checked={flags.requestGdc} onChange={(v) => onFlag("requestGdc", v)} />
    </div>
  );
}

function ReasonForAbsenceForm({ actions, get }: StepProps) {
  return (
    <Section title="Absence Reason">
      <FieldRow>
        <SelectField label="Absence relates to" options={ABSENCE_RELATES} value={get("absenceRelates")} onChange={(v) => actions.setField("absenceRelates", v)} />
        <SelectField label="Absence reason" options={ABSENCE_REASONS} value={get("absenceReason")} onChange={(v) => actions.setField("absenceReason", v)} />
        <SelectField label="Qualifier 1" options={QUALIFIER1} value={get("qualifier1")} onChange={(v) => actions.setField("qualifier1", v)} />
        <SelectField label="Qualifier 2" options={QUALIFIER2} value={get("qualifier2")} onChange={(v) => actions.setField("qualifier2", v)} />
      </FieldRow>
    </Section>
  );
}

const LEAVE_PERIOD_TYPES = [
  { label: "One or more fixed time off periods", desc: "Continuous, single day or hourly leave that conforms to a known or estimated predetermined period of time." },
  { label: "Episodic / leave as needed", desc: "Episodes of leave that are taken intermittently within the boundaries of a permitted frequency and duration." },
  { label: "Reduced work schedule", desc: "Predetermined reduction in normal work hours for a fixed period of time." },
] as const;

function DatesOfAbsenceForm({ state, actions, get }: StepProps) {
  const [open, setOpen] = useState(false);
  return (
    <Section title="Leave Periods">
      <LeavePeriodToggles actions={actions} get={get} />
      <FixedTimeOff periods={state.periods} onAdd={() => setOpen(true)} />
      <ReturnToWork state={state} actions={actions} get={get} />
      {open && <AbsencePeriodDialog onAdd={actions.addPeriod} onClose={() => setOpen(false)} />}
    </Section>
  );
}

function LeavePeriodToggles({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return (
    <>
      <ToggleField label={LEAVE_PERIOD_TYPES[0].label} description={LEAVE_PERIOD_TYPES[0].desc} checked={get("fixedTimeOff") === "yes"} onChange={(v) => actions.setField("fixedTimeOff", v ? "yes" : "no")} />
      <ToggleField label={LEAVE_PERIOD_TYPES[1].label} description={LEAVE_PERIOD_TYPES[1].desc} checked={get("episodic") === "yes"} onChange={(v) => actions.setField("episodic", v ? "yes" : "no")} />
      <ToggleField label={LEAVE_PERIOD_TYPES[2].label} description={LEAVE_PERIOD_TYPES[2].desc} checked={get("reducedSchedule") === "yes"} onChange={(v) => actions.setField("reducedSchedule", v ? "yes" : "no")} />
    </>
  );
}

function FixedTimeOff({ periods, onAdd }: { readonly periods: readonly AbsencePeriod[]; readonly onAdd: () => void }) {
  return (
    <div className="fx-fixed-time-off">
      <div className="fx-subhead"><h3 className="fx-section-title">Fixed Time Off</h3><button type="button" className="fx-ghost" onClick={onAdd}>Add Absence Period</button></div>
      <PeriodTable periods={periods} />
    </div>
  );
}

function PeriodTable({ periods }: { readonly periods: readonly AbsencePeriod[] }) {
  if (periods.length === 0) return <p className="fx-empty-inline">No absence periods added.</p>;
  return (
    <table className="fx-table">
      <thead><tr><th>Last Day Worked</th><th>Start Date</th><th>End Date</th></tr></thead>
      <tbody>{periods.map((p, i) => <tr key={i}><td>{p.lastDayWorked || "—"}</td><td>{p.startDate || "—"}</td><td>{p.endDate || "—"}</td></tr>)}</tbody>
    </table>
  );
}

function ReturnToWork({ actions, get }: StepProps) {
  return (
    <div className="fx-return-to-work">
      <h3 className="fx-section-title">Return to Work Date</h3>
      <FieldRow>
        <DateField label="Expected partial return to work date" value={get("partialReturn")} onChange={(v) => actions.setField("partialReturn", v)} />
        <DateField label="Expected return to work date" value={get("expectedReturn")} onChange={(v) => actions.setField("expectedReturn", v)} />
      </FieldRow>
    </div>
  );
}

function WorkAbsenceDetailsForm({ actions, get }: StepProps) {
  return (
    <>
      <Section title="Work Pattern">
        <p className="fx-info-banner">The defined work week start date for Fifth Third Bank National Association is Monday</p>
      </Section>
      <WorkSchedule />
      <EmploymentLeaveDetails actions={actions} get={get} />
    </>
  );
}

function EmploymentLeaveDetails({ actions, get }: Pick<StepProps, "actions" | "get">) {
  const [hasNearbyWorkforce, setHasNearbyWorkforce] = useState(true);
  return (
    <Section title="Employment Leave Details"><FieldRow>
      <SelectField label="Have you ever had a break in employment?" options={["Please Select", "No", "Yes"]} value={get("breakInEmployment")} onChange={(v) => actions.setField("breakInEmployment", v)} />
      <SelectField label="USA Work State" options={["DE", "ME", "NY", "CA"]} value={get("workState")} onChange={(v) => actions.setField("workState", v)} />
      <TextField label="Hours Worked per Year" value={get("hoursPerYear")} onChange={(v) => actions.setField("hoursPerYear", v)} />
      <CheckboxField label="50 Employees Within 75 Miles"
        checked={hasNearbyWorkforce} onChange={setHasNearbyWorkforce} />
    </FieldRow></Section>
  );
}

function WorkSchedule() {
  return (
    <Section title="Work Schedule">
      <table className="fx-table">
        <thead><tr><th>Pattern Start Date</th><th>Pattern End Date</th><th>Pattern View</th><th>Status</th><th>Last Change Date</th></tr></thead>
        <tbody><tr><td>01/05/2026</td><td>02/13/2027</td><td>Monday–Friday</td><td>Known</td><td>02/13/2026 9:11 pm</td></tr></tbody>
      </table>
    </Section>
  );
}

function AdditionalAbsenceDetailsForm({ actions, get }: StepProps) {
  return (
    <>
      <AdditionalInformation actions={actions} get={get} />
      <HospitalizationDetails actions={actions} get={get} />
    </>
  );
}

function AdditionalInformation({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return (
    <Section title="Absence Additional Information questions for Fifth Third Bank National Association">
      <FieldRow>
        <SelectField label="If you are eligible for FMLA and we require paperwork, would you like us to fax it to the doctor?" options={["Please Select", "No", "Yes"]} value={get("faxDoctor")} onChange={(v) => actions.setField("faxDoctor", v)} />
        <SelectField label="Describe your medical condition/ diagnosis:" options={MEDICAL_CONDITIONS} value={get("medicalCondition")} onChange={(v) => actions.setField("medicalCondition", v)} />
      </FieldRow>
      <TextArea label="Additional detail (if provided):" value={get("additionalDetail")} onChange={(v) => actions.setField("additionalDetail", v)} />
    </Section>
  );
}

function HospitalizationDetails({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return <Section title="Hospitalization Details"><SelectField label="Will the patient be admitted for an overnight stay in a medical facility?" options={YES_NO_UNKNOWN} value={get("overnightStay")} onChange={(v) => actions.setField("overnightStay", v)} /></Section>;
}

function IncidentDetailsForm({ actions, get }: StepProps) {
  return (
    <>
      <RadioGroup legend="Who is the person receiving treatment?" options={["Claimant", "Family Member"]} value={get("receivingTreatment")} onChange={(v) => actions.setField("receivingTreatment", v)} />
      <IncidentFields actions={actions} get={get} />
      <ClaimEmploymentDetails actions={actions} get={get} />
    </>
  );
}

function IncidentFields({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return (
    <Section title="Incident Details"><FieldRow>
      <DateField label="Incurred date" value={get("incurredDate")} onChange={(v) => actions.setField("incurredDate", v)} />
      <SelectField label="Accident / Sickness" options={["Sickness", "Accident"]} value={get("accidentSickness")} onChange={(v) => actions.setField("accidentSickness", v)} />
      <CheckboxField label="Work related" checked={get("workRelated") === "yes"} onChange={(c) => actions.setField("workRelated", c ? "yes" : "no")} />
      <DateField label="Date first unable to work" value={get("firstUnable")} onChange={(v) => actions.setField("firstUnable", v)} />
    </FieldRow></Section>
  );
}

function ClaimEmploymentDetails({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return <Section title="Claim Employment Details"><ClaimEmploymentFields actions={actions} get={get} /></Section>;
}

function ClaimEmploymentFields({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return (
    <FieldRow>
      <CheckboxField label="Spouse working" checked={get("spouseWorking") === "yes"} onChange={(v) => actions.setField("spouseWorking", v ? "yes" : "no")} />
      <DateField label="Last Day Worked" value={get("claimLastDayWorked")} onChange={(v) => actions.setField("claimLastDayWorked", v)} />
      <TextField label="Work history" value={get("workHistory")} onChange={(v) => actions.setField("workHistory", v)} />
      <TextField label="Salary continuance number of days" value={get("salaryContinuanceDays")} onChange={(v) => actions.setField("salaryContinuanceDays", v)} />
      <TextField label="Hours worked" value={get("claimHoursWorked")} onChange={(v) => actions.setField("claimHoursWorked", v)} />
    </FieldRow>
  );
}

function PolicyDetailsForm() {
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <Section title="Policy Details">
      <PolicyTable />
      <div className="fx-form-actions"><button type="button" className="fx-ghost" onClick={() => setNotice("Add policy opened.")}>Add</button><button type="button" className="fx-ghost" disabled>Update</button><button type="button" className="fx-ghost" disabled>Remove</button></div>
      {notice && <p role="status" className="fx-status">{notice}</p>}
    </Section>
  );
}

function PolicyTable() {
  return (
    <table className="fx-table">
      <thead><tr><th>Policy Number</th><th>Product</th><th>Start Date</th><th>Status</th></tr></thead>
      <tbody><tr><td colSpan={4} className="fx-empty-inline">No Records To Display</td></tr></tbody>
    </table>
  );
}

function EarningsDetailsForm({ actions, get }: StepProps) {
  return <Section title="Earning Details"><EarningsFields actions={actions} get={get} /></Section>;
}

function EarningsFields({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return (
    <>
      <FieldRow>
        <DateField label="Effective from" value={get("earningsFrom")} onChange={(v) => actions.setField("earningsFrom", v)} />
        <SelectField label="Earnings basis" options={EARNINGS_BASIS} value={get("earningsBasis")} onChange={(v) => actions.setField("earningsBasis", v)} />
        <TextField label="Earnings amount" value={get("earningsAmount")} onChange={(v) => actions.setField("earningsAmount", v)} />
      </FieldRow>
      <div className="fx-form-actions"><button type="button" className="fx-ghost" onClick={() => actions.setField("earningsAmount", "1997.00")}>Quick Add</button><button type="button" className="fx-ghost" onClick={() => actions.setField("earningsAdded", "yes")}>Add</button></div>
    </>
  );
}

function MedicalDetailsForm({ state, actions, get }: StepProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MedicalProvider provider={state.provider} onAdd={() => setOpen(true)} />
      <MedicalDetailFields state={state} actions={actions} get={get} />
      <DiagnosisCodes state={state} actions={actions} get={get} />
      {open && <ProviderDialog onSelect={actions.setProvider} onClose={() => setOpen(false)} />}
    </>
  );
}

function MedicalProvider({ provider, onAdd }: { readonly provider: ProviderChoice | null; readonly onAdd: () => void }) {
  return (
    <Section title="Medical Provider">
      <p className="fx-detail-value">{provider ? provider.name : "No medical provider identified for this claim."}</p>
      <button type="button" className="fx-primary" onClick={onAdd}>Add Medical Provider</button>
    </Section>
  );
}

function MedicalDetailFields({ actions, get }: StepProps) {
  return (
    <Section title="Medical Details">
      <FieldRow>
        <DateField label="Date of First Treatment" value={get("firstTreatment")} onChange={(v) => actions.setField("firstTreatment", v)} />
        <SelectField label="Condition category" options={CONDITION_CATEGORY} value={get("conditionCategory")} onChange={(v) => actions.setField("conditionCategory", v)} />
      </FieldRow>
      <TextArea label="Condition" value={get("conditionText")} onChange={(v) => actions.setField("conditionText", v)} />
    </Section>
  );
}

function DiagnosisCodes({ actions, get }: StepProps) {
  return (
    <Section title="Diagnosis Codes">
      <FieldRow>
        <SelectField label="Diagnosis code or description" options={DIAGNOSIS_CODES} value={get("diagnosisCode")} onChange={(v) => actions.setField("diagnosisCode", v)} />
        <SelectField label="Level indicator" options={LEVEL_INDICATOR} value={get("levelIndicator")} onChange={(v) => actions.setField("levelIndicator", v)} />
      </FieldRow>
      <DiagnosisActions actions={actions} />
    </Section>
  );
}

function DiagnosisActions({ actions }: { readonly actions: DraftActions }) {
  return (
    <div className="fx-form-actions">
      <button type="button" className="fx-ghost" onClick={() => actions.setField("diagnosisCode", DIAGNOSIS_CODES[1]!)}>Quick Add</button>
      <button type="button" className="fx-ghost" onClick={() => actions.setField("diagnosisAdded", "yes")}>Add</button>
      <button type="button" className="fx-ghost" onClick={() => actions.setField("hospitalizationAdded", "yes")}>Add Hospitalization</button>
    </div>
  );
}

const STEP_FORMS: Readonly<Record<string, (props: StepProps) => ReactNode>> = {
  "notification-details": NotificationDetailsForm,
  "member-occupation": MemberOccupationForm,
  "notification-options": NotificationOptionsForm,
  "reason-for-absence": ReasonForAbsenceForm,
  "dates-of-absence": DatesOfAbsenceForm,
  "work-absence-details": WorkAbsenceDetailsForm,
  "additional-absence-details": AdditionalAbsenceDetailsForm,
  "incident-details": IncidentDetailsForm,
  "policy-details": PolicyDetailsForm,
  "earnings-details": EarningsDetailsForm,
  "medical-details": MedicalDetailsForm,
};

export function StepForm({ slug, state, actions, get }: { readonly slug: string } & StepProps) {
  const Form = STEP_FORMS[slug];
  if (!Form) return null;
  return <Form state={state} actions={actions} get={get} />;
}
