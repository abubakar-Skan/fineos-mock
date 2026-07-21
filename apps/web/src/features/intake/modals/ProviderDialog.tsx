import { useState } from "react";
import { Dialog } from "../../../components/fineos/Dialog";
import { createProvider } from "../../../app/api";
import { TextField, RadioGroup, FieldRow } from "../fields/controls";

export interface ProviderChoice {
  readonly id: string;
  readonly name: string;
}

const SEARCH_BY = ["Person", "Organization", "Both"] as const;
const KNOWN_PROVIDER: ProviderChoice = { id: "PTY-TRAVIS", name: "Travis Larson" };
const DIALOG_TITLE = "Choose the Party to have a role of Medical Provider";

interface ProviderDialogProps {
  readonly onSelect: (choice: ProviderChoice) => void;
  readonly onClose: () => void;
}

export function ProviderDialog({ onSelect, onClose }: ProviderDialogProps) {
  const [adding, setAdding] = useState(false);
  return (
    <Dialog title={DIALOG_TITLE} onClose={onClose}>
      <div className="fx-dialog-head"><h1>{DIALOG_TITLE}</h1></div>
      {adding
        ? <AddPersonForm onCreate={(choice) => choose(choice, onSelect, onClose)} />
        : <ProviderSearch onPick={(choice) => choose(choice, onSelect, onClose)} onAdd={() => setAdding(true)} />}
    </Dialog>
  );
}

const choose = (choice: ProviderChoice, onSelect: (c: ProviderChoice) => void, onClose: () => void): void => {
  onSelect(choice);
  onClose();
};

interface ProviderSearchProps {
  readonly onPick: (choice: ProviderChoice) => void;
  readonly onAdd: () => void;
}

function ProviderSearch({ onPick, onAdd }: ProviderSearchProps) {
  const [by, setBy] = useState<string>("Person");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [results, setResults] = useState<readonly ProviderChoice[]>([]);
  return (
    <div className="fx-modal-body">
      <RadioGroup legend="Search by" options={SEARCH_BY} value={by} onChange={setBy} />
      <SearchFields firstName={firstName} lastName={lastName}
        onFirstName={setFirstName} onLastName={setLastName}
        onSearch={() => setResults([KNOWN_PROVIDER])} onAdd={onAdd} />
      <ProviderResults results={results} onPick={onPick} />
    </div>
  );
}

interface SearchFieldsProps {
  readonly firstName: string; readonly lastName: string;
  readonly onFirstName: (value: string) => void; readonly onLastName: (value: string) => void;
  readonly onSearch: () => void; readonly onAdd: () => void;
}

function SearchFields(props: SearchFieldsProps) {
  return (
    <>
      <FieldRow>
        <TextField label="First Name" value={props.firstName} onChange={props.onFirstName} />
        <TextField label="Last Name" value={props.lastName} onChange={props.onLastName} />
      </FieldRow>
      <div className="fx-form-actions">
        <button type="button" className="fx-primary" onClick={props.onSearch}>Search</button>
        <button type="button" className="fx-ghost" onClick={props.onAdd}>Add Person</button>
      </div>
    </>
  );
}

function ProviderResults({ results, onPick }: { readonly results: readonly ProviderChoice[]; readonly onPick: (c: ProviderChoice) => void }) {
  if (results.length === 0) return <p className="fx-results-title">Person Search Results</p>;
  return (
    <ul className="fx-results">
      {results.map((choice) => (
        <li key={choice.id}><button type="button" className="fx-result" onClick={() => onPick(choice)}>{choice.name}</button></li>
      ))}
    </ul>
  );
}

function AddPersonForm({ onCreate }: { readonly onCreate: (choice: ProviderChoice) => void }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = (): void => { void saveProvider(first, last, onCreate, setError); };
  return <AddPersonFields first={first} last={last} error={error} onFirst={setFirst} onLast={setLast} onSubmit={submit} />;
}

interface AddPersonFieldsProps {
  readonly first: string; readonly last: string; readonly error: string | null;
  readonly onFirst: (value: string) => void; readonly onLast: (value: string) => void;
  readonly onSubmit: () => void;
}

function AddPersonFields(props: AddPersonFieldsProps) {
  return (
    <div className="fx-modal-body">
      <h2 className="fx-section-title">Add Person</h2>
      <FieldRow><TextField label="First Name" value={props.first} onChange={props.onFirst} /><TextField label="Last Name" value={props.last} onChange={props.onLast} /></FieldRow>
      {props.error && <p role="alert" className="fx-error">{props.error}</p>}
      <div className="fx-form-actions"><button type="button" className="fx-dark" onClick={props.onSubmit}>OK</button></div>
    </div>
  );
}

const saveProvider = async (
  firstName: string,
  lastName: string,
  onCreate: (choice: ProviderChoice) => void,
  onError: (message: string) => void,
): Promise<void> => {
  const result = await createProvider({ firstName, lastName });
  if (!result.ok) return onError(result.message);
  onCreate({ id: result.value.id, name: result.value.fullName });
};
