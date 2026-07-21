import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "../../components/fineos/Dialog";
import { TabBar, tabId } from "../../components/fineos/RecordShell";
import { DataTable, type Column } from "../../components/fineos/DataTable";
import { searchCases, searchParties, type CaseSummaryView, type PartyView } from "../../app/api";

const SEARCH_TABS = ["Case", "Party", "Recent"] as const;

type SearchRow = CaseSummaryView & { readonly route?: string };

const MASTER_PLAN: SearchRow = {
  caseId: "Master Plan - 18489",
  partyName: "Fifth Third Bank National Association",
  scope: { kind: "master_plan" },
  status: "Open",
  route: "/master-plans/18489/members",
};

const RECENT = [
  { caseId: "NTN-159898", party: "David Hunter", partyId: "PTY-77569" },
  { caseId: "NTN-165775", party: "Erica Alexander", partyId: "PTY-80937" },
] as const;

export function SearchDialog({ onClose }: { readonly onClose: () => void }) {
  const [tab, setTab] = useState<string>("Case");
  const tabsId = useId();
  const panelId = `${tabsId}-panel`;
  return (
    <Dialog title="Case Search" onClose={onClose}>
      <SearchChrome onClose={onClose} />
      <SearchTabs id={tabsId} panelId={panelId} tab={tab} onTab={setTab} onPick={onClose} />
    </Dialog>
  );
}

interface SearchTabsProps {
  readonly id: string;
  readonly panelId: string;
  readonly tab: string;
  readonly onTab: (tab: string) => void;
  readonly onPick: () => void;
}

function SearchTabs({ id, panelId, tab, onTab, onPick }: SearchTabsProps) {
  return (
    <>
      <TabBar id={id} panelId={panelId} tabs={SEARCH_TABS} active={tab} onTab={onTab} />
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(id, tab)}><SearchPanel tab={tab} onPick={onPick} /></div>
    </>
  );
}

function SearchChrome({ onClose }: { readonly onClose: () => void }) {
  return (
    <div className="fx-dialog-head">
      <h1>Case Search</h1>
      <div className="fx-dialog-head-tools">
        <button type="button" className="fx-dark" onClick={onClose}>OK</button>
        <button type="button" className="fx-dark" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function SearchPanel({ tab, onPick }: { readonly tab: string; readonly onPick: () => void }) {
  if (tab === "Party") return <PartySearch onPick={onPick} />;
  if (tab === "Recent") return <RecentResults onPick={onPick} />;
  return <CaseSearch />;
}

function PartySearch({ onPick }: { readonly onPick: () => void }) {
  const [results, setResults] = useState<readonly PartyView[]>([]);
  return (
    <div className="fx-search-panel">
      <SearchQuery onSearch={(term) => runPartySearch(term, setResults)} />
      <PartyResults parties={results} onPick={onPick} />
    </div>
  );
}

const runPartySearch = async (term: string, set: (rows: readonly PartyView[]) => void): Promise<void> => {
  const result = await searchParties(term);
  if (result.ok) set(result.value);
};

function SearchQuery({ onSearch }: { readonly onSearch: (term: string) => void }) {
  const [term, setTerm] = useState("");
  return (
    <div className="fx-search-row">
      <label className="fx-field">
        <span className="fx-field-label">Search term</span>
        <input className="fx-input" value={term} onChange={(event) => setTerm(event.target.value)} />
      </label>
      <button type="button" className="fx-primary" onClick={() => onSearch(term)}>Search</button>
    </div>
  );
}

function PartyResults({ parties, onPick }: { readonly parties: readonly PartyView[]; readonly onPick: () => void }) {
  const navigate = useNavigate();
  const open = (id: string): void => openParty(id, navigate, onPick);
  return (
    <ul className="fx-results">
      {parties.map((party) => <PartyResult key={party.id} party={party} onOpen={open} />)}
    </ul>
  );
}

function PartyResult({ party, onOpen }: { readonly party: PartyView; readonly onOpen: (id: string) => void }) {
  return <li><button type="button" className="fx-result" onClick={() => onOpen(party.id)}>{party.fullName}</button></li>;
}

const openParty = (id: string, navigate: (to: string) => void, onPick: () => void): void => {
  onPick();
  navigate(`/parties/${id}`);
};

function RecentResults({ onPick }: { readonly onPick: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="fx-search-panel">
      <p className="fx-results-title">Search Results</p>
      <ul className="fx-results">
        {RECENT.map((entry) => <RecentResult key={entry.caseId} entry={entry} onOpen={() => openParty(entry.partyId, navigate, onPick)} />)}
      </ul>
    </div>
  );
}

function RecentResult({ entry, onOpen }: { readonly entry: (typeof RECENT)[number]; readonly onOpen: () => void }) {
  return <li><button type="button" className="fx-result" onClick={onOpen}>Notification - {entry.caseId} — {entry.party}</button></li>;
}

function CaseSearch() {
  const [rows, setRows] = useState<readonly SearchRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();
  return (
    <div className="fx-search-panel">
      <CaseFields onSearch={(term) => runCaseSearch(term, setRows)} />
      {selected && <p className="fx-status" role="status">Selected {selected}</p>}
      <CaseResults rows={rows} onSelect={(row) => openCase(row, navigate, setSelected)} />
    </div>
  );
}

const runCaseSearch = async (term: string, set: (rows: readonly SearchRow[]) => void): Promise<void> => {
  const result = await searchCases(term);
  if (result.ok) set([MASTER_PLAN, ...result.value]);
};

const openCase = (row: SearchRow, navigate: (to: string) => void, select: (id: string) => void): void =>
  row.route ? navigate(row.route) : select(row.caseId);

function CaseFields({ onSearch }: { readonly onSearch: (term: string) => void }) {
  const [term, setTerm] = useState("");
  return (
    <div className="fx-case-form">
      <LabeledInput label="Case Number" value={term} onChange={setTerm} />
      <CaseOptions />
      <button type="button" className="fx-primary" onClick={() => onSearch(term)}>Search</button>
    </div>
  );
}

function CaseOptions() {
  return (
    <>
      <CheckboxField label="Search Case Alias" defaultChecked />
      <LabeledInput label="Incurred Date" placeholder="MM/DD/YYYY" />
      <PolicyNumberField />
      <CaseTypeSelect />
      <CheckboxField label="Display Sub-Cases" />
    </>
  );
}

interface LabeledInputProps {
  readonly label: string;
  readonly value?: string;
  readonly placeholder?: string;
  readonly onChange?: (value: string) => void;
}

function LabeledInput({ label, value, placeholder, onChange }: LabeledInputProps) {
  return (
    <label className="fx-field">
      <span className="fx-field-label">{label}</span>
      <input className="fx-input" value={value} placeholder={placeholder} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

function CheckboxField({ label, defaultChecked }: { readonly label: string; readonly defaultChecked?: boolean }) {
  return (
    <label className="fx-checkbox">
      <input type="checkbox" defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}

function PolicyNumberField() {
  return (
    <div className="fx-policy">
      <LabeledInput label="Policy Number (Ref1)" />
      <LabeledInput label="Ref2" />
    </div>
  );
}

function CaseTypeSelect() {
  return (
    <label className="fx-field">
      <span className="fx-field-label">Case Type</span>
      <select className="fx-select" defaultValue="unknown">
        <option value="unknown">Unknown</option>
        <option value="absence">Absence Case</option>
        <option value="gdc">Group Disability Claim</option>
      </select>
    </label>
  );
}

function CaseResults({ rows, onSelect }: { readonly rows: readonly SearchRow[]; readonly onSelect: (row: SearchRow) => void }) {
  return (
    <DataTable<SearchRow>
      rows={rows}
      rowKey={(row) => row.caseId}
      emptyLabel="Enter search criteria and choose Search."
      columns={caseColumns(onSelect)}
    />
  );
}

const caseColumns = (onSelect: (row: SearchRow) => void): readonly Column<SearchRow>[] => [
  {
    key: "case",
    header: "Case",
    render: (row) => (
      <button type="button" className="fx-result" onClick={() => onSelect(row)}>{row.caseId}</button>
    ),
  },
  { key: "party", header: "Default Party", render: (row) => row.partyName },
  { key: "status", header: "Status", render: (row) => row.status },
];
