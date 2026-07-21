import { useState } from "react";
import { createProvider } from "../../app/api";
import { TextField } from "../intake/fields/controls";

export interface ProviderChoice {
  readonly id: string;
  readonly name: string;
}

export type ProviderSelectionDecision =
  | { readonly kind: "attach"; readonly provider: ProviderChoice }
  | { readonly kind: "skip" };

const PAGE_TITLE = "Choose the Party to have a role of Medical Provider";
const SEARCH_BY = ["Person", "Organization", "Both"] as const;
const KNOWN_PROVIDERS: readonly ProviderChoice[] = [
  { id: "PTY-TRAVIS", name: "Travis Larson" },
  { id: "PTY-TRAVIS-DR", name: "Travis Larson R Dr" },
];

interface FlowProps {
  readonly decision: ProviderSelectionDecision;
  readonly onAdd: () => void;
  readonly onSkip: () => void;
}

export function ProviderFlow({ decision, onAdd, onSkip }: FlowProps) {
  return <section><h2 className="fx-section-title">Medical Provider</h2>
    <ProviderStatus decision={decision} />
    <div className="fx-form-actions">
      <button type="button" className="fx-primary" onClick={onAdd}>Add Medical Provider</button>
      <button type="button" className="fx-ghost" onClick={onSkip}>Skip Provider</button>
    </div>
  </section>;
}

function ProviderStatus({ decision }: { readonly decision: ProviderSelectionDecision }) {
  if (decision.kind === "attach") return <p className="fx-detail-value">{decision.provider.name}</p>;
  return <p className="fx-detail-value">No medical provider will be attached.</p>;
}

// The captured execution flow renders "Choose the Party" as a full record-body
// view (bright left rail + header preserved), not a dimmed modal. Result rows
// open a read-only Provider Details window; "Add Person" opens a create modal.
export function ChooseProviderPage({ onAttach, onClose }: { readonly onAttach: (choice: ProviderChoice) => void; readonly onClose: () => void }) {
  const [view, setView] = useState<{ readonly step: "details"; readonly choice: ProviderChoice } | { readonly step: "add" } | null>(null);
  return <div className="fx-choose-party" role="dialog" aria-label={PAGE_TITLE}>
    {!view && <ProviderTabs />}
    {!view && <SearchByBand />}
    {!view && <ProviderSearchForm onView={(choice) => setView({ step: "details", choice })} onAdd={() => setView({ step: "add" })} />}
    {view?.step === "details" && <ProviderDetailsWindow choice={view.choice} onAttach={onAttach} onClose={() => setView(null)} />}
    {view?.step === "add" && <AddPersonModal onCreate={onAttach} onCancel={() => { setView(null); onClose(); }} />}
  </div>;
}

function ProviderTabs() {
  return <div className="fx-provider-tabs"><span className="fx-provider-tab">Party</span>
    <span className="fx-provider-tab fx-provider-tab--on">Provider</span><span className="fx-provider-tab">Recent</span></div>;
}

function SearchByBand() {
  return <div className="fx-provider-searchby"><span>Search by:</span>
    {SEARCH_BY.map((option) => (
      <label key={option} className="fx-radio"><input type="radio" name="providerSearchBy" defaultChecked={option === "Person"} /><span>{option}</span></label>
    ))}
  </div>;
}

function ProviderSearchForm({ onView, onAdd }: { readonly onView: (choice: ProviderChoice) => void; readonly onAdd: () => void }) {
  const [first, setFirst] = useState("Travis");
  const [last, setLast] = useState("Larson");
  const [results, setResults] = useState<readonly ProviderChoice[]>([]);
  return <div className="fx-provider-body">
    <span className="fx-provider-help" aria-hidden="true">i</span>
    <SearchGrid first={first} last={last} onFirst={setFirst} onLast={setLast} />
    <ProviderCriteria />
    <div className="fx-provider-actions">
      <button type="button" className="fx-step-btn" onClick={() => setResults(KNOWN_PROVIDERS)}>Search</button>
      <button type="button" className="fx-step-btn" onClick={onAdd}>Add Person</button>
    </div>
    <ProviderResults results={results} onView={onView} />
  </div>;
}

interface SearchGridProps {
  readonly first: string; readonly last: string;
  readonly onFirst: (v: string) => void; readonly onLast: (v: string) => void;
}

function SearchGrid({ first, last, onFirst, onLast }: SearchGridProps) {
  return <div className="fx-provider-grid">
    <div className="fx-provider-col">
      <TextField label="First Name" value={first} onChange={onFirst} />
      <DisplayField label="Date of Birth" calendar />
      <DisplayField label="Policy Number" />
      <DisplayField label="Phone" />
      <DisplayField label="Provider ID" />
    </div>
    <div className="fx-provider-col">
      <TextField label="Last Name" value={last} onChange={onLast} />
      <DisplayField label="Identification Number" />
      <DisplayField label="Customer Number" />
      <DisplayField label="Zip Code" />
      <DisplayField label="Practice ID" />
    </div>
  </div>;
}

function DisplayField({ label, calendar }: { readonly label: string; readonly calendar?: boolean }) {
  return <div className="fx-field"><span className="fx-field-label">{label}</span>
    <span className="fx-display-input">{calendar && <span className="fx-display-cal" aria-hidden="true">▦</span>}</span></div>;
}

function ProviderCriteria() {
  return <div className="fx-provider-criteria">
    <div className="fx-provider-role"><strong>Current Provider Role/Other ID</strong><span className="fx-faux-check">✓</span></div>
    <div className="fx-provider-cert"><strong>Certification Group</strong><span className="fx-display-select">Unknown⌄</span>
      <strong>Certifications Type</strong><span className="fx-display-select fx-display-select--wide">Unknown⌄</span></div>
  </div>;
}

function ProviderResults({ results, onView }: { readonly results: readonly ProviderChoice[]; readonly onView: (choice: ProviderChoice) => void }) {
  return <div className="fx-provider-results">
    <p className="fx-results-title">Person Search Results</p>
    <table className="fx-table fx-results-table">
      <thead><tr><th>Type</th><th>Name</th><th>Fax Number</th><th>Phone Number</th></tr></thead>
      <tbody>{results.map((choice, index) => (
        <tr key={choice.id} className={index === 0 ? "fx-row--sel" : undefined}>
          <td>Agent</td>
          <td><button type="button" className="fx-result" onClick={() => onView(choice)}>{choice.name}</button></td>
          <td /><td />
        </tr>
      ))}</tbody>
    </table>
  </div>;
}

// Read-only Provider Details window over the (hidden) search page. Static
// display fields mirror the source; the only interactive controls are Attach
// and Back, matching the captured read-only screen and the control audit.
function ProviderDetailsWindow({ choice, onAttach, onClose }: { readonly choice: ProviderChoice; readonly onAttach: (choice: ProviderChoice) => void; readonly onClose: () => void }) {
  return <div className="fx-provider-window" role="dialog" aria-label={`Provider Details — ${choice.name}`}>
    <div className="fx-provider-window-head">
      <span className="fx-record-avatar" aria-hidden="true" />
      <span className="fx-provider-window-name">{choice.name}</span>
      <span className="fx-provider-window-close" aria-hidden="true">×</span>
    </div>
    <div className="fx-provider-window-sub"><strong>Customer Number</strong>{choice.id === "PTY-TRAVIS" ? "607440" : "607441"}</div>
    <div className="fx-provider-window-actions"><span>Create Notification</span><span>Edit Party</span><span>Delete Party</span><span>Merge Party</span><span>Add Activity</span><span>Add Case</span></div>
    <div className="fx-provider-window-tabs">{["Profile", "Policies for Client", "Party History", "Leave Information", "Provider Information"].map((t) => (
      <span key={t} className={t === "Provider Information" ? "fx-provider-tab fx-provider-tab--on" : "fx-provider-tab"}>{t}</span>))}</div>
    <div className="fx-provider-window-subtabs"><b>Provider Details</b><span>Service Approval Agreements</span><span>Invoices</span></div>
    <div className="fx-provider-window-body">
      <p role="status" className="fx-readonly-note">Application is operating in read-only mode. Edits cannot be performed using this screen.</p>
      <h2 className="fx-section-title">Provider Details — {choice.name}</h2>
      <div className="fx-provider-detail-grid">
        <Field label="National Provider Identifier" value="0" />
        <Field label="Provider Type" value="Unknown" />
        <Field label="Service Group" value="Unknown" />
        <Field label="Approval Indicator" value="—" />
        <Field label="Approval Start Date" value="01/29/2026" />
        <Field label="Approval End Date" value="-" />
      </div>
      <h3 className="fx-provider-subhead">Other Provider IDs</h3>
      <p className="fx-empty-inline">0-0 of 0</p>
      <h3 className="fx-provider-subhead">Certifications</h3>
      <div className="fx-form-actions">
        <button type="button" className="fx-primary" onClick={() => onAttach(choice)}>Attach</button>
        <button type="button" className="fx-ghost" onClick={onClose}>Back</button>
      </div>
    </div>
  </div>;
}

function Field({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="fx-detail-field"><div className="fx-detail-label">{label}</div><div className="fx-detail-value">{value}</div></div>;
}

// Add Person create-new-party modal. Name fields plus OK, matching the source
// header/section chrome and the control audit's expected inventory.
function AddPersonModal({ onCreate, onCancel }: { readonly onCreate: (choice: ProviderChoice) => void; readonly onCancel: () => void }) {
  const [first, setFirst] = useState("Travis");
  const [last, setLast] = useState("Larson");
  const [error, setError] = useState<string | null>(null);
  return <div className="fx-addperson" role="dialog" aria-label="Add Person">
    <div className="fx-addperson-head"><span>Add Person</span><span className="fx-addperson-close" aria-hidden="true" onClick={onCancel}>×</span></div>
    <div className="fx-addperson-body">
      <h2 className="fx-addperson-title">Personal Details</h2>
      <h3 className="fx-addperson-section">Name</h3>
      <div className="fx-addperson-grid">
        <TextField label="First name" value={first} onChange={setFirst} />
        <TextField label="Last name" value={last} onChange={setLast} />
        <StaticPersonField label="Suffix" value="" />
        <StaticPersonField label="Verified" value="☑" />
      </div>
      <h3 className="fx-addperson-section">Personal Identification</h3>
      <div className="fx-addperson-static" aria-hidden="true">
        <StaticPersonField label="Identification number type" value="Social Security Number⌄" />
        <StaticPersonField label="Identification number" value="" />
        <StaticPersonField label="Date of birth" value="MM/DD/YYYY" />
        <StaticPersonField label="Gender" value="Unknown⌄" />
        <StaticPersonField label="Marital status" value="Unknown⌄" />
      </div>
      <h3 className="fx-addperson-section">Additional Information</h3>
      <div className="fx-addperson-static" aria-hidden="true"><StaticPersonField label="Party Type" value="Unknown⌄" />
        <StaticPersonField label="Deceased" value="□" /><StaticPersonField label="Date of death" value="MM/DD/YYYY" />
        <StaticPersonField label="Notifications issued" value="□" /><StaticPersonField label="Occupation" value="" />
        <StaticPersonField label="Tenure start date" value="" /><StaticPersonField label="Hazardous pursuit" value="" /></div>
      {error && <p role="alert" className="fx-error">{error}</p>}
    </div>
    <div className="fx-addperson-foot">
      <button type="button" className="fx-primary" onClick={() => void saveProvider(first, last, onCreate, setError)}>OK</button>
    </div>
  </div>;
}

function StaticPersonField({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="fx-addperson-field"><strong>{label}</strong><span>{value}</span></div>;
}

const saveProvider = async (
  firstName: string, lastName: string,
  onCreate: (choice: ProviderChoice) => void, onError: (message: string) => void,
): Promise<void> => {
  const result = await createProvider({ firstName, lastName });
  if (result.ok) onCreate({ id: result.value.id, name: result.value.fullName });
  else onError(result.message);
};
