import { useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { CaseDocument, CaseEForm, CaseEFormKind } from "@fineos/contracts";
import type { PanelContext } from "./CasePage";

export function DocumentsTab({ ctx }: { readonly ctx: PanelContext; readonly navigate: NavigateFunction }) {
  const [eForm, setEForm] = useState<CaseEFormKind | null>(null);
  const [filters, setFilters] = useState<DocumentFilters>(EMPTY_FILTERS);
  if (eForm) return <EformView kind={eForm} eForms={ctx.details.dossier.eForms} onBack={() => setEForm(null)} />;
  const rows = filterDocuments(ctx.details.dossier.documents, filters);
  return <section><h2 className="fx-section-title">Documents For Case</h2>
    <DocumentFilters filters={filters} onFilters={setFilters} />
    <DocumentTable rows={rows} onOpen={setEForm} />
    <div className="fx-doc-table-foot"><span><i>↻</i><i>⟳</i><i>↗</i></span><span>1-{rows.length} of {rows.length}</span></div>
  </section>;
}

interface DocumentFilters {
  readonly from: string;
  readonly to: string;
  readonly includeSubCases: boolean;
}

const EMPTY_FILTERS: DocumentFilters = { from: "", to: "", includeSubCases: true };

// ponytail: these filter toggles + the row/select-all checkboxes are decorative
// (rendered disabled) to mirror the source screenshot without adding no-op
// controls. Upgrade path: wire them to real document filtering/selection.
const EXTRA_TOGGLES = ["Include Invoices", "Include Decisions", "Display Marked for Deletion"] as const;

const NOTIFICATION_CASE_TYPE = "Notification";

function DocumentFilters({ filters, onFilters }: { readonly filters: DocumentFilters; readonly onFilters: (filters: DocumentFilters) => void }) {
  const patch = (part: Partial<DocumentFilters>): void => onFilters({ ...filters, ...part });
  return <div className="fx-doc-filterbar">
    <div className="fx-doc-dates">
      <FilterInput label="From" value={filters.from} onChange={(from) => patch({ from })} />
      <FilterInput label="To" value={filters.to} onChange={(to) => patch({ to })} />
      <button type="button" className="fx-ghost fx-doc-clear" onClick={() => patch({ from: "", to: "" })}>Clear</button>
    </div>
    <div className="fx-doc-toggles">
      <label className="fx-checkbox"><input type="checkbox" checked={filters.includeSubCases}
        onChange={(event) => patch({ includeSubCases: event.target.checked })} /><span>Include Sub-Cases</span></label>
      {EXTRA_TOGGLES.map((label) => (
        <label key={label} className="fx-checkbox"><input type="checkbox" disabled /><span>{label}</span></label>
      ))}
    </div>
  </div>;
}

function FilterInput({ label, value, onChange }: { readonly label: string; readonly value: string; readonly onChange: (value: string) => void }) {
  return <label className="fx-field"><span className="fx-field-label">{label}</span>
    <input className="fx-input" value={value} onChange={(event) => onChange(event.target.value)} />
  </label>;
}

const filterDocuments = (rows: readonly CaseDocument[], filters: DocumentFilters): readonly CaseDocument[] =>
  rows.filter((row) => inDateRange(row.createdDate, filters) && (filters.includeSubCases || row.caseType === NOTIFICATION_CASE_TYPE));

const inDateRange = (date: string, filters: DocumentFilters): boolean => {
  const value = sortableDate(date);
  return (!filters.from || value >= sortableDate(filters.from))
    && (!filters.to || value <= sortableDate(filters.to));
};

const sortableDate = (value: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [month = "", day = "", year = ""] = value.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const DOC_COLUMNS = ["Case Type", "Received / Created", "User Created", "Status", "Document Type", "Description", "Document Group", "Delivery Channel", "Title"] as const;

function DocumentTable({ rows, onOpen }: { readonly rows: readonly CaseDocument[]; readonly onOpen: (kind: CaseEFormKind) => void }) {
  return <table className="fx-table fx-doc-table">
    <thead><tr><th className="fx-doc-check"><input type="checkbox" aria-label="Select all" disabled /></th>
      {DOC_COLUMNS.map((label) => <th key={label} className="fx-doc-col">{label}</th>)}</tr></thead>
    <tbody>{rows.length === 0 ? <tr><td colSpan={10}>No documents match the selected filters.</td></tr>
      : rows.map((row) => <DocumentRowView key={row.id} row={row} onOpen={onOpen} />)}</tbody>
  </table>;
}

function DocumentRowView({ row, onOpen }: { readonly row: CaseDocument; readonly onOpen: (kind: CaseEFormKind) => void }) {
  return <tr>
    <td className="fx-doc-check"><input type="checkbox" aria-label={`Select ${row.documentType}`} disabled /></td>
    <td><span className={`fx-doc-icon fx-doc-icon--${row.icon}`} aria-hidden="true" />{row.caseType}</td>
    <td>{row.createdDate}</td><td>{row.createdBy}</td><td>{row.status}</td>
    <td><DocumentLink row={row} onOpen={onOpen} /></td>
    <td>{row.description}</td><td>{row.group}</td><td>{row.delivery}</td><td>{row.title}</td>
  </tr>;
}

function DocumentLink({ row, onOpen }: { readonly row: CaseDocument; readonly onOpen: (kind: CaseEFormKind) => void }) {
  if (!row.eFormKind) return <span>{row.documentType}</span>;
  const kind = row.eFormKind;
  return <button type="button" className="fx-result" onClick={() => onOpen(kind)}>{row.documentType}</button>;
}

// eForm answers are rendered from the persisted dossier.eForms rows, keyed by
// the document's eForm kind — no per-case reference answers.
function EformView({ kind, eForms, onBack }: { readonly kind: CaseEFormKind; readonly eForms: readonly CaseEForm[]; readonly onBack: () => void }) {
  const eForm = eForms.find((form) => form.kind === kind);
  return <section className="fx-eform-view"><div className="fx-subhead">
    <h2 className="fx-section-title">{eForm?.title ?? "eForm"}</h2>
    <button type="button" className="fx-ghost" onClick={onBack}>Back to Documents</button>
  </div>
    <div className="fx-eform-frame"><strong>Questions</strong>
      <div className="fx-eform">{(eForm?.rows ?? []).map((answer) => (
        <p key={answer.question}><strong>{answer.question}:</strong> {answer.answer}</p>
      ))}</div>
    </div>
    <div className="fx-eform-actions"><button type="button" className="fx-ghost" onClick={onBack}>Back to Documents</button></div>
  </section>;
}
