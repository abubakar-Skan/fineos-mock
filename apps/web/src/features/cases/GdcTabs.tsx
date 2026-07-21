import { useState, type ReactNode } from "react";
import type { CaseDetailsView } from "../../app/api";
import type { PanelContext } from "./CasePage";
import { DiagnosisPanel } from "./DiagnosisPanel";
import { ChooseProviderPage, ProviderFlow, type ProviderChoice } from "./ProviderFlow";
import { describeDiagnosis } from "./diagnosis-codes";
import { isDavidReference, sectionText } from "./case-sections";

const CONDITION_CATEGORIES = [
  "Unknown", "Appendectomy", "Hysterectomy", "Gallbladder surgery", "Bunionectomy",
  "Hernia", "Pregnancy", "Broken Bone", "Other Surgery", "Other Condition", "Cancer",
];

const diagnosisSummary = (details: CaseDetailsView): string =>
  details.gdc?.diagnosisCode
    ? `${details.gdc.diagnosisCode}: ${describeDiagnosis(details.gdc.diagnosisCode)}`
    : "Not recorded";

export function ClaimHub({ ctx }: { readonly ctx: PanelContext }) {
  return <section className="fx-claim-hub"><h2 className="fx-section-title">Claim Summary</h2>
    <div className="fx-claim-columns">
      <div><ClaimDecision /><Incident details={ctx.details} /></div>
      <div><ClaimantSummary /><Surgery /></div>
      <div><ReturnToWork /><MedicalSummary details={ctx.details} /></div>
      <ClaimWidgets details={ctx.details} />
    </div>
  </section>;
}

function ClaimDecision() {
  return <Panel title="Claim Decision"><Field label="Time to Decision" value="3 days" /></Panel>;
}

function Incident({ details }: { readonly details: CaseDetailsView }) {
  return <Panel title="Incident">
    <Field label="Last Day Worked" value={gdcValue(details, "claimLastDayWorked", "01/07/2026")} />
    <Field label="Accident/Sickness" value={gdcValue(details, "accidentSickness", "Sickness")} />
    <Field label="☐ Work Related" value="" />
    <Field label="Condition" value={condition(details)} />
    <Field label="Date Symptoms First Appeared" value="-" />
    <Field label="Date First Unable to Work" value="01/08/2026" />
    <Field label="Dismemberment/Loss" value="Unknown" />
  </Panel>;
}

function ClaimantSummary() {
  return <Panel title="Claimant"><Field label="David Hunter" value="" /><Field label="Date Of Birth" value="10/20/1980" />
    <Field label="Marital Status" value="Unknown" /><Field label="Identification Number" value="xxxxx7879 (Social Security Number)" />
    <Field label="Number of Dependents" value="0" /></Panel>;
}

function Surgery() {
  return <Panel title="Surgery"><Field label="Expected (first) Surgery Date" value="01/08/2026" />
    <Field label="Actual (first) Surgery Date" value="-" /><Field label="☐ Outpatient" value="" /></Panel>;
}

function ReturnToWork() {
  return <Panel title="Return To Work"><Field label="Expected return to work date" value="01/23/2026" />
    <Field label="Actual return to work date" value="-" /></Panel>;
}

function MedicalSummary({ details }: { readonly details: CaseDetailsView }) {
  return <Panel title="Medical">
    <Field label="Provider" value={isDavidReference(details) ? "Dhanraj VI" : details.provider?.fullName ?? "Not recorded"} />
    <Field label="Date of First Treatment" value={medicalValue(details, "firstTreatment", "01/07/2026")} />
    <Field label="Life Expectancy" value="Unknown" />
    <Field label="Diagnosis" value={diagnosisSummary(details)} />
    <Field label="Date of Diagnosis" value="-" />
    <Field label="First Day Hospitalized" value="-" />
  </Panel>;
}

function ClaimWidgets({ details }: { readonly details: CaseDetailsView }) {
  if (!isDavidReference(details)) return <p className="fx-empty-inline">No next actions.</p>;
  return <aside className="fx-claim-widgets"><Widget title="Key Documents (0)">There are no documents marked across this case or its sub-cases.</Widget>
    <Widget title="Shared Notes">-</Widget>
    <Widget title="Next Actions (2)"><p className="fx-link">NTN-159898-GDC-02 - Automation</p><b>Case Eligibility Document failed.</b>
      <p>Target date 01/06/2026 <span className="fx-overdue">OVERDUE</span></p>
      <p className="fx-link">NTN-159898-GDC-02 - Escalate</p><b>Escalation Failure determining 3rd party assignees.</b></Widget>
  </aside>;
}

function Widget({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <section className="fx-claim-widget"><h3>{title}</h3><div>{children}</div></section>;
}

export function MedicalTab({ ctx }: { readonly ctx: PanelContext }) {
  const attach = (choice: ProviderChoice): void => {
    ctx.workflow.setProviderDecision({ kind: "attach", provider: choice });
    ctx.setChoosing(false);
  };
  if (ctx.choosing) return <ChooseProviderPage onAttach={attach} onClose={() => ctx.setChoosing(false)} />;
  return <section className="fx-medical-page"><h2 className="fx-section-title">Medical Details</h2>
    <MedicalFields details={ctx.details} />
    <DiagnosisPanel ctx={ctx} />
    <div className="fx-medical-accordions"><h3>⊕ Restrictions And Limitations</h3><h3>⊖ Hospitalization Dates</h3>
      <div className="fx-hospital-head"><span>Start Date</span><span>End Date</span><span>End Date Confirmed</span><span>Facility</span><span>Hospitalization Type</span><span>Description</span></div>
      <p>No Records To Display</p></div>
    <ProviderFlow decision={ctx.workflow.providerDecision}
      onAdd={() => ctx.setChoosing(true)}
      onSkip={() => ctx.workflow.setProviderDecision({ kind: "skip" })} />
  </section>;
}

function MedicalFields({ details }: { readonly details: CaseDetailsView }) {
  const [category, setCategory] = useState("Unknown");
  const [pregnant, setPregnant] = useState(false);
  const [open, setOpen] = useState(false);
  return <div className="fx-medical-form">
    <div>
      <MedicalControl label="Date First Unable To Work" value={gdcValue(details, "firstUnable", "01/08/2026")} />
      <MedicalControl label="Date Symptoms First Appeared" value="MM/DD/YYYY" />
      <MedicalControl label="TPD Definition" value="Unknown⌄" />
      <MedicalControl label="Date of First Treatment" value="01/07/2026" />
      <MedicalControl label="Medical Authorization Received" value="MM/DD/YYYY" tall />
      <MedicalControl label="Last Medical Info Received" value="MM/DD/YYYY" tall />
      <MedicalControl label="Claimant Dominant Side" value="Unknown⌄" />
      <ConditionCategory value={category} open={open} onOpen={setOpen} onChange={setCategory} />
      <MedicalControl label="Contest Pre-Existing Condition" value="□" />
      <MedicalControl label="Expected (first) Surgery Date" value="01/08/2026" tall />
      <MedicalControl label="Outpatient" value="□" />
      <MedicalControl label="Facility" value="-　⌕" />
      <MedicalControl label="Next Treatment/Office Visit Date" value="MM/DD/YYYY" />
      <MedicalControl label="Name of Surgery or Procedure" value="-" />
    </div>
    <div>
      <MedicalControl label="Dismemberment Or Loss" value="Unknown⌄" />
      <MedicalControl label="TPD Sub Definition" value="Unknown⌄" />
      <MedicalControl label="Condition" value="Sickness" area />
      <MedicalControl label="Treatment Plan" value="" area />
      <MedicalControl label="Last Medical Info Requested" value="MM/DD/YYYY" tall />
      <label className="fx-medical-check"><strong>Pregnant</strong><input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} /></label>
      <MedicalControl label="Life Expectancy" value="Unknown⌄" tall />
      <MedicalControl label="Actual (first) Surgery Date" value="MM/DD/YYYY" />
      <MedicalControl label="Type of Surgery" value="Medically Necessary⌄" />
      <MedicalControl label="Most Recent Treatment/Office Visit Date" value="MM/DD/YYYY" tall />
    </div>
  </div>;
}

function ConditionCategory({ value, open, onOpen, onChange }: { readonly value: string; readonly open: boolean; readonly onOpen: (open: boolean) => void; readonly onChange: (value: string) => void }) {
  return <label className="fx-medical-control fx-condition-category"><strong>Condition Category</strong><span>
    <select aria-label="Condition Category" value={value} onFocus={() => onOpen(true)}
      onChange={(event) => { onChange(event.target.value); onOpen(false); }}>
      {CONDITION_CATEGORIES.map((option) => <option key={option}>{option}</option>)}
    </select>{open && <ul aria-hidden="true">{CONDITION_CATEGORIES.map((option) => <li key={option}>{option}</li>)}</ul>}
  </span></label>;
}

function MedicalControl({ label, value, area, tall }: { readonly label: string; readonly value: string; readonly area?: boolean; readonly tall?: boolean }) {
  const className = `fx-medical-control${area ? " fx-medical-control--area" : ""}${tall ? " fx-medical-control--tall" : ""}`;
  return <div className={className}><strong>{label}</strong><span>{value}</span></div>;
}

const gdcValue = (details: CaseDetailsView, field: string, reference: string): string =>
  isDavidReference(details) ? reference : sectionText(details, "gdcDetails", field) ?? "—";

const medicalValue = (details: CaseDetailsView, field: string, reference: string): string =>
  isDavidReference(details) ? reference : sectionText(details, "medicalDetails", field) ?? "—";

const condition = (details: CaseDetailsView): string =>
  isDavidReference(details)
    ? "Sickness"
    : sectionText(details, "medicalDetails", "conditionText") ?? "Not recorded";

function Panel({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <div className="fx-detail-panel"><h3>{title}</h3>{children}</div>;
}

function Field({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="fx-detail-field"><div className="fx-detail-label">{label}</div><div className="fx-detail-value">{value}</div></div>;
}
