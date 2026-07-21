import { useState } from "react";
import { Dialog } from "../../components/fineos/Dialog";
import { createProvider } from "../../app/api";
import { FieldRow, RadioGroup, TextField } from "../intake/fields/controls";
import type { PanelContext } from "./CasePage";

export interface ProviderChoice {
  readonly id: string;
  readonly name: string;
}

export type ProviderSelectionDecision =
  | { readonly kind: "attach"; readonly provider: ProviderChoice }
  | { readonly kind: "skip" };

const DIALOG_TITLE = "Choose the Party to have a role of Medical Provider";
const SEARCH_BY = ["Person", "Organization", "Both"] as const;
const KNOWN_PROVIDERS: readonly ProviderChoice[] = [
  { id: "PTY-TRAVIS", name: "Travis Larson" },
  { id: "PTY-TRAVIS-DR", name: "Travis Larson R Dr" },
];

type Stage =
  | { readonly step: "search" }
  | { readonly step: "details"; readonly choice: ProviderChoice }
  | { readonly step: "add" };

export function ProviderFlow({ ctx }: { readonly ctx: PanelContext }) {
  const [open, setOpen] = useState(false);
  return <section><h2 className="fx-section-title">Medical Provider</h2>
    <ProviderStatus decision={ctx.workflow.providerDecision} />
    <ProviderActions onAdd={() => setOpen(true)}
      onSkip={() => ctx.workflow.setProviderDecision({ kind: "skip" })} />
    {open && <ProviderDialog onAttach={(choice) => attach(choice, ctx, setOpen)} onClose={() => setOpen(false)} />}
  </section>;
}

const attach = (
  choice: ProviderChoice, ctx: PanelContext,
  setOpen: (v: boolean) => void,
): void => {
  ctx.workflow.setProviderDecision({ kind: "attach", provider: choice });
  setOpen(false);
};

function ProviderStatus({ decision }: { readonly decision: ProviderSelectionDecision }) {
  if (decision.kind === "attach") return <p className="fx-detail-value">{decision.provider.name}</p>;
  return <p className="fx-detail-value">No medical provider will be attached.</p>;
}

function ProviderActions({ onAdd, onSkip }: { readonly onAdd: () => void; readonly onSkip: () => void }) {
  return <div className="fx-form-actions">
    <button type="button" className="fx-primary" onClick={onAdd}>Add Medical Provider</button>
    <button type="button" className="fx-ghost" onClick={onSkip}>Skip Provider</button>
  </div>;
}

function ProviderDialog({ onAttach, onClose }: { readonly onAttach: (choice: ProviderChoice) => void; readonly onClose: () => void }) {
  const [stage, setStage] = useState<Stage>({ step: "search" });
  return <Dialog title={DIALOG_TITLE} onClose={onClose}>
    <div className="fx-dialog-head"><h1>{DIALOG_TITLE}</h1></div>
    <ProviderStage stage={stage} onStage={setStage} onAttach={onAttach} />
  </Dialog>;
}

function ProviderStage({ stage, onStage, onAttach }: { readonly stage: Stage; readonly onStage: (stage: Stage) => void; readonly onAttach: (choice: ProviderChoice) => void }) {
  if (stage.step === "details") return <ProviderDetails choice={stage.choice} onAttach={onAttach} onBack={() => onStage({ step: "search" })} />;
  if (stage.step === "add") return <AddPersonForm onCreate={onAttach} />;
  return <ProviderSearch onView={(choice) => onStage({ step: "details", choice })} onAdd={() => onStage({ step: "add" })} />;
}

function ProviderSearch({ onView, onAdd }: { readonly onView: (choice: ProviderChoice) => void; readonly onAdd: () => void }) {
  const [by, setBy] = useState<string>("Person");
  const [firstName, setFirstName] = useState("Travis");
  const [lastName, setLastName] = useState("Larson");
  const [results, setResults] = useState<readonly ProviderChoice[]>([]);
  return <div className="fx-modal-body">
    <RadioGroup legend="Search by" options={SEARCH_BY} value={by} onChange={setBy} />
    <SearchFields firstName={firstName} lastName={lastName}
      onFirstName={setFirstName} onLastName={setLastName}
      onSearch={() => setResults(KNOWN_PROVIDERS)} onAdd={onAdd} />
    <ProviderResults results={results} onView={onView} />
  </div>;
}

interface SearchFieldsProps {
  readonly firstName: string; readonly lastName: string;
  readonly onFirstName: (value: string) => void; readonly onLastName: (value: string) => void;
  readonly onSearch: () => void; readonly onAdd: () => void;
}

function SearchFields(props: SearchFieldsProps) {
  return <><FieldRow>
    <TextField label="First Name" value={props.firstName} onChange={props.onFirstName} />
    <TextField label="Last Name" value={props.lastName} onChange={props.onLastName} />
  </FieldRow>
    <div className="fx-form-actions">
      <button type="button" className="fx-primary" onClick={props.onSearch}>Search</button>
      <button type="button" className="fx-ghost" onClick={props.onAdd}>Add Person</button>
    </div></>;
}

function ProviderResults({ results, onView }: { readonly results: readonly ProviderChoice[]; readonly onView: (choice: ProviderChoice) => void }) {
  if (results.length === 0) return <p className="fx-results-title">Person Search Results</p>;
  return <table className="fx-table"><thead><tr><th>Type</th><th>Name</th></tr></thead>
    <tbody>{results.map((choice) => (
      <tr key={choice.id}><td>Agent</td><td><button type="button" className="fx-result" onClick={() => onView(choice)}>{choice.name}</button></td></tr>
    ))}</tbody>
  </table>;
}

function ProviderDetails({ choice, onAttach, onBack }: { readonly choice: ProviderChoice; readonly onAttach: (choice: ProviderChoice) => void; readonly onBack: () => void }) {
  return <div className="fx-modal-body">
    <p role="status" className="fx-status">Application is operating in read-only mode. Edits cannot be performed using this screen.</p>
    <h2 className="fx-section-title">Provider Details — {choice.name}</h2>
    <DetailGrid choice={choice} />
    <div className="fx-form-actions">
      <button type="button" className="fx-primary" onClick={() => onAttach(choice)}>Attach</button>
      <button type="button" className="fx-ghost" onClick={onBack}>Back</button>
    </div>
  </div>;
}

function DetailGrid({ choice }: { readonly choice: ProviderChoice }) {
  return <div className="fx-detail-grid">
    <Field label="National Provider Identifier" value="0" />
    <Field label="Provider Type" value="Unknown" />
    <Field label="Approval Start Date" value="01/29/2026" />
    <Field label="Customer Number" value={choice.id === "PTY-TRAVIS" ? "607440" : "607441"} />
  </div>;
}

function Field({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="fx-detail-field"><div className="fx-detail-label">{label}</div><div className="fx-detail-value">{value}</div></div>;
}

function AddPersonForm({ onCreate }: { readonly onCreate: (choice: ProviderChoice) => void }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [error, setError] = useState<string | null>(null);
  return <div className="fx-modal-body"><h2 className="fx-section-title">Add Person</h2>
    <FieldRow><TextField label="First name" value={first} onChange={setFirst} /><TextField label="Last name" value={last} onChange={setLast} /></FieldRow>
    {error && <p role="alert" className="fx-error">{error}</p>}
    <div className="fx-form-actions"><button type="button" className="fx-dark" onClick={() => void saveProvider(first, last, onCreate, setError)}>OK</button></div>
  </div>;
}

const saveProvider = async (
  firstName: string, lastName: string,
  onCreate: (choice: ProviderChoice) => void, onError: (message: string) => void,
): Promise<void> => {
  const result = await createProvider({ firstName, lastName });
  if (result.ok) onCreate({ id: result.value.id, name: result.value.fullName });
  else onError(result.message);
};
