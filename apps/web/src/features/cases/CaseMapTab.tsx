import type { NavigateFunction } from "react-router-dom";
import type { CaseMapNode, CaseMapParticipant, CaseNodeType } from "@fineos/contracts";
import type { PanelContext } from "./CasePage";

const SLOT_BY_TYPE: Record<CaseNodeType, string> = {
  notification: "root",
  absence_case: "absence",
  gdc_case: "gdc",
  benefit: "benefit",
};

export function CaseMapTab({ ctx, navigate }: { readonly ctx: PanelContext; readonly navigate: NavigateFunction }) {
  const root = ctx.details.dossier.caseMap;
  return <section><h2 className="fx-section-title">Case Map</h2>
    <div className="fx-casemap">{[root, ...(root.children ?? [])].map((node) => (
      <MapCard key={node.id} node={node} navigate={navigate} />
    ))}</div>
  </section>;
}

function MapCard({ node, navigate }: { readonly node: CaseMapNode; readonly navigate: NavigateFunction }) {
  return <div className={`fx-casemap-card fx-casemap-card--${SLOT_BY_TYPE[node.type]}`}>
    <MapCardHead node={node} navigate={navigate} />
    <ul className="fx-casemap-participants">{node.participants.map((participant) => (
      <li key={`${participant.role}-${participant.name}`}>{participantLabel(participant)}</li>
    ))}</ul>
  </div>;
}

const participantLabel = (participant: CaseMapParticipant): string =>
  `${participant.name} ( ${participant.role} )`;

function MapCardHead({ node, navigate }: { readonly node: CaseMapNode; readonly navigate: NavigateFunction }) {
  return <div className="fx-casemap-head">
    {node.route
      ? <button type="button" className="fx-result" onClick={() => navigate(node.route!)}>{node.id}</button>
      : <span className="fx-casemap-id">{node.id}</span>}
    <span className="fx-casemap-status">{node.label} — {node.status}</span>
  </div>;
}
