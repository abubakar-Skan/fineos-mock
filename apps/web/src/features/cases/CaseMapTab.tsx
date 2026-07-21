import type { NavigateFunction } from "react-router-dom";
import type { CaseDetailsView } from "../../app/api";
import { absenceCaseId, gdcCaseId } from "./case-tabs";
import type { PanelContext } from "./CasePage";
import { isDavidReference } from "./case-sections";

interface MapNode {
  readonly id: string;
  readonly kind: string;
  readonly status: string;
  readonly participants: readonly string[];
  readonly slot: "root" | "absence" | "gdc" | "benefit";
  readonly to?: string;
}

export function CaseMapTab({ ctx, navigate }: { readonly ctx: PanelContext; readonly navigate: NavigateFunction }) {
  return <section><h2 className="fx-section-title">Case Map</h2>
    <div className="fx-casemap">{nodesFor(ctx.details, ctx.rootId).map((node) => (
      <MapCard key={node.id} node={node} navigate={navigate} />
    ))}</div>
  </section>;
}

const nodesFor = (details: CaseDetailsView, rootId: string): readonly MapNode[] => [
  {
    id: rootId, kind: "Notification", status: details.notification.status,
    participants: baseParticipants(details, "Requester"), slot: "root",
  },
  ...(details.absence ? [absenceNode(details, rootId)] : []),
  ...(details.gdc ? [gdcNode(details, rootId)] : []),
  ...(isDavidReference(details) ? [benefitNode(details, rootId)] : []),
];

const absenceNode = (details: CaseDetailsView, rootId: string): MapNode => ({
  id: absenceCaseId(rootId), kind: "Absence Case", status: details.absence!.status,
  participants: caseParticipants(details, "Employee"),
  slot: "absence",
  to: `/cases/${absenceCaseId(rootId)}/absence-hub`,
});

const gdcNode = (details: CaseDetailsView, rootId: string): MapNode => ({
  id: gdcCaseId(rootId), kind: "Group Disability Claim", status: details.gdc!.status,
  participants: referenceGdcParticipants(details),
  slot: "gdc",
  to: `/cases/${gdcCaseId(rootId)}/claim-hub`,
});

const benefitNode = (details: CaseDetailsView, rootId: string): MapNode => ({
  id: `${gdcCaseId(rootId)}-01`, kind: "STD Benefit", status: "Approved",
  participants: [`${details.claimant.fullName} ( Claimant )`, "FIT Amount Payee ( Tax Payee )", "SIT Payee ( Tax Payee )"],
  slot: "benefit",
});

const referenceGdcParticipants = (details: CaseDetailsView): readonly string[] =>
  isDavidReference(details)
    ? [...baseParticipants(details, "Claimant"), "Travis Larson ( Medical Provider )", "Travis Larson R Dr ( Medical Provider )", "Dhanraj Venkatesan ( Medical Provider )", "Dhanraj VI ( Medical Provider )"]
    : caseParticipants(details, "Claimant");

const baseParticipants = (details: CaseDetailsView, role: string): readonly string[] => [
  `${details.claimant.fullName} ( ${role} )`,
  `${details.claimant.employer ?? "Unknown"} ( Employer )`,
];

const caseParticipants = (details: CaseDetailsView, role: string): readonly string[] => [
  ...baseParticipants(details, role),
  ...(details.provider ? [`${details.provider.fullName} ( Medical Provider )`] : []),
];

function MapCard({ node, navigate }: { readonly node: MapNode; readonly navigate: NavigateFunction }) {
  return <div className={`fx-casemap-card fx-casemap-card--${node.slot}`}>
    <MapCardHead node={node} navigate={navigate} />
    <ul className="fx-casemap-participants">{node.participants.map((p) => <li key={p}>{p}</li>)}</ul>
  </div>;
}

function MapCardHead({ node, navigate }: { readonly node: MapNode; readonly navigate: NavigateFunction }) {
  return <div className="fx-casemap-head">
    {node.to
      ? <button type="button" className="fx-result" onClick={() => navigate(node.to!)}>{node.id}</button>
      : <span className="fx-casemap-id">{node.id}</span>}
    <span className="fx-casemap-status">{node.kind} — {node.status}</span>
  </div>;
}
