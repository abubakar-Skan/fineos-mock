import { Link, Navigate, useParams, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

const LOOKUP_TITLES: Record<string, string> = {
  uknow: "UNUM Inside — uKnow",
  google: "Google Search",
  icd10data: "ICD10Data.com",
  "icd-reference": "ICD Codes: Reference Sheet",
  "icd-chart": "Common ICD-10 Codes Chart",
};

export function LookupPage() {
  const { source } = useParams();
  const navigate = useNavigate();
  if (!source || !(source in LOOKUP_TITLES)) return <Navigate to="/dashboard" replace />;
  return <div className={`fx-lookup fx-lookup--${source}`}>
    <LookupChrome title={LOOKUP_TITLES[source]!} onBack={() => navigate(-1)} />
    <LookupContent source={source} />
  </div>;
}

function LookupChrome({ title, onBack }: { readonly title: string; readonly onBack: () => void }) {
  return <header className="fx-lookup-chrome">
    <span className="fx-lookup-title">{title}</span>
    <button type="button" className="fx-ghost" onClick={onBack}>Back to claim</button>
  </header>;
}

function LookupContent({ source }: { readonly source: string }) {
  if (source === "google") return <GoogleLookup />;
  if (source === "icd10data") return <Icd10DataLookup />;
  if (source === "icd-reference") return <ReferenceSheetLookup />;
  if (source === "icd-chart") return <ChartLookup />;
  return <UknowLookup />;
}

function UknowLookup() {
  return <main className="fx-lookup-body">
    <h1>resources to locate icd 10 codes</h1>
    <p>13060 results found in 0.95 seconds</p>
    <Panel title="GetAnswer">
      <p>The preferred resources to locate the appropriate ICD 10 code(s) are listed below:</p>
      <ul className="fx-lookup-links">
        <li><Link className="fx-link" to="/lookups/icd10data">ICD 10 Data</Link></li>
        <li><Link className="fx-link" to="/lookups/google">Google</Link></li>
        <li><Link className="fx-link" to="/lookups/icd-reference">ICD Codes: Reference Sheet</Link></li>
        <li><Link className="fx-link" to="/lookups/icd-chart">Common ICD10 Codes &amp; Medical Category</Link></li>
      </ul>
    </Panel>
  </main>;
}

function GoogleLookup() {
  return <main className="fx-lookup-body">
    <h1>what is the ICD 10 diagnosis code for knee surgery</h1>
    <Panel title="AI Overview">
      <p>ICD-10-CM codes for the presence of an artificial knee joint depend on the side of surgery.</p>
      <ul className="fx-lookup-links">
        <li>Z96.651: Presence of right artificial knee joint</li>
        <li>Z96.652: Presence of left artificial knee joint</li>
        <li>Z96.653: Presence of artificial knee joint, bilateral</li>
      </ul>
    </Panel>
  </main>;
}

function Icd10DataLookup() {
  return <main className="fx-lookup-body">
    <h1>The Web&apos;s Free 2026 ICD-10-CM/PCS Medical Coding Reference</h1>
    <p>ICD10Data.com is a free reference website designed for the fast lookup of all current American ICD-10-CM (diagnosis) and ICD-10-PCS (procedure) medical billing codes.</p>
    <p>The 2026 ICD-10-CM/PCS code sets became effective on October 1, 2025.</p>
    <Link className="fx-link" to="/lookups/icd-chart">Common ICD-10 Codes Chart</Link>
  </main>;
}

function ReferenceSheetLookup() {
  return <main className="fx-lookup-body">
    <h1>ICD Codes: Reference Sheet</h1>
    <h2 className="fx-section-title">Attachments</h2>
    <table className="fx-table"><thead><tr><th>File</th></tr></thead>
      <tbody><tr><td><Link className="fx-link" to="/lookups/icd-chart">Click here to view the file</Link></td></tr></tbody>
    </table>
  </main>;
}

const CHART_ROWS: readonly (readonly [string, string, string])[] = [
  ["Annual Physical", "Z00.0", "General adult medical examination"],
  ["Immunization", "Z23", "Encounter for immunization"],
  ["Allergy Shot", "T78.40XA", "Allergy unspecified, initial encounter"],
  ["Flu Shot", "J10.1", "Influenza due to other identified influenza virus"],
  ["Breast Ultrasound", "Z12.39", "Encounter for other screening for neoplasm of breast"],
  ["Cholesterol", "Z13.220", "Encounter for screening for lipid disorders"],
];

function ChartLookup() {
  return <main className="fx-lookup-body">
    <h1>Common ICD-10 Codes Chart</h1>
    <table className="fx-table"><thead><tr><th>Wellness Tests</th><th>ICD10</th><th>Definition</th></tr></thead>
      <tbody>{CHART_ROWS.map(([test, code, def]) => (
        <tr key={test}><td>{test}</td><td>{code}</td><td>{def}</td></tr>
      ))}</tbody>
    </table>
  </main>;
}

function Panel({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <section className="fx-lookup-panel"><h2 className="fx-section-title">{title}</h2>{children}</section>;
}
