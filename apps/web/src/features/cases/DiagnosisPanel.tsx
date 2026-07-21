import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DiagnosisCandidate, DiagnosisEntry } from "@fineos/contracts";
import { SelectField } from "../intake/fields/controls";
import type { PanelContext } from "./CasePage";
import { ICD_CODES, type IcdCode } from "./diagnosis-codes";

const LEVELS = ["Primary", "Secondary", "Contributing"];
const DEFAULT_TYPE = "ICD-10-CM";
const NOT_APPLICABLE = "N/A";

interface DiagnosisRow {
  readonly level: string;
  readonly type: string;
  readonly code: string;
  readonly description: string;
  readonly severity: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string;
}

const seededRows = (diagnoses: readonly DiagnosisEntry[] | undefined): readonly DiagnosisRow[] =>
  (diagnoses ?? []).map((entry) => ({ ...entry }));

const rowFromCode = (entry: IcdCode, level: string): DiagnosisRow => ({
  level, type: DEFAULT_TYPE, code: entry.code, description: entry.description,
  severity: NOT_APPLICABLE, effectiveFrom: NOT_APPLICABLE, effectiveTo: NOT_APPLICABLE,
});

export function DiagnosisPanel({ ctx }: { readonly ctx: PanelContext }) {
  const diagnoses = ctx.details.dossier.gdc?.diagnoses;
  const [rows, setRows] = useState<readonly DiagnosisRow[]>(() => seededRows(diagnoses));
  const [level, setLevel] = useState("Primary");
  useEffect(() => {
    setRows(seededRows(ctx.details.dossier.gdc?.diagnoses));
    setLevel("Primary");
  }, [ctx.rootId, ctx.details.dossier.gdc?.diagnoses]);
  const add = (entry: IcdCode): void => addDiagnosis(entry, level, ctx, rows, setRows);
  return <section><h2 className="fx-section-title">Diagnosis Codes</h2>
    <DiagnosisEntryRow level={level} caseId={ctx.rootId} candidates={ctx.details.dossier.lookup.candidates} onLevel={setLevel} onAdd={add} />
    <DiagnosisTable rows={rows} />
  </section>;
}

const addDiagnosis = (
  entry: IcdCode, level: string, ctx: PanelContext,
  rows: readonly DiagnosisRow[], setRows: (rows: readonly DiagnosisRow[]) => void,
): void => {
  setRows([...rows, rowFromCode(entry, level)]);
  ctx.workflow.setDiagnosis(entry.code);
};

interface EntryProps {
  readonly level: string;
  readonly caseId: string;
  readonly candidates: readonly DiagnosisCandidate[];
  readonly onLevel: (value: string) => void;
  readonly onAdd: (entry: IcdCode) => void;
}

function DiagnosisEntryRow({ level, caseId, candidates, onLevel, onAdd }: EntryProps) {
  return <div className="fx-diagnosis-entry">
    <TypeAhead candidates={candidates} onAdd={onAdd} />
    <SelectField label="Level Indicator" options={LEVELS} value={level} onChange={onLevel} />
    <Link className="fx-link" to={`/lookups/uknow?case=${encodeURIComponent(caseId)}`}>Look up ICD-10 code</Link>
  </div>;
}

// Suggestions merge the case's dossier.lookup candidates with the shared
// platform ICD-10 table so both the captured evidence codes and generic
// codes resolve, deduped by code.
const suggestionPool = (candidates: readonly DiagnosisCandidate[]): readonly IcdCode[] => {
  const pool = new Map<string, IcdCode>();
  for (const candidate of candidates) pool.set(candidate.code, { code: candidate.code, description: candidate.description });
  for (const entry of ICD_CODES) if (!pool.has(entry.code)) pool.set(entry.code, entry);
  return [...pool.values()];
};

function TypeAhead({ candidates, onAdd }: { readonly candidates: readonly DiagnosisCandidate[]; readonly onAdd: (entry: IcdCode) => void }) {
  const [query, setQuery] = useState("");
  const matches = suggestions(query, candidates);
  return <div className="fx-typeahead">
    <label className="fx-field"><span className="fx-field-label">Diagnosis code or description</span>
      <input className="fx-input" role="combobox" aria-expanded={matches.length > 0} aria-controls="fx-diagnosis-listbox"
        value={query} onChange={(event) => setQuery(event.target.value)} />
    </label>
    {matches.length > 0 && <Suggestions matches={matches} onPick={(entry) => { onAdd(entry); setQuery(""); }} />}
  </div>;
}

const suggestions = (query: string, candidates: readonly DiagnosisCandidate[]): readonly IcdCode[] => {
  const term = query.trim().toLowerCase();
  if (term.length === 0) return [];
  return suggestionPool(candidates).filter((entry) => `${entry.code} ${entry.description}`.toLowerCase().includes(term));
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
    <colgroup><col /><col /><col /><col /><col /><col /><col /></colgroup>
    <thead><tr><th>Level</th><th>Type</th><th>Code</th><th>Description</th><th>Severity</th><th>Effective From</th><th>Effective To</th></tr></thead>
    <tbody>{rows.length === 0
      ? <tr><td colSpan={7} className="fx-empty-inline">No diagnosis codes recorded.</td></tr>
      : rows.map((row) => <DiagnosisRowView key={`${row.level}-${row.code}`} row={row} />)}</tbody>
  </table>;
}

function DiagnosisRowView({ row }: { readonly row: DiagnosisRow }) {
  return <tr><td>{row.level}</td><td>{row.type}</td><td>{row.code}</td><td>{row.description}</td>
    <td>{row.severity}</td><td>{row.effectiveFrom}</td><td>{row.effectiveTo}</td></tr>;
}
