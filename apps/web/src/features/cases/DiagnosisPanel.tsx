import { useState } from "react";
import { Link } from "react-router-dom";
import type { DiagnosisCandidate } from "@fineos/contracts";
import { updateDiagnosis } from "../../app/api";
import { SelectField } from "../intake/fields/controls";
import type { PanelContext } from "./CasePage";

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

// ACT_15 target: the case's own dossier.lookup.candidates are the only
// suggestion source (no shared ICD-10 fallback table). Saving is the
// persisted target-state PATCH, not local-only state, so the table always
// reflects what a reload would show.
export function DiagnosisPanel({ ctx }: { readonly ctx: PanelContext }) {
  const [level, setLevel] = useState("Primary");
  const [error, setError] = useState<string | null>(null);
  const save = (code: string): void => void saveDiagnosis(ctx, code, setError);
  return <section><h2 className="fx-section-title">Diagnosis Codes</h2>
    <DiagnosisEntryRow level={level} caseId={ctx.rootId} candidates={ctx.details.dossier.lookup.candidates} onLevel={setLevel} onSave={save} />
    {error && <p role="alert" className="fx-error">{error}</p>}
    <DiagnosisTable rows={savedRows(ctx)} />
  </section>;
}

const saveDiagnosis = async (
  ctx: PanelContext, code: string, setError: (message: string | null) => void,
): Promise<void> => {
  const result = await updateDiagnosis(ctx.rootId, code);
  if (!result.ok) return setError(result.message);
  setError(null);
  await ctx.refresh();
};

const savedRows = (ctx: PanelContext): readonly DiagnosisRow[] => {
  const diagnosis = ctx.details.targetState.diagnosis;
  if (!diagnosis?.updated) return [];
  return [{
    level: "Primary", type: DEFAULT_TYPE, code: diagnosis.value.code, description: diagnosis.value.description,
    severity: NOT_APPLICABLE, effectiveFrom: NOT_APPLICABLE, effectiveTo: NOT_APPLICABLE,
  }];
};

interface EntryProps {
  readonly level: string;
  readonly caseId: string;
  readonly candidates: readonly DiagnosisCandidate[];
  readonly onLevel: (value: string) => void;
  readonly onSave: (code: string) => void;
}

function DiagnosisEntryRow({ level, caseId, candidates, onLevel, onSave }: EntryProps) {
  return <div className="fx-diagnosis-entry">
    <TypeAhead candidates={candidates} onSave={onSave} />
    <SelectField label="Level Indicator" options={LEVELS} value={level} onChange={onLevel} />
    <Link className="fx-link" to={`/lookups/uknow?case=${encodeURIComponent(caseId)}`}>Look up ICD-10 code</Link>
  </div>;
}

// A code typed as "CODE - description" saves just the leading code; the
// endpoint re-validates against dossier.lookup.candidates either way.
const codeFromQuery = (query: string): string => query.split(" - ")[0]!.trim();

function TypeAhead({ candidates, onSave }: { readonly candidates: readonly DiagnosisCandidate[]; readonly onSave: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const matches = suggestions(query, candidates);
  const submit = (): void => { onSave(codeFromQuery(query)); setQuery(""); };
  return <div className="fx-typeahead">
    <label className="fx-field"><span className="fx-field-label">Diagnosis code or description</span>
      <input className="fx-input" role="combobox" aria-expanded={matches.length > 0} aria-controls="fx-diagnosis-listbox"
        value={query} onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && query.trim().length > 0) submit(); }} />
    </label>
    {matches.length > 0 && <Suggestions matches={matches} onPick={(entry) => { onSave(entry.code); setQuery(""); }} />}
  </div>;
}

const suggestions = (query: string, candidates: readonly DiagnosisCandidate[]): readonly DiagnosisCandidate[] => {
  const term = query.trim().toLowerCase();
  if (term.length === 0) return [];
  return candidates.filter((entry) => `${entry.code} ${entry.description}`.toLowerCase().includes(term));
};

function Suggestions({ matches, onPick }: { readonly matches: readonly DiagnosisCandidate[]; readonly onPick: (entry: DiagnosisCandidate) => void }) {
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
