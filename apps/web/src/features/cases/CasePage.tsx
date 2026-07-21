import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams, type NavigateFunction } from "react-router-dom";
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
  return <RecordShell {...shellProps(caseId, kind, details, tab, navigate, workflow)}>
    <CaseBody ctx={{ caseId, rootId: rootCaseId(caseId), view: slug, details, workflow }} kind={kind} tab={tab} navigate={navigate} />
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

const shellProps = (
  caseId: string, kind: CaseKind, details: CaseDetailsView,
  tab: string, navigate: NavigateFunction, workflow: CaseWorkflow,
) => ({
  title: `${casePresentation(kind).titlePrefix} ${caseId}`,
  subtitleLabel: casePresentation(kind).subtitleLabel,
  subtitleValue: <SubtitleBand details={details} />,
  actions: <ActionBar caseId={caseId} kind={kind} details={details} navigate={navigate} onRun={workflow.run} />,
  tabs: casePresentation(kind).tabs,
  activeTab: tab,
  onTab: (next: string) => navigate(`/cases/${caseId}/${tabSlug(next)}`),
});

function SubtitleBand({ details }: { readonly details: CaseDetailsView }) {
  return <span className="fx-case-band">
    <span>{claimantName(details)}</span>
    <span><strong>Date</strong> {details.notification.notificationDate}</span>
    <span><strong>Status</strong> {details.notification.status}</span>
  </span>;
}

const claimantName = (details: CaseDetailsView): string =>
  details.claimant.fullName;

interface ActionBarProps {
  readonly caseId: string;
  readonly kind: CaseKind;
  readonly details: CaseDetailsView;
  readonly navigate: NavigateFunction;
  readonly onRun: () => void;
}

const COMMON_ACTIONS = ["Add Sub Case", "Correspondence", "Add Activity", "Add eForm"] as const;

function ActionBar({ caseId, kind, details, navigate, onRun }: ActionBarProps) {
  const [notice, setNotice] = useState<string | null>(null);
  return <>
    <ComponentNav rootId={rootCaseId(caseId)} kind={kind} details={details} navigate={navigate} onNotice={setNotice} />
    {COMMON_ACTIONS.map((label) => (
      <button key={label} type="button" className="fx-action" onClick={() => setNotice(`${label} started.`)}>{label}</button>
    ))}
    <button type="button" className="fx-action" onClick={onRun}>Run Case Execution</button>
    {notice && <p role="status" className="fx-action-notice">{notice}</p>}
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
  return <span className="fx-component-nav">
    <ComponentLink label="Notification" active={kind === "notification"} onSelect={() => navigate(`/cases/${rootId}/general`)} />
    {details.absence && <ComponentLink label="Absence Case" active={kind === "absence"} onSelect={() => navigate(`/cases/${absenceCaseId(rootId)}/absence-hub`)} />}
    {details.gdc && <ComponentLink label="Group Disability Claim" active={kind === "gdc"} onSelect={() => navigate(`/cases/${gdcCaseId(rootId)}/claim-hub`)} />}
    <ComponentLink label="STD Benefit" active={false} onSelect={() => onNotice("STD Benefit is not available in this mock.")} />
  </span>;
}

function ComponentLink({ label, active, onSelect }: { readonly label: string; readonly active: boolean; readonly onSelect: () => void }) {
  return <button type="button" aria-current={active ? "true" : undefined}
    className={active ? "fx-component fx-component--on" : "fx-component"} onClick={onSelect}>{label}</button>;
}

function CaseBody({ ctx, kind, tab, navigate }: { readonly ctx: PanelContext; readonly kind: CaseKind; readonly tab: string; readonly navigate: NavigateFunction }) {
  return <div className="fx-case-body">
    <ParticipantsRail details={ctx.details} />
    <div className="fx-case-content">
      {ctx.workflow.error && <p role="alert" className="fx-exec-banner fx-exec-banner--escalated">{ctx.workflow.error}</p>}
      {ctx.workflow.outcome && <ExecutionBanner outcome={ctx.workflow.outcome} />}
      <PanelSwitch ctx={ctx} kind={kind} tab={tab} navigate={navigate} />
    </div>
  </div>;
}

function ParticipantsRail({ details }: { readonly details: CaseDetailsView }) {
  return <aside className="fx-case-rail" aria-label="Participants">
    <h2 className="fx-rail-title">Participants</h2>
    <ParticipantDetails details={details} />
    <p className="fx-rail-role">Ownership</p>
    <p className="fx-rail-name">Eligibility Specialist Team</p>
  </aside>;
}

function ParticipantDetails({ details }: { readonly details: CaseDetailsView }) {
  return <>
    <p className="fx-rail-role">Claimant</p>
    <Link className="fx-rail-name fx-link" to={`/parties/${details.claimant.id}`}>
      {claimantName(details)}
    </Link>
    <p className="fx-rail-role">Employer</p>
    <p className="fx-rail-name">{details.claimant.employer ?? "—"}</p>
    {details.provider && <ProviderParticipant name={details.provider.fullName} />}
  </>;
}

function ProviderParticipant({ name }: { readonly name: string }) {
  return <><p className="fx-rail-role">Medical Provider</p><p className="fx-rail-name">{name}</p></>;
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
