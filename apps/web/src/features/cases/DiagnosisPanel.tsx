import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SelectField } from "../intake/fields/controls";
import type { PanelContext } from "./CasePage";
import { describeDiagnosis, ICD_CODES, type IcdCode } from "./diagnosis-codes";

const LEVELS = ["Primary", "Secondary", "Contributing"];

interface DiagnosisRow extends IcdCode {
  readonly level: string;
}

const initialRows = (saved: string | null | undefined): readonly DiagnosisRow[] =>
  saved ? [{ level: "Primary", code: saved, description: describeDiagnosis(saved) }] : [];

export function DiagnosisPanel({ ctx }: { readonly ctx: PanelContext }) {
  const [rows, setRows] = useState<readonly DiagnosisRow[]>(() => initialRows(ctx.details.gdc?.diagnosisCode));
  const [level, setLevel] = useState("Primary");
  useEffect(() => {
    setRows(initialRows(ctx.details.gdc?.diagnosisCode));
    setLevel("Primary");
  }, [ctx.rootId, ctx.details.gdc?.diagnosisCode]);
  const add = (entry: IcdCode): void => addDiagnosis(entry, level, ctx, rows, setRows);
  return <section><h2 className="fx-section-title">Diagnosis Codes</h2>
    <DiagnosisEntry level={level} onLevel={setLevel} onAdd={add} />
    <DiagnosisTable rows={rows} />
  </section>;
}

const addDiagnosis = (
  entry: IcdCode, level: string, ctx: PanelContext,
  rows: readonly DiagnosisRow[], setRows: (rows: readonly DiagnosisRow[]) => void,
): void => {
  setRows([...rows, { level, ...entry }]);
  ctx.workflow.setDiagnosis(entry.code);
};

function DiagnosisEntry({ level, onLevel, onAdd }: { readonly level: string; readonly onLevel: (v: string) => void; readonly onAdd: (entry: IcdCode) => void }) {
  return <div className="fx-diagnosis-entry">
    <TypeAhead onAdd={onAdd} />
    <SelectField label="Level Indicator" options={LEVELS} value={level} onChange={onLevel} />
    <Link className="fx-link" to="/lookups/uknow">Look up ICD-10 code</Link>
  </div>;
}

function TypeAhead({ onAdd }: { readonly onAdd: (entry: IcdCode) => void }) {
  const [query, setQuery] = useState("");
  const matches = suggestions(query);
  return <div className="fx-typeahead">
    <label className="fx-field"><span className="fx-field-label">Diagnosis code or description</span>
      <input className="fx-input" role="combobox" aria-expanded={matches.length > 0} aria-controls="fx-diagnosis-listbox"
        value={query} onChange={(event) => setQuery(event.target.value)} />
    </label>
    {matches.length > 0 && <Suggestions matches={matches} onPick={(entry) => { onAdd(entry); setQuery(""); }} />}
  </div>;
}

const suggestions = (query: string): readonly IcdCode[] => {
  const term = query.trim().toLowerCase();
  if (term.length === 0) return [];
  return ICD_CODES.filter((entry) => `${entry.code} ${entry.description}`.toLowerCase().includes(term));
};

function Suggestions({ matches, onPick }: { readonly matches: readonly IcdCode[]; readonly onPick: (entry: IcdCode) => void }) {
  return <ul id="fx-diagnosis-listbox" role="listbox" className="fx-suggestions">
    {matches.map((entry) => (
      <li key={entry.code} role="option" aria-selected="false">
        <button type="button" className="fx-result" onClick={() => onPick(entry)}>{entry.code} - {entry.description}</button>
      </li>
    ))}
  </ul>;
}

function DiagnosisTable({ rows }: { readonly rows: readonly DiagnosisRow[] }) {
  return <table className="fx-table">
    <thead><tr><th>Level</th><th>Type</th><th>Code</th><th>Description</th><th>Severity</th></tr></thead>
    <tbody>{rows.length === 0
      ? <tr><td colSpan={5} className="fx-empty-inline">No diagnosis codes recorded.</td></tr>
      : rows.map((row) => <DiagnosisRowView key={`${row.level}-${row.code}`} row={row} />)}</tbody>
  </table>;
}

function DiagnosisRowView({ row }: { readonly row: DiagnosisRow }) {
  return <tr><td>{row.level}</td><td>ICD-10-CM</td><td>{row.code}</td><td>{row.description}</td><td>N/A</td></tr>;
}
