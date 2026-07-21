import { useId, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "../../components/fineos/Dialog";
import { TabBar, tabId } from "../../components/fineos/RecordShell";
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

export function SearchDialog({ onClose, popup = false }: { readonly onClose: () => void; readonly popup?: boolean }) {
  const [tab, setTab] = useState<string>("Case");
  const tabsId = useId();
  const panelId = `${tabsId}-panel`;
  return (
    <Dialog title="Case Search" variant={popup ? "popup" : "page"} onClose={onClose}>
      <SearchChrome onClose={onClose} />
      <div className="fx-search-tabsbar">
        <SearchTabs id={tabsId} panelId={panelId} tab={tab} popup={popup} onTab={setTab} onPick={onClose} />
      </div>
      {popup && <SearchFooter onClose={onClose} />}
    </Dialog>
  );
}

interface SearchTabsProps {
  readonly id: string;
  readonly panelId: string;
  readonly tab: string;
  readonly popup: boolean;
  readonly onTab: (tab: string) => void;
  readonly onPick: () => void;
}

function SearchTabs({ id, panelId, tab, popup, onTab, onPick }: SearchTabsProps) {
  if (popup) return <PopupResults onPick={onPick} />;
  return (
    <>
      <TabBar id={id} panelId={panelId} tabs={SEARCH_TABS} active={tab} onTab={onTab} />
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(id, tab)}><SearchPanel tab={tab} onPick={onPick} /></div>
    </>
  );
}

function SearchFooter({ onClose }: { readonly onClose: () => void }) {
  return <div className="fx-search-footer"><button type="button" className="fx-step-btn" onClick={onClose}>OK</button>
    <button type="button" className="fx-step-btn" onClick={onClose}>Cancel</button></div>;
}

function SearchChrome({ onClose }: { readonly onClose: () => void }) {
  return (
    <div className="fx-search-head">
      <h1>Case Search</h1>
      <div className="fx-search-head-tools">
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

interface ResultNav {
  readonly name: string;
  readonly to: string;
}

interface ResultRow {
  readonly caseId: string;
  readonly label: string;
  readonly description: string;
  readonly party: string;
  readonly nav?: ResultNav;
}

// The two navigable rows preserve the recent-search behaviour the E2E control
// audit asserts (navigate to the party record); the remaining rows reproduce the
// FINEOS recent-results table visually as non-interactive reference content.
const RECENT_RESULTS: readonly ResultRow[] = [
  { caseId: "NTN-159898", label: "Notification - NTN-159898", description: "", party: "David Hunter", nav: { name: "Notification - NTN-159898 — David Hunter", to: "/parties/PTY-77569" } },
  { caseId: "NTN-162642-ABS-01", label: "Absence Case - NTN-162642-ABS-01", description: "Pregnancy/Maternity | Birth Disability : 01/22/2026-07/26/2026, Intermittent", party: "Anthony Ellis" },
  { caseId: "NTN-162642", label: "Notification - NTN-162642", description: "", party: "Anthony Ellis" },
  { caseId: "NTN-162641", label: "Notification - NTN-162641", description: "", party: "Anthony Ellis" },
  { caseId: "NTN-162641-ABS-01", label: "Absence Case - NTN-162641-ABS-01", description: "Care for a Family Member | Serious Health Condition : 01/30/2026, Pattern: Continuous", party: "Anthony Ellis" },
  { caseId: "NTN-160306-ABS-01", label: "Absence Case - NTN-160306-ABS-01", description: "Care for a Family Member | Serious Health Condition : 01/12/2026, Pattern: Continuous", party: "Anthony Ellis" },
  { caseId: "NTN-160306", label: "Notification - NTN-160306", description: "", party: "Anthony Ellis" },
  { caseId: "NTN-159901", label: "Notification - NTN-159901", description: "", party: "David Hunter" },
  { caseId: "NTN-159901-ABS-01", label: "Absence Case - NTN-159901-ABS-01", description: "Pregnancy/Maternity | Birth Disability : 01/02/2026-02/24/2026, Continuous", party: "David Hunter" },
  { caseId: "NTN-148123-ABS-01", label: "Absence Case - NTN-148123-ABS-01", description: "Serious Health Condition - Employee | Not Work Related : 11/02/2025 (Status: Known, Pattern: Continuous)", party: "EDNA TIERTEST1" },
  { caseId: "NTN-165775", label: "Notification - NTN-165775", description: "", party: "Erica Alexander", nav: { name: "Notification - NTN-165775 — Erica Alexander", to: "/parties/PTY-80937" } },
];

const INTAKE_RESULTS: readonly ResultRow[] = [
  { caseId: "NTN-165773-GDC-02", label: "Group Disability Claim - NTN-165773-GDC-02", description: "Sickness : 02/10/2026", party: "Zachary Alexander" },
  { caseId: "NTN-165773-ABS-01", label: "Absence Case - NTN-165773-ABS-01", description: "Serious Health Condition - Employee | Not Work Related | Sickness : 02/10/2026-03/02/2026 (Status: Estimated, Pattern: Continuous)", party: "Zachary Alexander" },
  { caseId: "NTN-165773", label: "Notification - NTN-165773", description: "Sickness, treatment required for a medical condition or any other medical procedure", party: "Zachary Alexander" },
  { caseId: "NTN-165772-ABS-01", label: "Absence Case - NTN-165772-ABS-01", description: "Serious Health Condition - Employee | Not Work Related | Sickness : 04/01/2026-06/01/2026 (Status: Not Known, Pattern: Continuous)", party: "Beth Alexander" },
  { caseId: "NTN-165772-GDC-02", label: "Group Disability Claim - NTN-165772-GDC-02", description: "Sickness : 04/01/2026", party: "Beth Alexander" },
  { caseId: "18489", label: "Master Plan - 18489", description: "", party: "Fifth Third Bank National Association", nav: { name: "Master Plan - 18489", to: "/master-plans/18489/members" } },
  { caseId: "NTN-165772", label: "Notification - NTN-165772", description: "Sickness, treatment required for a medical condition or any other medical procedure", party: "Beth Alexander" },
  { caseId: "NTN-165771-GDC-02", label: "Group Disability Claim - NTN-165771-GDC-02", description: "Accident : 02/12/2026", party: "Erica Alexander" },
  { caseId: "NTN-165571", label: "Notification - NTN-165571", description: "Sickness, treatment required for a medical condition or any other medical procedure", party: "Dustin Adams" },
  { caseId: "NTN-165335", label: "Notification - NTN-165335", description: "Accommodation required to remain at work", party: "David Hunter" },
];

function PopupResults({ onPick }: { readonly onPick: () => void }) {
  const navigate = useNavigate();
  return <div className="fx-search-body fx-search-body--popup">
    <ResultsTable rows={INTAKE_RESULTS} selectedId="18489" onOpen={(nav) => openResult(nav, navigate, onPick)} />
  </div>;
}

function RecentResults({ onPick }: { readonly onPick: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="fx-search-body">
      <ResultsTable rows={RECENT_RESULTS} selectedId="NTN-159898" onOpen={(nav) => openResult(nav, navigate, onPick)} />
    </div>
  );
}

const openResult = (nav: ResultNav, navigate: (to: string) => void, onPick: () => void): void => {
  onPick();
  navigate(nav.to);
};

function CaseSearch() {
  const [rows, setRows] = useState<readonly SearchRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();
  return (
    <div className="fx-search-body">
      <CaseFields onSearch={(term) => runCaseSearch(term, setRows)} />
      {rows.length > 0 && <CaseResults rows={rows} selected={selected} onSelect={(row) => openCase(row, navigate, setSelected)} />}
    </div>
  );
}

const openCase = (row: SearchRow, navigate: (to: string) => void, select: (id: string) => void): void =>
  row.route ? navigate(row.route) : select(row.caseId);

function CaseResults({ rows, selected, onSelect }: { readonly rows: readonly SearchRow[]; readonly selected: string | null; readonly onSelect: (row: SearchRow) => void }) {
  return (
    <div className="fx-results-block">
      <p className="fx-results-title">Search Results</p>
      {selected && <p className="fx-status" role="status">Selected {selected}</p>}
      <table className="fx-table fx-results-table">
        <thead><tr><th>Case</th><th>Description</th><th>Default Party</th></tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={row.caseId}>
            <td><button type="button" className="fx-result" onClick={() => onSelect(row)}>{row.caseId}</button></td>
            <td>{row.status}</td>
            <td>{row.partyName}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

const runCaseSearch = async (term: string, set: (rows: readonly SearchRow[]) => void): Promise<void> => {
  const result = await searchCases(term);
  if (result.ok) set([MASTER_PLAN, ...result.value]);
};

function CaseFields({ onSearch }: { readonly onSearch: (term: string) => void }) {
  const [term, setTerm] = useState("");
  return (
    <form className="fx-case-form" onSubmit={(event) => { event.preventDefault(); onSearch(term); }}>
      <span className="fx-case-help" aria-hidden="true">?</span>
      <div className="fx-case-grid">
        <CaseRow label="Case Number"><input className="fx-input" aria-label="Case Number" value={term} onChange={(event) => setTerm(event.target.value)} /></CaseRow>
        <CaseRow label="Search Case Alias"><input type="checkbox" defaultChecked aria-label="Search Case Alias" /></CaseRow>
        <CaseRow label="Incurred Date"><span className="fx-date-input"><input className="fx-input" placeholder="MM/DD/YYYY" aria-label="Incurred Date" /><span className="fx-date-btn" aria-hidden="true">▦</span></span></CaseRow>
        <CaseRow label="Policy Number"><PolicyRefs /></CaseRow>
        <CaseRow label="Case Type"><CaseTypeSelect /></CaseRow>
        <CaseRow label="Display Sub-Cases"><input type="checkbox" aria-label="Display Sub-Cases" /></CaseRow>
      </div>
      <button type="submit" className="fx-primary fx-case-search">Search</button>
    </form>
  );
}

function CaseRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return <><span className="fx-case-label">{label}</span><span className="fx-case-control">{children}</span></>;
}

function PolicyRefs() {
  return (
    <span className="fx-policy">
      <span className="fx-policy-col"><span className="fx-policy-head">Ref1</span><input className="fx-input" aria-label="Policy Number (Ref1)" /></span>
      <span className="fx-policy-dot">·</span>
      <span className="fx-policy-col"><span className="fx-policy-head">Ref2</span><input className="fx-input" aria-label="Ref2" /></span>
    </span>
  );
}

function CaseTypeSelect() {
  return (
    <select className="fx-select" aria-label="Case Type" defaultValue="unknown">
      <option value="unknown">Unknown</option>
      <option value="absence">Absence Case</option>
      <option value="gdc">Group Disability Claim</option>
    </select>
  );
}

function ResultsTable({ rows, selectedId, onOpen }: { readonly rows: readonly ResultRow[]; readonly selectedId?: string; readonly onOpen: (nav: ResultNav) => void }) {
  return (
    <div className="fx-results-block">
      <p className="fx-results-title">Search Results</p>
      <table className="fx-table fx-results-table">
        <thead><tr><th>Case</th><th>Description</th><th>Default Party</th></tr></thead>
        <tbody>{rows.map((row) => <ResultTr key={row.caseId} row={row} selected={row.caseId === selectedId} onOpen={onOpen} />)}</tbody>
      </table>
      <p className="fx-results-count">1-{rows.length} of {rows.length}</p>
    </div>
  );
}

function ResultTr({ row, selected, onOpen }: { readonly row: ResultRow; readonly selected: boolean; readonly onOpen: (nav: ResultNav) => void }) {
  return (
    <tr aria-selected={selected} className={selected ? "fx-row-on" : undefined}>
      <td><ResultCase row={row} onOpen={onOpen} /></td>
      <td>{row.description}</td>
      <td>{row.party}</td>
    </tr>
  );
}

function ResultCase({ row, onOpen }: { readonly row: ResultRow; readonly onOpen: (nav: ResultNav) => void }) {
  if (!row.nav) return <span className="fx-result-text">{row.label}</span>;
  const nav = row.nav;
  return <button type="button" className="fx-result" aria-label={nav.name} onClick={() => onOpen(nav)}>{row.label}</button>;
}
