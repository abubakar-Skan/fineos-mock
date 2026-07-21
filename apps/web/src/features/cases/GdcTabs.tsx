import { useState, type ReactNode } from "react";
import { SelectField } from "../intake/fields/controls";
import type { CaseDetailsView } from "../../app/api";
import type { PanelContext } from "./CasePage";
import { DiagnosisPanel } from "./DiagnosisPanel";
import { ProviderFlow } from "./ProviderFlow";
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
  return <section><h2 className="fx-section-title">Claim Summary</h2>
    <div className="fx-detail-grid">
      <ClaimDecision />
      <Incident details={ctx.details} />
      <MedicalSummary details={ctx.details} />
    </div>
    <NextActions details={ctx.details} />
  </section>;
}

function ClaimDecision() {
  return <Panel title="Claim Decision"><Field label="Time to Decision" value="3 days" /></Panel>;
}

function Incident({ details }: { readonly details: CaseDetailsView }) {
  return <Panel title="Incident">
    <Field label="Last Day Worked" value={gdcValue(details, "claimLastDayWorked", "01/07/2026")} />
    <Field label="Accident/Sickness" value={gdcValue(details, "accidentSickness", "Sickness")} />
    <Field label="Condition" value={condition(details)} />
  </Panel>;
}

function MedicalSummary({ details }: { readonly details: CaseDetailsView }) {
  return <Panel title="Medical">
    <Field label="Provider" value={details.provider?.fullName ?? "Not recorded"} />
    <Field label="Date of First Treatment" value={medicalValue(details, "firstTreatment", "01/07/2026")} />
    <Field label="Diagnosis" value={diagnosisSummary(details)} />
  </Panel>;
}

function NextActions({ details }: { readonly details: CaseDetailsView }) {
  if (!isDavidReference(details)) return <p className="fx-empty-inline">No next actions.</p>;
  return <div className="fx-next-actions"><h3 className="fx-section-title">Next Actions</h3>
    <p className="fx-overdue"><strong>Case Eligibility Document failed.</strong> Target date 01/06/2026 OVERDUE</p>
    <p>Escalation Failure determining 3rd party assignees.</p>
  </div>;
}

export function MedicalTab({ ctx }: { readonly ctx: PanelContext }) {
  return <section><h2 className="fx-section-title">Medical Details</h2>
    <MedicalFields details={ctx.details} />
    <DiagnosisPanel ctx={ctx} />
    <ProviderFlow ctx={ctx} />
  </section>;
}

function MedicalFields({ details }: { readonly details: CaseDetailsView }) {
  const [category, setCategory] = useState("Unknown");
  const [pregnant, setPregnant] = useState(false);
  return <div className="fx-medical-fields">
    <label className="fx-field"><span className="fx-field-label">Date First Unable To Work</span>
      <input className="fx-input" value={gdcValue(details, "firstUnable", "01/08/2026")} readOnly /></label>
    <SelectField label="Condition Category" options={CONDITION_CATEGORIES} value={category} onChange={setCategory} />
    <label className="fx-checkbox"><input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} /><span>Pregnant</span></label>
  </div>;
}

const gdcValue = (details: CaseDetailsView, field: string, reference: string): string =>
  isDavidReference(details) ? reference : sectionText(details, "gdcDetails", field) ?? "—";

const medicalValue = (details: CaseDetailsView, field: string, reference: string): string =>
  isDavidReference(details) ? reference : sectionText(details, "medicalDetails", field) ?? "—";

const condition = (details: CaseDetailsView): string =>
  isDavidReference(details)
    ? details.absence?.conditionDescription ?? "Sickness"
    : sectionText(details, "medicalDetails", "conditionText") ?? "Not recorded";

function Panel({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <div className="fx-detail-panel"><h3>{title}</h3>{children}</div>;
}

function Field({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="fx-detail-field"><div className="fx-detail-label">{label}</div><div className="fx-detail-value">{value}</div></div>;
}
