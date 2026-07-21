import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams, type NavigateFunction } from "react-router-dom";
import {
  AUTOMATION_SHORTCUTS_ENABLED,
  type CaseMapNode,
  type CaseMapParticipant,
  type DossierBand,
  type DossierField,
} from "@fineos/contracts";
import { AppShell } from "../../components/fineos/AppShell";
import { RecordShell } from "../../components/fineos/RecordShell";
import { EmptyState } from "../../components/fineos/DataTable";
import { executeCase, getCase, type CaseDetailsView, type ExecutionResultView } from "../../app/api";
import {
  absenceCaseId, caseKind, casePresentation, defaultTab, gdcCaseId,
  rootCaseId, tabFromSlug, tabSlug, type CaseKind,
} from "./case-tabs";
import { DocumentsTab } from "./DocumentsTab";
import { CaseMapTab } from "./CaseMapTab";
import { ContactsTab } from "./ContactsTab";
import { AbsenceHub, EmploymentDetails, LeaveDetails } from "./AbsenceTabs";
import { ClaimHub, MedicalTab } from "./GdcTabs";
import type { ProviderSelectionDecision } from "./ProviderFlow";

export interface CaseWorkflow {
  readonly diagnosis: string | null;
  readonly providerDecision: ProviderSelectionDecision;
  readonly outcome: ExecutionResultView | null;
  readonly error: string | null;
  readonly setDiagnosis: (code: string) => void;
  readonly setProviderDecision: (decision: ProviderSelectionDecision) => void;
  readonly run: () => void;
}

export interface PanelContext {
  readonly caseId: string;
  readonly rootId: string;
  readonly view?: string;
  readonly details: CaseDetailsView;
  readonly workflow: CaseWorkflow;
  readonly choosing: boolean;
  readonly setChoosing: (value: boolean) => void;
}

type DetailsState = "loading" | "not_found" | CaseDetailsView;

export function CasePage() {
  const { caseId, tab } = useParams();
  const [state, refresh] = useCaseDetails(caseId);
  if (!caseId) return <Navigate to="/dashboard" replace />;
  return <AppShell><CaseView caseId={caseId} slug={tab} state={state} refresh={refresh} /></AppShell>;
}

const useCaseDetails = (caseId?: string): [DetailsState, () => Promise<CaseDetailsView | null>] => {
  const [state, setState] = useState<DetailsState>("loading");
  const rootId = caseId ? rootCaseId(caseId) : "";
  const refresh = useCallback(() => loadDetails(rootId, setState), [rootId]);
  useEffect(() => { setState("loading"); void refresh(); }, [refresh]);
  return [state, refresh];
};

const loadDetails = async (
  rootId: string,
  set: (state: DetailsState) => void,
): Promise<CaseDetailsView | null> => {
  if (!rootId) return null;
  const result = await getCase(rootId);
  set(result.ok ? result.value : "not_found");
  return result.ok ? result.value : null;
};

interface CaseViewProps {
  readonly caseId: string;
  readonly slug?: string;
  readonly state: DetailsState;
  readonly refresh: () => Promise<CaseDetailsView | null>;
}

function CaseView({ caseId, slug, state, refresh }: CaseViewProps) {
  if (state === "loading") return <p className="fx-loading">Loading…</p>;
  if (state === "not_found") return <CaseNotFound caseId={caseId} />;
  if (state.notification.id !== rootCaseId(caseId)) return <p className="fx-loading">Loading…</p>;
  return <CaseRecord key={rootCaseId(caseId)} caseId={caseId} slug={slug} details={state} refresh={refresh} />;
}

function CaseNotFound({ caseId }: { readonly caseId: string }) {
  return <div className="fx-record-body"><EmptyState label={`Case ${caseId} was not found.`} /></div>;
}

function CaseRecord({ caseId, slug, details, refresh }: { readonly caseId: string; readonly slug?: string; readonly details: CaseDetailsView; readonly refresh: () => Promise<CaseDetailsView | null> }) {
  const navigate = useNavigate();
  const kind = caseKind(caseId);
  const tab = slug === "employment-details" ? "Leave Details" : tabFromSlug(kind, slug);
  const workflow = useWorkflow(caseId, details, refresh);
  const [choosing, setChoosing] = useState(false);
  const chooseHere = choosing && tab === "Medical";
  const processTitle = chooseHere ? "Choose the Party to have a role of Medical Provider"
    : slug === "employment-details" ? "Employment details"
      : tab === "Medical" ? "Medical Details" : undefined;
  return <RecordShell {...shellProps(caseId, kind, details, tab, navigate, workflow)} chromeless={chooseHere}
    processTitle={processTitle}>
    <CaseBody ctx={{ caseId, rootId: rootCaseId(caseId), view: slug, details, workflow, choosing, setChoosing }} kind={kind} tab={tab} navigate={navigate} />
  </RecordShell>;
}

const useWorkflow = (
  caseId: string, details: CaseDetailsView,
  refresh: () => Promise<CaseDetailsView | null>,
): CaseWorkflow => {
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [providerDecision, setProviderDecision] = useState(() => initialProvider(details));
  const [outcome, setOutcome] = useState<ExecutionResultView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => reconcileWorkflow(details, setDiagnosis, setProviderDecision), [details]);
  const run = (): void => void runExecution(caseId, diagnosis, providerDecision, setOutcome, setError, refresh);
  return { diagnosis, providerDecision, outcome, error, setDiagnosis, setProviderDecision, run };
};

const reconcileWorkflow = (
  details: CaseDetailsView,
  setDiagnosis: (code: string | null) => void,
  setProvider: (decision: ProviderSelectionDecision) => void,
): void => {
  setDiagnosis(null);
  setProvider(initialProvider(details));
};

const initialProvider = (details: CaseDetailsView): ProviderSelectionDecision =>
  details.provider
    ? { kind: "attach", provider: { id: details.provider.id, name: details.provider.fullName } }
    : { kind: "skip" };

const runExecution = async (
  caseId: string,
  diagnosis: string | null,
  provider: ProviderSelectionDecision,
  set: (outcome: ExecutionResultView) => void,
  setError: (message: string | null) => void,
  refresh: () => Promise<CaseDetailsView | null>,
): Promise<void> => {
  const result = await executeCase(rootCaseId(caseId), decisionsFor(diagnosis, provider));
  if (!result.ok) return setError(result.message);
  completeRun(result.value, set, setError);
  await refresh();
};

const completeRun = (
  outcome: ExecutionResultView,
  set: (outcome: ExecutionResultView) => void,
  setError: (message: string | null) => void,
): void => {
  set(outcome);
  setError(null);
};

const decisionsFor = (diagnosis: string | null, provider: ProviderSelectionDecision) => ({
  ...(diagnosis ? { diagnosisCode: diagnosis } : {}),
  providerDecision: provider.kind === "attach"
    ? { kind: "attach" as const, providerPartyId: provider.provider.id }
    : { kind: "skip" as const },
});

const ROLE_LABEL: Record<CaseKind, string> = { notification: "Requester", absence: "Employee", gdc: "Claimant" };

const shellProps = (
  caseId: string, kind: CaseKind, details: CaseDetailsView,
  tab: string, navigate: NavigateFunction, workflow: CaseWorkflow,
) => ({
  title: `${casePresentation(kind).titlePrefix} ${caseId}`,
  processTitle: tab === "Medical" ? "Medical Details" : undefined,
  subtitleLabel: ROLE_LABEL[kind],
  subtitleValue: <SubtitleBand details={details} />,
  bandKind: kind,
  sidebar: <CaseSidebar caseId={caseId} kind={kind} details={details} navigate={navigate} />,
  actions: <ActionBar kind={kind} onRun={workflow.run} />,
  tabs: casePresentation(kind).tabs,
  activeTab: tab,
  onTab: (next: string) => navigate(`/cases/${caseId}/${tabSlug(next)}`),
});

const claimantName = (details: CaseDetailsView): string => details.claimant.fullName;

// Header bands are read straight from the persisted dossier; the role band
// (whose value is the claimant name) is dropped because the name already
// renders as the linked heading beside it.
const headerBands = (details: CaseDetailsView): readonly DossierBand[] =>
  details.dossier.summary.bands.filter((band) => band.value !== claimantName(details));

function SubtitleBand({ details }: { readonly details: CaseDetailsView }) {
  return <span className="fx-case-band">
    <Link className="fx-link" to={`/parties/${details.claimant.id}`}>{claimantName(details)}</Link>
    {headerBands(details).map((band) => (
      <span key={band.label}><strong>{band.label}</strong> {band.value}</span>
    ))}
  </span>;
}

const COMMON_ACTIONS = ["Add Sub Case", "Correspondence", "Add Activity", "Add eForm", "Add Participant"] as const;

const Caret = () => <span aria-hidden="true" className="fx-caret"> ▾</span>;

function MenuAction({ label, onNotice, message }: { readonly label: string; readonly onNotice: (message: string) => void; readonly message?: string }) {
  return <button type="button" className="fx-action fx-action--menu" onClick={() => onNotice(message ?? `${label} started.`)}>{label}<Caret /></button>;
}

function ActionBar({ kind, onRun }: { readonly kind: CaseKind; readonly onRun: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);
  return <>
    {kind === "absence" && <MenuAction label="Copy Case" onNotice={setNotice} />}
    {COMMON_ACTIONS.map((label) => <MenuAction key={label} label={label} onNotice={setNotice} />)}
    <MenuAction label="Surround UI" onNotice={setNotice} message="Surround UI opened." />
    {AUTOMATION_SHORTCUTS_ENABLED &&
      <button type="button" className="fx-action" onClick={onRun}>Run Case Execution</button>}
    {notice && <p role="status" className="fx-action-notice">{notice}</p>}
  </>;
}

interface SidebarProps {
  readonly caseId: string;
  readonly kind: CaseKind;
  readonly details: CaseDetailsView;
  readonly navigate: NavigateFunction;
}

function CaseSidebar({ caseId, kind, details, navigate }: SidebarProps) {
  const [notice, setNotice] = useState<string | null>(null);
  return <>
    <ComponentNav rootId={rootCaseId(caseId)} kind={kind} details={details} navigate={navigate} onNotice={setNotice} />
    <ParticipantsRail kind={kind} details={details} onNotice={setNotice} />
    <OwnershipRail details={details} onNotice={setNotice} />
    <SummaryRail details={details} />
    {notice && <p role="status" className="fx-visually-hidden">{notice}</p>}
  </>;
}

interface ComponentNavProps {
  readonly rootId: string;
  readonly kind: CaseKind;
  readonly details: CaseDetailsView;
  readonly navigate: NavigateFunction;
  readonly onNotice: (message: string) => void;
}

function ComponentNav({ rootId, kind, details, navigate, onNotice }: ComponentNavProps) {
  return <nav className="fx-comp-box" aria-label="Case components">
    <ComponentLink label="Notification" active={kind === "notification"} onSelect={() => navigate(`/cases/${rootId}/general`)} />
    {details.absence && <ComponentLink label="Absence Case" active={kind === "absence"} onSelect={() => navigate(`/cases/${absenceCaseId(rootId)}/absence-hub`)} />}
    {details.gdc && <ComponentLink label="Group Disability Claim" active={kind === "gdc"} onSelect={() => navigate(`/cases/${gdcCaseId(rootId)}/claim-hub`)} />}
    <ComponentLink label="STD Benefit" active={false} onSelect={() => onNotice("STD Benefit is not available in this mock.")} />
  </nav>;
}

function ComponentLink({ label, active, onSelect }: { readonly label: string; readonly active: boolean; readonly onSelect: () => void }) {
  return <button type="button" aria-current={active ? "true" : undefined}
    className={active ? "fx-comp fx-comp--on" : "fx-comp"} onClick={onSelect}>{label}</button>;
}

// The sidebar participant list is the case-map node for the active component
// (root notification, or its absence/GDC child) so provider rows come from the
// dossier instead of a per-case hardcoded map.
const nodeForKind = (details: CaseDetailsView, kind: CaseKind): CaseMapNode => {
  const root = details.dossier.caseMap;
  if (kind === "notification") return root;
  const type = kind === "absence" ? "absence_case" : "gdc_case";
  return (root.children ?? []).find((child) => child.type === type) ?? root;
};

function ParticipantsRail({ kind, details, onNotice }: { readonly kind: CaseKind; readonly details: CaseDetailsView; readonly onNotice: (message: string) => void }) {
  return <section className="fx-rail-group" aria-label="Participants">
    <h2 className="fx-rail-head">Participants</h2>
    {nodeForKind(details, kind).participants.map((participant) => (
      <ParticipantRow key={`${participant.role}-${participant.name}`} participant={participant} />
    ))}
    <button type="button" className="fx-rail-btn" onClick={() => onNotice("Add Participant started.")}>Add Participant<Caret /></button>
  </section>;
}

function ParticipantRow({ participant }: { readonly participant: CaseMapParticipant }) {
  return <>
    <p className="fx-rail-role">{participant.role}</p>
    {participant.partyId
      ? <Link className="fx-rail-person fx-link" to={`/parties/${participant.partyId}`}>{participant.name}</Link>
      : <p className="fx-rail-person">{participant.name}</p>}
  </>;
}

function OwnershipRail({ details, onNotice }: { readonly details: CaseDetailsView; readonly onNotice: (message: string) => void }) {
  return <div className="fx-rail-group">
    <h2 className="fx-rail-head fx-rail-head--plain">Ownership</h2>
    {details.dossier.ownership.sidebarFacts.map((fact) => <RailFact key={fact.key} field={fact} />)}
    <button type="button" className="fx-rail-btn" onClick={() => onNotice("Transfer Case started.")}>Transfer Case<Caret /></button>
  </div>;
}

function SummaryRail({ details }: { readonly details: CaseDetailsView }) {
  return <div className="fx-rail-group">
    <h2 className="fx-rail-head fx-rail-head--plain">Summary Information</h2>
    {details.dossier.summary.sidebarFacts.map((fact) => <RailFact key={fact.key} field={fact} />)}
  </div>;
}

function RailFact({ field }: { readonly field: DossierField }) {
  return <><p className="fx-rail-role">{field.label}</p><p className="fx-rail-person">{field.value}</p></>;
}

function CaseBody({ ctx, kind, tab, navigate }: { readonly ctx: PanelContext; readonly kind: CaseKind; readonly tab: string; readonly navigate: NavigateFunction }) {
  return <div className="fx-case-content">
    {AUTOMATION_SHORTCUTS_ENABLED && ctx.workflow.error &&
      <p role="alert" className="fx-exec-banner fx-exec-banner--escalated">{ctx.workflow.error}</p>}
    {AUTOMATION_SHORTCUTS_ENABLED && ctx.workflow.outcome && <ExecutionBanner outcome={ctx.workflow.outcome} />}
    <PanelSwitch ctx={ctx} kind={kind} tab={tab} navigate={navigate} />
  </div>;
}

const TRACK_LABEL: Record<string, string> = { absence: "Absence", gdc: "GDC" };

const STATUS_MESSAGE: Record<string, string> = {
  ESCALATED_CASE_NOT_FOUND: "Escalated: the case could not be found for execution.",
  ESCALATED_INELIGIBLE_INTAKE: "Escalated: the intake type is not eligible for automated processing.",
  ESCALATED_CONDITIONS_NOT_MET: "Escalated: required condition details are missing.",
};

function ExecutionBanner({ outcome }: { readonly outcome: ExecutionResultView }) {
  if (outcome.status === "COMPLETED") return <CompletedBanner outcome={outcome} />;
  return <p role="alert" className="fx-exec-banner fx-exec-banner--escalated" data-status={outcome.status}>
    {STATUS_MESSAGE[outcome.status] ?? outcome.status}
  </p>;
}

function CompletedBanner({ outcome }: { readonly outcome: ExecutionResultView }) {
  const tracks = outcome.activatedTracks.map((track) => TRACK_LABEL[track] ?? track).join(" and ");
  return <p role="status" className="fx-exec-banner fx-exec-banner--completed" data-status="COMPLETED">
    Case execution completed. {tracks} component{outcome.activatedTracks.length > 1 ? "s" : ""} activated.
  </p>;
}

function PanelSwitch({ ctx, kind, tab, navigate }: { readonly ctx: PanelContext; readonly kind: CaseKind; readonly tab: string; readonly navigate: NavigateFunction }) {
  const shared = sharedPanel(ctx, tab, navigate);
  if (shared) return shared;
  if (kind === "absence") return <AbsencePanel ctx={ctx} tab={tab} />;
  if (kind === "gdc") return <GdcPanel ctx={ctx} tab={tab} />;
  return <GenericTab title={tab} />;
}

const sharedPanel = (ctx: PanelContext, tab: string, navigate: NavigateFunction): ReactNode => {
  if (tab === "Documents") return <DocumentsTab ctx={ctx} navigate={navigate} />;
  if (tab === "Case Map") return <CaseMapTab ctx={ctx} navigate={navigate} />;
  if (tab === "Contacts") return <ContactsTab partyId={ctx.details.notification.partyId} />;
  return null;
};

function AbsencePanel({ ctx, tab }: { readonly ctx: PanelContext; readonly tab: string }) {
  if (ctx.view === "employment-details") return <EmploymentDetails ctx={ctx} />;
  if (tab === "Absence Hub") return <AbsenceHub ctx={ctx} />;
  if (tab === "Leave Details") return <LeaveDetails ctx={ctx} />;
  return <GenericTab title={tab} />;
}

function GdcPanel({ ctx, tab }: { readonly ctx: PanelContext; readonly tab: string }) {
  if (tab === "Claim Hub") return <ClaimHub ctx={ctx} />;
  if (tab === "Medical") return <MedicalTab ctx={ctx} />;
  return <GenericTab title={tab} />;
}

function GenericTab({ title }: { readonly title: string }) {
  return <section><h2 className="fx-section-title">{title}</h2><EmptyState label={`${title} — no data available`} /></section>;
}

export { defaultTab };
