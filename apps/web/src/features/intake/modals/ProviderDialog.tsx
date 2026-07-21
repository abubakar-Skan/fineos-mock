import { useEffect, useState } from "react";
import { createProvider } from "../../../app/api";
import { Icon } from "../../../components/fineos/Icon";
import { TextField } from "../fields/controls";

export interface ProviderChoice {
  readonly id: string;
  readonly name: string;
}

const KNOWN_PROVIDER: ProviderChoice = { id: "PTY-TRAVIS", name: "Travis Larson" };
const DIALOG_TITLE = "Choose the Party to have a role of Medical Provider";
const TABS = ["Party", "Provider", "Recent"] as const;
const SEARCH_BY = ["Person", "Organization", "Both"] as const;

interface ProviderDialogProps {
  readonly onSelect: (choice: ProviderChoice) => void;
  readonly onClose: () => void;
}

export function ProviderDialog({ onSelect, onClose }: ProviderDialogProps) {
  const [adding, setAdding] = useState(false);
  useEffect(() => lockScroll(), []);
  return (
    <div className="fx-provider-page" role="dialog" aria-label={DIALOG_TITLE} aria-modal="true">
      <ProviderRecordHead />
      {adding
        ? <AddPersonForm onCreate={(choice) => choose(choice, onSelect, onClose)} />
        : <ProviderSearch onPick={(choice) => choose(choice, onSelect, onClose)} onAdd={() => setAdding(true)} />}
      <div className="fx-provider-footer" aria-hidden="true" />
    </div>
  );
}

const lockScroll = (): (() => void) => {
  const prior = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = prior; };
};

const choose = (choice: ProviderChoice, onSelect: (c: ProviderChoice) => void, onClose: () => void): void => {
  onSelect(choice);
  onClose();
};

function ProviderRecordHead() {
  return (
    <>
      <div className="fx-provider-head">
        <span className="fx-record-avatar" aria-hidden="true"><Icon name="person" /></span>
        <h1>Erica Alexander</h1><span className="fx-provider-title">{DIALOG_TITLE}</span>
      </div>
      <div className="fx-provider-sub"><strong>Customer Number</strong>80937</div>
    </>
  );
}

function ProviderTabs() {
  return (
    <>
      <div className="fx-provider-tabs">
        {TABS.map((tab) => <span key={tab} className={tab === "Provider" ? "fx-provider-tab fx-provider-tab--on" : "fx-provider-tab"}>{tab}</span>)}
      </div>
      <div className="fx-provider-searchby"><span>Search by:</span>
        {SEARCH_BY.map((option) => (
          <label key={option} className="fx-radio"><input type="radio" name="searchBy" defaultChecked={option === "Person"} /><span>{option}</span></label>
        ))}
      </div>
    </>
  );
}

interface ProviderSearchProps {
  readonly onPick: (choice: ProviderChoice) => void;
  readonly onAdd: () => void;
}

function ProviderSearch({ onPick, onAdd }: ProviderSearchProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [results, setResults] = useState<readonly ProviderChoice[]>([]);
  return (
    <>
      <ProviderTabs />
      <div className="fx-provider-body">
        <span className="fx-provider-help" aria-hidden="true">i</span>
        <SearchGrid firstName={firstName} lastName={lastName} onFirstName={setFirstName} onLastName={setLastName} />
        <ProviderCriteria />
        <SearchActions onSearch={() => setResults([KNOWN_PROVIDER])} onAdd={onAdd} />
        <ProviderResults results={results} onPick={onPick} />
      </div>
    </>
  );
}

interface SearchGridProps {
  readonly firstName: string; readonly lastName: string;
  readonly onFirstName: (value: string) => void; readonly onLastName: (value: string) => void;
}

function SearchGrid({ firstName, lastName, onFirstName, onLastName }: SearchGridProps) {
  return (
    <div className="fx-provider-grid">
      <div className="fx-provider-col">
        <TextField label="First Name" value={firstName} onChange={onFirstName} />
        <DisplayField label="Date of Birth" calendar />
        <DisplayField label="Policy Number" />
        <DisplayField label="Phone" />
        <DisplayField label="Provider ID" />
      </div>
      <div className="fx-provider-col">
        <TextField label="Last Name" value={lastName} onChange={onLastName} />
        <DisplayField label="Identification Number" />
        <DisplayField label="Customer Number" />
        <DisplayField label="Zip Code" />
        <DisplayField label="Practice ID" />
      </div>
    </div>
  );
}

function DisplayField({ label, calendar }: { readonly label: string; readonly calendar?: boolean }) {
  return (
    <div className="fx-field">
      <span className="fx-field-label">{label}</span>
      <span className="fx-display-input">{calendar && <span className="fx-display-cal" aria-hidden="true">▦</span>}</span>
    </div>
  );
}

function ProviderCriteria() {
  return <div className="fx-provider-criteria" aria-hidden="true">
    <div className="fx-provider-role"><strong>Current Provider Role/Other ID</strong><span className="fx-faux-check">✓</span></div>
    <div className="fx-provider-cert"><strong>Certification Group</strong><span className="fx-display-select">Unknown⌄</span>
      <strong>Certifications Type</strong><span className="fx-display-select fx-display-select--wide">Unknown⌄</span></div>
  </div>;
}

function SearchActions({ onSearch, onAdd }: { readonly onSearch: () => void; readonly onAdd: () => void }) {
  return (
    <div className="fx-provider-actions">
      <button type="button" className="fx-step-btn" onClick={onSearch}>Search</button>
      <button type="button" className="fx-step-btn" onClick={onAdd}>Add Person</button>
    </div>
  );
}

function ProviderResults({ results, onPick }: { readonly results: readonly ProviderChoice[]; readonly onPick: (c: ProviderChoice) => void }) {
  if (results.length === 0) return null;
  return (
    <div className="fx-provider-results">
      <p className="fx-results-title">Person Search Results</p>
      <ul className="fx-results">
        {results.map((choice) => (
          <li key={choice.id}><button type="button" className="fx-result" onClick={() => onPick(choice)}>{choice.name}</button></li>
        ))}
      </ul>
    </div>
  );
}

function AddPersonForm({ onCreate }: { readonly onCreate: (choice: ProviderChoice) => void }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = (): void => { void saveProvider(first, last, onCreate, setError); };
  return (
    <div className="fx-provider-body">
      <h2 className="fx-section-title">Add Person</h2>
      <div className="fx-provider-grid"><div className="fx-provider-col"><TextField label="First Name" value={first} onChange={setFirst} /></div>
        <div className="fx-provider-col"><TextField label="Last Name" value={last} onChange={setLast} /></div></div>
      {error && <p role="alert" className="fx-error">{error}</p>}
      <div className="fx-provider-actions"><button type="button" className="fx-step-btn" onClick={submit}>OK</button></div>
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
