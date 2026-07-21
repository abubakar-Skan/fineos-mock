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
  readonly openField?: string | null;
}

const NOTIFICATION_SOURCES = ["Unknown", "Phone", "Paper", "Fax", "Email", "Mail/Post", "Chat", "Split Experience Portal", "Split Experience Phone", "Data Failure"];
const NOTIFIED_BY = ["Requester", "Employee", "Employer", "Other"];
const ABSENCE_RELATES = ["Employee", "Family Member", "Other"];
const ABSENCE_REASONS = ["Please Select", "Serious Health Condition", "Pregnancy/Maternity", "Bonding with a new child", "Military Exigency"];
const QUALIFIER1 = ["Please Select", "Not Work Related", "Work Related"];
const QUALIFIER2 = ["Please Select", "Sickness", "Accident / Injury"];
const YES_NO_UNKNOWN = ["Unknown", "No", "Yes"];
const EMPLOYMENT_STATUS = ["Active", "Inactive", "Terminated"];
const OCCUPATION_CATEGORY = ["Unknown", "Sedentary", "Light", "Medium", "Heavy"];
const EARNINGS_BASIS = ["Weekly", "Bi-Weekly", "Monthly", "Annual"];
const LEVEL_INDICATOR = ["Primary", "Secondary", "Contributing"];
const MEDICAL_CONDITIONS = ["Not Applicable", "Unknown", "Auditory", "Autoimmune disorder", "Back", "Cancer", "Cardiovascular", "Coronavirus", "Diabetes", "Digestive", "Pregnancy"];
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

function NotificationDetailsForm({ actions, get, openField }: StepProps) {
  return (
    <>
      <NotificationSource actions={actions} get={get} openField={openField} />
      <RequesterDetails />
    </>
  );
}

function NotificationSource({ actions, get, openField }: Pick<StepProps, "actions" | "get" | "openField">) {
  return (
    <Section title="Notification Source"><FieldRow>
      <SelectField label="Notification source" options={NOTIFICATION_SOURCES} value={get("source")} open={openField === "source"} onChange={(v) => actions.setField("source", v)} />
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
      <ReportingAdministrativeGroup />
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
    <section>
      <h3 className="fx-section-title fx-section-title--action">Occupation Details<span className="fx-link">Edit</span></h3>
      <OccupationFieldGrid actions={actions} get={get} />
      <OccupationVerification />
    </section>
  );
}

function OccupationFieldGrid({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return (
    <div className="fx-occupation-grid">
      <TextField label="Job title" value={get("jobTitle")} onChange={(v) => actions.setField("jobTitle", v)} />
      <SelectField label="Employment status" options={EMPLOYMENT_STATUS} value={get("employmentStatus")} onChange={(v) => actions.setField("employmentStatus", v)} />
      <DateField label="Date of hire" value={get("dateOfHire")} onChange={(v) => actions.setField("dateOfHire", v)} />
      <DateField label="Date job ended" value={get("dateJobEnded")} onChange={(v) => actions.setField("dateJobEnded", v)} />
      <StaticField label="Work site" value="-" />
      <StaticField label="Work site address" value="-" />
      <StaticField label="Organisation unit" value="-" />
      <SelectField label="Occupation category" options={OCCUPATION_CATEGORY} value={get("occupationCategory")} onChange={(v) => actions.setField("occupationCategory", v)} />
      <TextField label="Hours worked per week" value={get("hoursPerWeek")} onChange={(v) => actions.setField("hoursPerWeek", v)} />
      <StaticField label="Employee ID" value="23456876" />
      <SelectField label="Job strenuous" options={YES_NO_UNKNOWN} value={get("jobStrenuous")} onChange={(v) => actions.setField("jobStrenuous", v)} />
    </div>
  );
}

function StaticField({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="fx-field fx-field--static"><span className="fx-field-label">{label}</span><span className="fx-detail-value">{value}</span></div>;
}

function OccupationVerification() {
  return (
    <div className="fx-occupation-verify" role="radiogroup" aria-label="Occupation verification">
      <label className="fx-radio"><input type="radio" name="occupation-verify" /><span>Unverified</span></label>
      <label className="fx-radio"><input type="radio" name="occupation-verify" defaultChecked /><span>Verified</span></label>
      <span className="fx-verify-check" aria-hidden="true">✔</span>
      <span className="fx-link">Reverify</span>
    </div>
  );
}

function ReportingAdministrativeGroup() {
  return (
    <Section title="Reporting Administrative Group">
      <div className="fx-detail-field"><div className="fx-detail-label">Admin group</div><div className="fx-detail-value">Unknown</div></div>
    </Section>
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
      <ToggleField label="Request a Leave" description="Warning: EE Centric API applied Employer level default due to Employer Eligibility feed being not trustworthy. Please review carefully if applicable cases apply to Employee." checked={flags.requestLeave} onChange={(v) => onFlag("requestLeave", v)} />
      <ToggleField label="Request an Accommodation" description="The requester may be entitled to an accommodation as there is an active service agreement and the employer is serviced for accommodations." checked={flags.requestAccommodation} onChange={(v) => onFlag("requestAccommodation", v)} />
      <ToggleField label="Group Disability Claim" description="Warning: EE Centric API applied Employer level default due to Employer Eligibility feed being not trustworthy. Please review carefully if applicable cases apply to Employee." checked={flags.requestGdc} onChange={(v) => onFlag("requestGdc", v)} />
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

function DatesOfAbsenceForm({ state, actions, get, openField }: StepProps) {
  const [open, setOpen] = useState(false);
  const selectionOnly = openField === "periodSelection";
  return (
    <Section title="Leave Periods">
      <LeavePeriodToggles actions={actions} get={get} />
      {!selectionOnly && <FixedTimeOff periods={state.periods} inline={openField === "absencePeriod"} onAdd={() => setOpen(true)} />}
      {!selectionOnly && openField !== "absencePeriod" && <ReturnToWork state={state} actions={actions} get={get} />}
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

function FixedTimeOff({ periods, inline, onAdd }: { readonly periods: readonly AbsencePeriod[]; readonly inline: boolean; readonly onAdd: () => void }) {
  return (
    <div className="fx-fixed-time-off">
      <div className="fx-subhead"><h3 className="fx-section-title">Fixed Time Off</h3><button type="button" className="fx-ghost" onClick={onAdd}>Add Absence Period</button></div>
      {inline ? <InlineAbsencePeriod /> : <PeriodTable periods={periods} />}
    </div>
  );
}

function InlineAbsencePeriod() {
  return <div className="fx-inline-period"><InlinePeriodTop /><InlinePeriodDate label="Absence start date" /><InlinePeriodDate label="Absence end date" />
    <label className="fx-field fx-inline-period-question"><span className="fx-field-label">Are the days in between your last day worked and absence start date non-scheduled work days or unrelated to your leave reason/condition?</span><input className="fx-input" /></label>
    <button type="button" className="fx-ghost fx-inline-period-add" disabled>Add</button></div>;
}

function InlinePeriodTop() {
  return <div className="fx-inline-period-row"><label className="fx-field"><span className="fx-field-label">Absence status</span><select className="fx-select" defaultValue=""><option value="">Please Select</option></select></label>
    <label className="fx-field"><span className="fx-field-label">Last day worked</span><input className="fx-input" placeholder="MM/DD/YYYY" /></label></div>;
}

function InlinePeriodDate({ label }: { readonly label: string }) {
  return <div className="fx-inline-period-row"><label className="fx-field"><span className="fx-field-label">{label}</span><input className="fx-input" placeholder="MM/DD/YYYY" /></label>
    <label className="fx-checkbox"><input type="checkbox" defaultChecked readOnly /><span>All day</span></label>
    <span className="fx-inline-time"><b>Time absent</b><input className="fx-input" defaultValue="0" readOnly /> HH <input className="fx-input" defaultValue="0" readOnly /> MM</span></div>;
}

function PeriodTable({ periods }: { readonly periods: readonly AbsencePeriod[] }) {
  if (periods.length === 0) return <p className="fx-empty-inline">No absence periods added.</p>;
  return (
    <div className="fx-period-grid"><table className="fx-table">
      <thead><tr><th>Last Day Worked</th><th>Start Date</th><th>End Date</th><th>Absence Status</th><th>Pattern Type</th></tr></thead>
      <tbody>{periods.map((p, i) => <tr key={i}><td>{p.lastDayWorked || "—"}</td><td><span>{p.startDate || "—"}</span> All Day</td><td><span>{p.endDate || "—"}</span> All Day</td><td>Known</td><td>Continuous</td></tr>)}</tbody>
    </table><div className="fx-period-actions" aria-hidden="true">{["Add", "View", "Edit", "Delete"].map((action) => <span key={action}>{action}</span>)}</div>
    <div className="fx-period-grid-foot">↻ &nbsp; ◌ &nbsp; ↗ <span>1-1 of 1</span></div></div>
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

function WorkAbsenceDetailsForm({ actions, get, openField }: StepProps) {
  if (openField === "employment") return <EmploymentLeavePreview />;
  return (
    <>
      <Section title="Work Pattern">
        <p className="fx-info-banner">The defined work week start date for Fifth Third Bank National Association is Monday</p>
      </Section>
      <WorkSchedule />
      {openField !== "workSchedule" && <EmploymentLeaveDetails actions={actions} get={get} />}
    </>
  );
}

function EmploymentLeavePreview() {
  return <div className="fx-employment-preview"><div className="fx-employment-questions"><PreviewSelect label="Have you ever had a break in employment?" /><PreviewSelect label="Have you served in the military in the last 12 months?" /></div>
    <Section title="Employment Leave Details"><div className="fx-employment-preview-grid">
      <PreviewInput label="Adjusted Date of Hire" value="MM/DD/YYYY" /><PreviewInput label="Manager" value="-  ◯  ×" /><PreviewSelect label="USA Work State" value="DE" /><PreviewCheck label="Key Employee" />
      <PreviewCheck label="Work at Home" /><PreviewSelect label="Employment Type" value="Permanent" /><PreviewInput label="CBA Value" /><PreviewInput label="Hours Worked per Year" value="2000" />
      <PreviewCheck label="50 Employees Within 75 Miles" checked /><OccupationQualifiers /></div></Section></div>;
}

function PreviewInput({ label, value = "" }: { readonly label: string; readonly value?: string }) {
  return <label className="fx-field"><span className="fx-field-label">{label}</span><input className="fx-input" value={value} readOnly /></label>;
}

function PreviewSelect({ label, value = "Please Select" }: { readonly label: string; readonly value?: string }) {
  return <label className="fx-field"><span className="fx-field-label">{label}</span><select className="fx-select" value={value} disabled><option>{value}</option></select></label>;
}

function PreviewCheck({ label, checked = false }: { readonly label: string; readonly checked?: boolean }) {
  return <label className="fx-checkbox"><input type="checkbox" checked={checked} readOnly disabled /><span>{label}</span></label>;
}

function OccupationQualifiers() {
  return <div className="fx-occupation-qualifiers"><strong>Occupation Qualifiers</strong>{["ADAJobFamily", "Baylor", "Baylor 32", "Baylor 40", "Baylor Employees", "Client Defined Full Time", "Exempt", "Expat"].map((label) => <span key={label}>□ {label}</span>)}</div>;
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
    <section className="fx-work-panel"><h3 className="fx-section-title">Work Schedule</h3>
      <div className="fx-work-panel-head">⌄ &nbsp; <strong>Work Pattern</strong><button type="button" disabled>Add</button></div>
      <table className="fx-table"><thead><tr><th></th><th>Pattern Start Date</th><th>Pattern End Date</th><th>Pattern View</th><th>Status</th><th>Last Change Date</th><th>Actions</th></tr></thead>
        <tbody><tr><td>＋</td><td>01/05/2026</td><td>02/13/2027</td><td><span className="fx-pattern-bar" /></td><td>Known</td><td>02/13/2026<br />9:11 pm</td><td>♢ &nbsp; Edit</td></tr></tbody></table>
      <div className="fx-work-calendar">⌄ &nbsp; <strong>Work Calendar</strong></div></section>
  );
}

function AdditionalAbsenceDetailsForm({ actions, get, openField }: StepProps) {
  return (
    <>
      <AdditionalInformation actions={actions} get={get} openField={openField} />
      <HospitalizationDetails actions={actions} get={get} openField={openField} />
    </>
  );
}

function AdditionalInformation({ actions, get, openField }: Pick<StepProps, "actions" | "get" | "openField">) {
  return (
    <Section title="Absence Additional Information questions for Fifth Third Bank National Association">
      <div className="fx-q-grid">
        <SelectField label="If you are eligible for FMLA and we require paperwork, would you like us to fax it to the doctor?" options={["Please Select", "No", "Yes"]} value={get("faxDoctor")} onChange={(v) => actions.setField("faxDoctor", v)} />
        <TextArea label="If yes, you will be prompted to document who the paperwork should be faxed to and the fax number." value={get("faxDetails")} onChange={(v) => actions.setField("faxDetails", v)} />
        <SelectField label="If we receive incomplete paperwork from your doctor, would you like us to fax it back to them?" options={["Please Select", "No", "Yes"]} value={get("incompleteFax")} onChange={(v) => actions.setField("incompleteFax", v)} />
        <SelectField label="Describe your medical condition/ diagnosis:" options={MEDICAL_CONDITIONS} value={get("medicalCondition")} open={openField === "medicalCondition"} onChange={(v) => actions.setField("medicalCondition", v)} />
      </div>
      <div className="fx-additional-detail"><TextArea label="Additional detail (if provided):" value={get("additionalDetail")} onChange={(v) => actions.setField("additionalDetail", v)} /></div>
    </Section>
  );
}

function HospitalizationDetails({ actions, get, openField }: Pick<StepProps, "actions" | "get" | "openField">) {
  return <Section title="Hospitalization Details"><SelectField label="Will the patient be admitted for an overnight stay in a medical facility?" options={YES_NO_UNKNOWN} value={get("overnightStay")} open={openField === "overnightStay"} onChange={(v) => actions.setField("overnightStay", v)} /></Section>;
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
    <Section title="Incident Details"><div className="fx-incident-grid">
      <DateField label="Incurred date" value={get("incurredDate")} onChange={(v) => actions.setField("incurredDate", v)} />
      <SelectField label="Accident / Sickness" options={["Sickness", "Accident"]} value={get("accidentSickness")} onChange={(v) => actions.setField("accidentSickness", v)} />
      <DateField label="Accident date" value={get("accidentDate")} onChange={(v) => actions.setField("accidentDate", v)} />
      <p className="fx-info-banner">The following questions only apply if the person receiving treatment is the insured.</p>
      <CheckboxField label="Work related" checked={get("workRelated") === "yes"} onChange={(c) => actions.setField("workRelated", c ? "yes" : "no")} />
      <TextField label="Number of dependents" value={get("dependents")} onChange={(v) => actions.setField("dependents", v)} />
      <DateField label="Date first unable to work" value={get("firstUnable")} onChange={(v) => actions.setField("firstUnable", v)} />
      <DateField label="Expected return to work date" value={get("expectedReturn")} onChange={(v) => actions.setField("expectedReturn", v)} />
    </div></Section>
  );
}

function ClaimEmploymentDetails({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return <Section title="Claim Employment Details"><ClaimEmploymentFields actions={actions} get={get} />
    <TextField label="Are the days in between your last day worked and absence start date non-scheduled work days or unrelated to your leave reason/condition?" value={get("daysBetween")} onChange={(v) => actions.setField("daysBetween", v)} /></Section>;
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
      <div className="fx-grid-actions"><button type="button" className="fx-ghost" disabled>Update</button><button type="button" className="fx-ghost" onClick={() => setNotice("Add policy opened.")}>Add</button><button type="button" className="fx-ghost" disabled>Remove</button></div>
      {notice && <p role="status" className="fx-status">{notice}</p>}
    </Section>
  );
}

function PolicyTable() {
  return (
    <div className="fx-intake-data-grid"><table className="fx-table">
      <thead><tr><th>Policy Number</th><th>Product</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Business Code</th><th>Issue State</th></tr></thead>
      <tbody><tr><td colSpan={7} className="fx-empty-inline">No Records To Display</td></tr></tbody>
    </table></div>
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
        <DateField label="Effective to" value={get("earningsTo")} onChange={(v) => actions.setField("earningsTo", v)} />
        <SelectField label="Earnings basis" options={EARNINGS_BASIS} value={get("earningsBasis")} onChange={(v) => actions.setField("earningsBasis", v)} />
        <TextField label="Earnings amount" value={get("earningsAmount")} onChange={(v) => actions.setField("earningsAmount", v)} />
        <button type="button" className="fx-ghost fx-quick-add" onClick={() => actions.setField("earningsAmount", "1997.00")}>Quick Add</button>
      </FieldRow>
      <EarningsTable onAdd={() => actions.setField("earningsAdded", "yes")} />
      <OtherBenefits />
    </>
  );
}

function EarningsTable({ onAdd }: { readonly onAdd: () => void }) {
  return <div className="fx-earning-grid fx-intake-data-grid"><table className="fx-table"><thead><tr><th>Type</th><th>Effective From</th><th>Effective To</th><th>Paid Date</th><th>Actual Gross</th><th>Actual Net</th><th>Contractual Earnings</th><th>Contractual Earnings Basis</th></tr></thead>
    <tbody><tr><td>Wages</td><td>05/14/2022</td><td>-</td><td>-</td><td>-</td><td>-</td><td>1,997.00</td><td>Weekly</td></tr></tbody></table>
    <div className="fx-grid-actions"><button type="button" className="fx-ghost" onClick={onAdd}>Add</button>{["Edit", "View", "Remove"].map((label) => <button type="button" className="fx-ghost" disabled key={label}>{label}</button>)}</div></div>;
}

function OtherBenefits() {
  return <section className="fx-other-benefits"><h3 className="fx-section-title">Other Benefits</h3><div className="fx-intake-data-grid"><table className="fx-table"><thead><tr><th>Name</th><th>Start Date</th><th>End Date</th><th>Amount</th><th>Frequency</th><th>Received From</th></tr></thead></table></div></section>;
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
      {!provider && <span className="fx-medical-empty-icon" aria-hidden="true">♟</span>}
      <p className="fx-detail-value"><strong>{provider ? provider.name : "No medical provider"}</strong><br />{provider ? "Medical provider identified for this claim." : "No medical provider information has been added for this claim."}</p>
      {!provider && <span className="fx-visually-hidden">No medical provider identified for this claim.</span>}
      <button type="button" className="fx-primary" onClick={onAdd}>Add Medical Provider</button>
    </Section>
  );
}

function MedicalDetailFields({ actions, get }: StepProps) {
  return (
    <Section title="Medical Details">
      <div className="fx-medical-grid"><MedicalDates actions={actions} get={get} /><MedicalConditionFields actions={actions} get={get} /><SurgeryFields actions={actions} get={get} /></div>
    </Section>
  );
}

function MedicalDates({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return <><DateField label="Date of First Treatment" value={get("firstTreatment")} onChange={(v) => actions.setField("firstTreatment", v)} />
    <DateField label="Medical authorization received" value={get("medicalAuthorization")} onChange={(v) => actions.setField("medicalAuthorization", v)} />
    <DateField label="Last medical info received" value={get("lastMedicalReceived")} onChange={(v) => actions.setField("lastMedicalReceived", v)} />
    <DateField label="Last medical info requested" value={get("lastMedicalRequested")} onChange={(v) => actions.setField("lastMedicalRequested", v)} /></>;
}

function MedicalConditionFields({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return <><SelectField label="Condition category" options={CONDITION_CATEGORY} value={get("conditionCategory")} onChange={(v) => actions.setField("conditionCategory", v)} />
    <CheckboxField label="Pregnant" checked={get("pregnant") === "yes"} onChange={(v) => actions.setField("pregnant", v ? "yes" : "no")} />
    <CheckboxField label="Contest pre-existing condition" checked={get("preExisting") === "yes"} onChange={(v) => actions.setField("preExisting", v ? "yes" : "no")} />
    <DateField label="Most Recent Treatment/Office Visit Date" value={get("mostRecentTreatment")} onChange={(v) => actions.setField("mostRecentTreatment", v)} />
    <DateField label="Next Treatment/Office Visit Date" value={get("nextTreatment")} onChange={(v) => actions.setField("nextTreatment", v)} />
    <TextArea label="Condition" value={get("conditionText")} onChange={(v) => actions.setField("conditionText", v)} />
    <TextArea label="Treatment plan" value={get("treatmentPlan")} onChange={(v) => actions.setField("treatmentPlan", v)} />
    <SelectField label="Life expectancy" options={["Unknown", "Normal", "Reduced"]} value={get("lifeExpectancy")} onChange={(v) => actions.setField("lifeExpectancy", v)} /></>;
}

function SurgeryFields({ actions, get }: Pick<StepProps, "actions" | "get">) {
  return <><DateField label="Surgery date" value={get("surgeryDate")} onChange={(v) => actions.setField("surgeryDate", v)} />
    <CheckboxField label="Outpatient" checked={get("outpatient") === "yes"} onChange={(v) => actions.setField("outpatient", v ? "yes" : "no")} />
    <SelectField label="Type of surgery" options={["Unknown", "Inpatient", "Outpatient"]} value={get("surgeryType")} onChange={(v) => actions.setField("surgeryType", v)} />
    <TextField label="Facility" value={get("facility")} onChange={(v) => actions.setField("facility", v)} />
    <TextField label="Name of Surgery or Procedure" value={get("surgeryName")} onChange={(v) => actions.setField("surgeryName", v)} /></>;
}

function DiagnosisCodes({ actions, get }: StepProps) {
  return (
    <Section title="Diagnosis Codes">
      <div className="fx-diagnosis-entry">
        <SelectField label="Diagnosis code or description" options={DIAGNOSIS_CODES} value={get("diagnosisCode")} onChange={(v) => actions.setField("diagnosisCode", v)} />
        <SelectField label="Level indicator" options={LEVEL_INDICATOR} value={get("levelIndicator")} onChange={(v) => actions.setField("levelIndicator", v)} />
        <button type="button" className="fx-ghost" onClick={() => actions.setField("diagnosisCode", DIAGNOSIS_CODES[1]!)}>Quick Add</button>
      </div>
      <DiagnosisTable onAdd={() => actions.setField("diagnosisAdded", "yes")} />
      <HospitalizationEmpty onAdd={() => actions.setField("hospitalizationAdded", "yes")} />
    </Section>
  );
}

function DiagnosisTable({ onAdd }: { readonly onAdd: () => void }) {
  return <div className="fx-diagnosis-table fx-intake-data-grid"><table className="fx-table"><thead><tr><th>Level</th><th>Type</th><th>Code</th><th>Description</th><th>Severity</th><th>Effective From</th><th>Effective To</th></tr></thead>
    <tbody><tr><td colSpan={7} className="fx-empty-inline">No Records To Display</td></tr></tbody></table>
    <div className="fx-grid-actions"><button type="button" className="fx-ghost" onClick={onAdd}>Add</button><button type="button" className="fx-ghost" disabled>Open</button><button type="button" className="fx-ghost" disabled>Remove</button></div></div>;
}

function HospitalizationEmpty({ onAdd }: { readonly onAdd: () => void }) {
  return <section className="fx-hospital-empty"><h3 className="fx-section-title">Hospitalization Details</h3><span className="fx-medical-empty-icon" aria-hidden="true">♟</span>
    <p><strong>No hospitalization details</strong><br />No hospitalization information has been added for this claim.</p>
    <button type="button" className="fx-primary" onClick={onAdd}>Add Hospitalization</button></section>;
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

export function StepForm({ slug, state, actions, get, openField }: { readonly slug: string } & StepProps) {
  const Form = STEP_FORMS[slug];
  if (!Form) return null;
  return <Form state={state} actions={actions} get={get} openField={openField} />;
}
