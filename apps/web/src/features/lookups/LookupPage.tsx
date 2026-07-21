import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { CaseLookup, DossierPanel, DossierTable, LookupContent, LookupLink } from "@fineos/contracts";
import { getCase } from "../../app/api";

const LOOKUP_TITLES: Record<string, string> = {
  uknow: "UNUM Inside — uKnow",
  google: "Google Search",
  icd10data: "ICD10Data.com",
  "icd-reference": "ICD Codes: Reference Sheet",
  "icd-chart": "Common ICD-10 Codes Chart",
};

// Each lookup route reads its content from the active case's dossier.lookup,
// keyed by the ?case= query the diagnosis panel and evidence links carry.
const LOOKUP_FIELD: Record<string, keyof CaseLookup> = {
  uknow: "uKnow",
  google: "google",
  icd10data: "icd10Data",
  "icd-reference": "icdReference",
  "icd-chart": "chart",
};

type ContentState = LookupContent | "loading" | null;

export function LookupPage() {
  const { source } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const caseId = params.get("case");
  const [content, setContent] = useState<ContentState>("loading");
  useEffect(() => { void loadLookup(source, caseId, setContent); }, [source, caseId]);
  if (!source || !(source in LOOKUP_FIELD)) return <Navigate to="/dashboard" replace />;
  return <div className={`fx-lookup fx-lookup--${source}`}>
    <LookupChrome title={LOOKUP_TITLES[source] ?? source} onBack={() => navigate(-1)} />
    <LookupBody content={content} caseId={caseId} />
  </div>;
}

const loadLookup = async (
  source: string | undefined,
  caseId: string | null,
  set: (content: ContentState) => void,
): Promise<void> => {
  const field = source ? LOOKUP_FIELD[source] : undefined;
  if (!field || !caseId) return set(null);
  const result = await getCase(caseId);
  set(result.ok ? result.value.dossier.lookup[field] as LookupContent : null);
};

function LookupChrome({ title, onBack }: { readonly title: string; readonly onBack: () => void }) {
  return <header className="fx-lookup-chrome">
    <span className="fx-lookup-title">{title}</span>
    <button type="button" className="fx-ghost" onClick={onBack}>Back to claim</button>
  </header>;
}

function LookupBody({ content, caseId }: { readonly content: ContentState; readonly caseId: string | null }) {
  if (content === "loading") return <main className="fx-lookup-body"><p className="fx-loading">Loading…</p></main>;
  if (!content) return <main className="fx-lookup-body"><p className="fx-empty-inline">No lookup content available.</p></main>;
  return <main className="fx-lookup-body">
    <h1>{content.title}</h1>
    {content.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    {content.panels.map((panel) => <LookupPanel key={panel.id} panel={panel} />)}
    {content.tables.map((table) => <LookupTable key={table.id} table={table} />)}
    <LookupLinks links={content.links} caseId={caseId} />
  </main>;
}

function LookupPanel({ panel }: { readonly panel: DossierPanel }) {
  return <section className="fx-lookup-panel"><h2 className="fx-section-title">{panel.title}</h2>
    <ul className="fx-lookup-links">{panel.fields.map((field) => (
      <li key={field.key}>{field.label}: {field.value}</li>
    ))}</ul>
  </section>;
}

function LookupTable({ table }: { readonly table: DossierTable }) {
  return <table className="fx-table">
    <thead><tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
    <tbody>{table.rows.map((row) => (
      <tr key={row.id}>{row.cells.map((cell, index) => <td key={`${row.id}-${index}`}>{cell}</td>)}</tr>
    ))}</tbody>
  </table>;
}

function LookupLinks({ links, caseId }: { readonly links: readonly LookupLink[]; readonly caseId: string | null }) {
  if (links.length === 0) return null;
  return <ul className="fx-lookup-links">{links.map((link) => (
    <li key={link.route}><Link className="fx-link" to={withCase(link.route, caseId)}>{link.label}</Link></li>
  ))}</ul>;
}

const withCase = (route: string, caseId: string | null): string =>
  caseId && route.startsWith("/lookups/") ? `${route}?case=${encodeURIComponent(caseId)}` : route;
