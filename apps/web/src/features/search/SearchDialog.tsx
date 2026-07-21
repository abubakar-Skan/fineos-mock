import { useEffect, useId, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "../../components/fineos/Dialog";
import { TabBar, tabId } from "../../components/fineos/RecordShell";
import { caseKind, defaultTab, tabSlug } from "../cases/case-tabs";
import { getRecentCases, searchCases, searchParties, type CaseSummaryView, type PartyView, type RecentCaseRow } from "../../app/api";

const SEARCH_TABS = ["Case", "Party", "Recent"] as const;

const MASTER_PLAN_ROUTE = "/master-plans/18489/members";

type SearchRow = CaseSummaryView & { readonly route?: string };

const MASTER_PLAN: SearchRow = {
  caseId: "Master Plan - 18489",
  partyName: "Fifth Third Bank National Association",
  scope: { kind: "master_plan" },
  status: "Open",
  route: MASTER_PLAN_ROUTE,
};

export function SearchDialog({ onClose, popup = false, initialTab = "Case" }: { readonly onClose: () => void; readonly popup?: boolean; readonly initialTab?: string }) {
  const [tab, setTab] = useState<string>(initialTab);
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

interface ResultRow {
  readonly caseId: string;
  readonly label: string;
  readonly description: string;
  readonly party: string;
  readonly route?: string;
}

interface RoutableCase {
  readonly caseId: string;
  readonly route?: string;
}

// Each row opens its own record: the Master Plan row carries an explicit route;
// every other row is routed by its case-id suffix (notification → general,
// absence → absence-hub, GDC → claim-hub) via the shared case-tabs helpers.
const rowRoute = (row: RoutableCase): string =>
  row.route ?? `/cases/${row.caseId}/${tabSlug(defaultTab(caseKind(row.caseId)))}`;

// Master Plan is the one non-Process2 platform fixture the captured intake popup
// shows; it carries an explicit members route while every DB-derived row routes
// by its own case id.
const MASTER_PLAN_INTAKE: ResultRow = {
  caseId: "18489",
  label: "Master Plan - 18489",
  description: "",
  party: "Fifth Third Bank National Association",
  route: MASTER_PLAN_ROUTE,
};

const toResultRow = (row: RecentCaseRow): ResultRow => ({
  caseId: row.caseId,
  label: row.label,
  description: row.description,
  party: row.partyName,
});

const useRecentRows = (): readonly ResultRow[] => {
  const [rows, setRows] = useState<readonly ResultRow[]>([]);
  useEffect(() => { void loadRecentRows(setRows); }, []);
  return rows;
};

const loadRecentRows = async (set: (rows: readonly ResultRow[]) => void): Promise<void> => {
  const result = await getRecentCases();
  if (result.ok) set(result.value.map(toResultRow));
};

function PopupResults({ onPick }: { readonly onPick: () => void }) {
  const navigate = useNavigate();
  const recent = useRecentRows();
  const rows = [MASTER_PLAN_INTAKE, ...recent];
  return <div className="fx-search-body fx-search-body--popup">
    <ResultsTable rows={rows} onOpen={(route) => openResult(route, navigate, onPick)} />
  </div>;
}

function RecentResults({ onPick }: { readonly onPick: () => void }) {
  const navigate = useNavigate();
  const rows = useRecentRows();
  return (
    <div className="fx-search-body">
      <ResultsTable rows={rows} onOpen={(route) => openResult(route, navigate, onPick)} />
    </div>
  );
}

const openResult = (route: string, navigate: (to: string) => void, onPick: () => void): void => {
  onPick();
  navigate(route);
};

function CaseSearch() {
  const [rows, setRows] = useState<readonly SearchRow[]>([]);
  const navigate = useNavigate();
  return (
    <div className="fx-search-body">
      <CaseFields onSearch={(term) => runCaseSearch(term, setRows)} />
      {rows.length > 0 && <CaseResults rows={rows} onSelect={(row) => navigate(rowRoute(row))} />}
    </div>
  );
}

function CaseResults({ rows, onSelect }: { readonly rows: readonly SearchRow[]; readonly onSelect: (row: SearchRow) => void }) {
  return (
    <div className="fx-results-block">
      <p className="fx-results-title">Search Results</p>
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
  if (result.ok) set(matchesMasterPlan(term) ? [MASTER_PLAN, ...result.value] : result.value);
};

const matchesMasterPlan = (term: string): boolean => {
  const query = term.trim().toLowerCase();
  return query.includes("18489") || query.includes("master plan");
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

function ResultsTable({ rows, selectedId, onOpen }: { readonly rows: readonly ResultRow[]; readonly selectedId?: string; readonly onOpen: (route: string) => void }) {
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

function ResultTr({ row, selected, onOpen }: { readonly row: ResultRow; readonly selected: boolean; readonly onOpen: (route: string) => void }) {
  return (
    <tr aria-selected={selected} className={selected ? "fx-row-on" : undefined}>
      <td><ResultCase row={row} onOpen={onOpen} /></td>
      <td>{row.description}</td>
      <td>{row.party}</td>
    </tr>
  );
}

function ResultCase({ row, onOpen }: { readonly row: ResultRow; readonly onOpen: (route: string) => void }) {
  return <button type="button" className="fx-result" onClick={() => onOpen(rowRoute(row))}>{row.label}</button>;
}
