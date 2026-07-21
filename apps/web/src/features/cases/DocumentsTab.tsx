import { useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { CaseDetailsView } from "../../app/api";
import type { PanelContext } from "./CasePage";
import { displayDate, isDavidReference, section } from "./case-sections";

interface DocumentRow {
  readonly caseType: string;
  readonly icon: "doc" | "pdf";
  readonly created: string;
  readonly user: string;
  readonly status: string;
  readonly documentType: string;
  readonly description?: string;
  readonly group?: string;
  readonly delivery: string;
  readonly title?: string;
  readonly eform?: "claim" | "absence";
}

const REFERENCE_DOCUMENTS: readonly DocumentRow[] = [
  { caseType: "STD Benefit", icon: "doc", created: "01/06/2026", user: "System Administrator", status: "Completed", documentType: "Policy Provisions Document", group: "Claim Forms", delivery: "Unknown", title: "Policy Provisions #00308641" },
  { caseType: "STD Benefit", icon: "doc", created: "01/06/2026", user: "Total Leave Assist Adm", status: "Completed", documentType: "STD Earnings and Tax", description: "Automated STD Earnings and Tax", delivery: "Unknown" },
  { caseType: "STD Benefit", icon: "doc", created: "01/06/2026", user: "John Smith", status: "Unknown", documentType: "Policy Info", delivery: "Unknown" },
  { caseType: "Absence Case", icon: "pdf", created: "01/06/2026", user: "Sibandu Mukherjee", status: "Draft", documentType: "Employment Details Verification", delivery: "Unknown" },
  { caseType: "Group Disability Claim", icon: "pdf", created: "01/06/2026", user: "Claimant", status: "Completed", documentType: "Intake Summary", description: "intake-summary.pdf", group: "System Generated", delivery: "Unknown", title: "Intake Summary" },
  { caseType: "Absence Case", icon: "pdf", created: "01/06/2026", user: "Claimant", status: "Completed", documentType: "Intake Summary", description: "intake-summary.pdf", group: "System Generated", delivery: "Unknown", title: "Intake Summary" },
  { caseType: "Group Disability Claim", icon: "pdf", created: "01/06/2026", user: "Claimant", status: "Unknown", documentType: "QuestionPathClaim Eform", delivery: "Unknown", eform: "claim" },
  { caseType: "Absence Case", icon: "pdf", created: "01/06/2026", user: "Claimant", status: "Unknown", documentType: "QuestionPathAbsence Eform", delivery: "Unknown", eform: "absence" },
];

export function DocumentsTab({ ctx }: { readonly ctx: PanelContext; readonly navigate: NavigateFunction }) {
  const [eform, setEform] = useState<"claim" | "absence" | null>(null);
  const [filters, setFilters] = useState(() => initialFilters(ctx.details));
  if (eform) return <EformView kind={eform} details={ctx.details} onBack={() => setEform(null)} />;
  const rows = filterDocuments(documentsFor(ctx.details), filters);
  return <section><h2 className="fx-section-title">Documents For Case</h2>
    <DocumentFilters filters={filters} onFilters={setFilters} />
    <DocumentTable rows={rows} onOpen={setEform} />
    <div className="fx-doc-table-foot"><span><i>↻</i><i>⟳</i><i>↗</i></span><span>1-8 of 8</span></div>
  </section>;
}

interface DocumentFilters {
  readonly from: string;
  readonly to: string;
  readonly includeSubCases: boolean;
}

const DEFAULT_FILTERS: DocumentFilters = {
  from: "11/07/2025", to: "02/05/2026", includeSubCases: true,
};

// ponytail: these filter toggles + the row/select-all checkboxes are decorative
// (rendered disabled) to mirror the source screenshot without adding no-op
// controls. Upgrade path: wire them to real document filtering/selection.
const EXTRA_TOGGLES = ["Include Invoices", "Include Decisions", "Display Marked for Deletion"] as const;

const initialFilters = (details: CaseDetailsView): DocumentFilters =>
  isDavidReference(details) ? DEFAULT_FILTERS : { from: "", to: "", includeSubCases: true };

const documentsFor = (details: CaseDetailsView): readonly DocumentRow[] =>
  isDavidReference(details) ? referenceDocuments(details) : generatedDocuments(details);

const referenceDocuments = (details: CaseDetailsView): readonly DocumentRow[] =>
  REFERENCE_DOCUMENTS.map((row) =>
    row.user === "Claimant" ? { ...row, user: details.claimant.fullName } : row);

const generatedDocuments = (details: CaseDetailsView): readonly DocumentRow[] => [
  ...(details.absence ? componentDocuments(details, "Absence Case", "absence") : []),
  ...(details.gdc ? componentDocuments(details, "Group Disability Claim", "claim") : []),
  ...receivedDocuments(details),
];

const componentDocuments = (
  details: CaseDetailsView, caseType: string, eform: "claim" | "absence",
): readonly DocumentRow[] => [
  generatedRow(details, caseType, "Intake Summary"),
  { ...generatedRow(details, caseType, `QuestionPath${eform === "claim" ? "Claim" : "Absence"} Eform`), eform },
];

const generatedRow = (
  details: CaseDetailsView, caseType: string, documentType: string,
): DocumentRow => ({
  caseType, documentType, icon: "pdf", delivery: "Unknown",
  created: displayDate(details.notification.notificationDate),
  user: details.claimant.fullName, status: "Completed",
});

const receivedDocuments = (details: CaseDetailsView): readonly DocumentRow[] => {
  const received = section(details, "documents").received;
  if (!Array.isArray(received)) return [];
  return received.filter((item): item is string => typeof item === "string")
    .map((item) => generatedRow(details, "Notification", item));
};

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

const filterDocuments = (rows: readonly DocumentRow[], filters: DocumentFilters): readonly DocumentRow[] =>
  rows.filter((row) => inDateRange(row.created, filters) && (filters.includeSubCases || row.caseType === "Notification"));

const inDateRange = (date: string, filters: DocumentFilters): boolean => {
  const value = sortableDate(date);
  return (!filters.from || value >= sortableDate(filters.from))
    && (!filters.to || value <= sortableDate(filters.to));
};

const sortableDate = (value: string): string => {
  const [month = "", day = "", year = ""] = value.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const DOC_COLUMNS = ["Case Type", "Received / Created", "User Created", "Status", "Document Type", "Description", "Document Group", "Delivery Channel", "Title"] as const;

function DocumentTable({ rows, onOpen }: { readonly rows: readonly DocumentRow[]; readonly onOpen: (kind: "claim" | "absence") => void }) {
  return <table className="fx-table fx-doc-table">
    <thead><tr><th className="fx-doc-check"><input type="checkbox" aria-label="Select all" disabled /></th>
      {DOC_COLUMNS.map((label) => <th key={label} className="fx-doc-col">{label}</th>)}</tr></thead>
    <tbody>{rows.length === 0 ? <tr><td colSpan={10}>No documents match the selected filters.</td></tr>
      : rows.map((row, index) => <DocumentRowView key={`${row.documentType}-${index}`} row={row} onOpen={onOpen} />)}</tbody>
  </table>;
}

function DocumentRowView({ row, onOpen }: { readonly row: DocumentRow; readonly onOpen: (kind: "claim" | "absence") => void }) {
  return <tr>
    <td className="fx-doc-check"><input type="checkbox" aria-label={`Select ${row.documentType}`} disabled /></td>
    <td><span className={`fx-doc-icon fx-doc-icon--${row.icon}`} aria-hidden="true" />{row.caseType}</td>
    <td>{row.created}</td><td>{row.user}</td><td>{row.status}</td>
    <td><DocumentLink row={row} onOpen={onOpen} /></td>
    <td>{row.description ?? ""}</td><td>{row.group ?? ""}</td><td>{row.delivery}</td><td>{row.title ?? ""}</td>
  </tr>;
}

function DocumentLink({ row, onOpen }: { readonly row: DocumentRow; readonly onOpen: (kind: "claim" | "absence") => void }) {
  if (!row.eform) return <span>{row.documentType}</span>;
  return <button type="button" className="fx-result" onClick={() => onOpen(row.eform!)}>{row.documentType}</button>;
}

const REFERENCE_ANSWERS: readonly (readonly [string, string])[] = [
  ["Event Date", "01/08/2026"], ["Event Type", "Sickness"], ["Expected RTW Date", "01/23/2026"],
  ["Absence Type", "2"], ["Absence Frequency", "Continuous"], ["plan Type", "return_date"],
  ["Can you provide a brief description of the reason for your leave of absence?", "Torn ligament in knee, injured from football game"],
  ["Leave Reason", "Serious Health Condition - Employee"],
  ["Reason Qualifier1", "Not Work Related"], ["Reason Qualifier2", "Sickness"],
  ["Please provide the name of your surgery or procedure", "Knee Surgery"],
];

function EformView({ kind, details, onBack }: { readonly kind: "claim" | "absence"; readonly details: CaseDetailsView; readonly onBack: () => void }) {
  const title = kind === "claim" ? "QuestionPathClaimEform" : "QuestionPathAbsenceEform";
  return <section className="fx-eform-view"><h2 className="fx-section-title">{title}</h2>
    <div className="fx-eform-frame"><strong>Questions</strong><EformAnswers details={details} /></div>
    <div className="fx-eform-actions"><button type="button" className="fx-ghost" onClick={onBack}>Back to Documents</button></div>
  </section>;
}

// ponytail: the captured eForm answers (e.g. "Torn ligament in knee") are not in the DB
// seed, so they are preserved here as reference fixtures. Upgrade path: persist eForm
// answers on the notification and read them instead.
function EformAnswers({ details }: { readonly details: CaseDetailsView }) {
  const answers = details.notification.id === "NTN-159898" ? REFERENCE_ANSWERS : derivedAnswers(details);
  return <div className="fx-eform">{answers.map(([q, a]) => (
    <p key={q}><strong>{q}:</strong> {a}</p>
  ))}</div>;
}

const derivedAnswers = (details: CaseDetailsView): readonly (readonly [string, string])[] => [
  ["Event Date", details.notification.notificationDate],
  ["Leave Reason", details.absence?.leaveReason ?? "—"],
  ["Description", details.absence?.conditionDescription ?? details.notification.conditionDescription ?? "—"],
];
