import { useEffect, useState, type ReactNode } from "react";
import type { CaseNextAction, GdcComponent } from "@fineos/contracts";
import {
  updateGdcClaim, updateGdcMedical, updateProvider,
  type GdcClaimTargetState, type GdcMedicalTargetState,
} from "../../app/api";
import { TextField } from "../intake/fields/controls";
import type { PanelContext } from "./CasePage";
import { DiagnosisPanel } from "./DiagnosisPanel";
import { ChooseProviderPage, ProviderFlow, type ProviderChoice } from "./ProviderFlow";
import { PanelList, PanelView, TargetSaveError, useTargetSave } from "./dossier-ui";

const CONDITION_CATEGORIES = [
  "Unknown", "Appendectomy", "Hysterectomy", "Gallbladder surgery", "Bunionectomy",
  "Hernia", "Pregnancy", "Broken Bone", "Other Surgery", "Other Condition", "Cancer",
];

export function ClaimHub({ ctx }: { readonly ctx: PanelContext }) {
  const gdc = ctx.details.dossier.gdc;
  if (!gdc) return <GdcMissing title="Claim Summary" />;
  return <section className="fx-claim-hub"><h2 className="fx-section-title">Claim Summary</h2>
    <div className="fx-claim-columns">
      <div><PanelList panels={gdc.claimPanels} /></div>
      <div><PanelView panel={gdc.incident} /><PanelView panel={gdc.surgery} /></div>
      <div><PanelView panel={gdc.returnToWork} /><PanelView panel={gdc.medicalSummary} /><GdcClaimTargetForm ctx={ctx} /></div>
      <ClaimWidgets nextActions={gdc.nextActions} />
    </div>
  </section>;
}

const BLANK_GDC_CLAIM: GdcClaimTargetState = { lastDayWorked: "" };

// ACT_13 target: a blank editable form saved through the manual gdc-claim
// endpoint; the Incident/Surgery/Medical panels above stay read-only evidence.
function GdcClaimTargetForm({ ctx }: { readonly ctx: PanelContext }) {
  const saved = ctx.details.targetState.gdcClaim?.value;
  const [form, setForm] = useState(saved ?? BLANK_GDC_CLAIM);
  useEffect(() => setForm(saved ?? BLANK_GDC_CLAIM), [ctx.rootId, saved]);
  const { saving, error, run } = useTargetSave(
    (payload: GdcClaimTargetState) => updateGdcClaim(ctx.rootId, payload), ctx.refresh,
  );
  return <div className="fx-detail-panel"><h3>Claim Hub — Target (ACT_13)</h3>
    <TextField label="Last Day Worked" value={form.lastDayWorked} onChange={(value) => setForm({ lastDayWorked: value })} />
    <div className="fx-form-actions">
      <button type="button" className="fx-primary" disabled={saving} onClick={() => void run(form)}>Save</button>
    </div>
    <TargetSaveError message={error} />
  </div>;
}

function GdcMissing({ title }: { readonly title: string }) {
  return <section><h2 className="fx-section-title">{title}</h2>
    <p className="fx-empty-inline">No claim details available.</p></section>;
}

function ClaimWidgets({ nextActions }: { readonly nextActions: readonly CaseNextAction[] }) {
  if (nextActions.length === 0) return <p className="fx-empty-inline">No next actions.</p>;
  return <aside className="fx-claim-widgets">
    <Widget title="Key Documents (0)">There are no documents marked across this case or its sub-cases.</Widget>
    <Widget title="Shared Notes">-</Widget>
    <Widget title={`Next Actions (${nextActions.length})`}>
      {nextActions.map((action) => <NextActionRow key={action.id} action={action} />)}
    </Widget>
  </aside>;
}

function NextActionRow({ action }: { readonly action: CaseNextAction }) {
  return <>
    <p className="fx-link">{action.title}</p><b>{action.description}</b>
    <p>Target date {action.targetDate} {action.status === "OVERDUE" && <span className="fx-overdue">OVERDUE</span>}</p>
  </>;
}

function Widget({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <section className="fx-claim-widget"><h3>{title}</h3><div>{children}</div></section>;
}

export function MedicalTab({ ctx }: { readonly ctx: PanelContext }) {
  const gdc = ctx.details.dossier.gdc;
  const attach = (choice: ProviderChoice): void => void attachProvider(ctx, choice);
  if (ctx.choosing) return <ChooseProviderPage providerSearch={gdc?.providerSearch} onAttach={attach} onClose={() => ctx.setChoosing(false)} />;
  return <section className="fx-medical-page"><h2 className="fx-section-title">Medical Details</h2>
    {gdc && <MedicalFields ctx={ctx} gdc={gdc} />}
    <DiagnosisPanel ctx={ctx} />
    <div className="fx-medical-accordions"><h3>⊕ Restrictions And Limitations</h3><h3>⊖ Hospitalization Dates</h3>
      <div className="fx-hospital-head"><span>Start Date</span><span>End Date</span><span>End Date Confirmed</span><span>Facility</span><span>Hospitalization Type</span><span>Description</span></div>
      <p>No Records To Display</p></div>
    <ProviderFlow decision={ctx.workflow.providerDecision}
      onAdd={() => ctx.setChoosing(true)}
      onSkip={() => ctx.workflow.setProviderDecision({ kind: "skip" })} />
  </section>;
}

// ACT_16: attach persists through the manual provider endpoint (validated
// against the dossier's provider directory) before refreshing; the execution
// workflow decision still updates immediately so the Run flow (if enabled)
// keeps working even for a provider outside the directory (e.g. Add Person).
const attachProvider = async (ctx: PanelContext, choice: ProviderChoice): Promise<void> => {
  ctx.workflow.setProviderDecision({ kind: "attach", provider: choice });
  ctx.setChoosing(false);
  const result = await updateProvider(ctx.rootId, choice.id);
  if (result.ok) await ctx.refresh();
};

function MedicalFields({ ctx, gdc }: { readonly ctx: PanelContext; readonly gdc: GdcComponent }) {
  return <div className="fx-medical-form">
    <div><PanelList panels={gdc.medicalPanels} /></div>
    <div><MedicalControls ctx={ctx} /></div>
  </div>;
}

const BLANK_GDC_MEDICAL: GdcMedicalTargetState = { conditionCategory: "Unknown", pregnant: false };

// ACT_14 target: Condition Category and Pregnant are the only live controls in
// the mock; Save now persists them through the manual gdc-medical endpoint
// instead of leaving them non-persisting local state.
function MedicalControls({ ctx }: { readonly ctx: PanelContext }) {
  const saved = ctx.details.targetState.gdcMedical?.value;
  const [category, setCategory] = useState(saved?.conditionCategory ?? BLANK_GDC_MEDICAL.conditionCategory);
  const [pregnant, setPregnant] = useState(saved?.pregnant ?? BLANK_GDC_MEDICAL.pregnant);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setCategory(saved?.conditionCategory ?? BLANK_GDC_MEDICAL.conditionCategory);
    setPregnant(saved?.pregnant ?? BLANK_GDC_MEDICAL.pregnant);
  }, [ctx.rootId, saved]);
  const { saving, error, run } = useTargetSave(
    (payload: GdcMedicalTargetState) => updateGdcMedical(ctx.rootId, payload), ctx.refresh,
  );
  return <>
    <ConditionCategory value={category} open={open} onOpen={setOpen} onChange={setCategory} />
    <label className="fx-medical-check"><strong>Pregnant</strong>
      <input type="checkbox" checked={pregnant} onChange={(event) => setPregnant(event.target.checked)} /></label>
    <div className="fx-form-actions">
      <button type="button" className="fx-primary" disabled={saving}
        onClick={() => void run({ conditionCategory: category, pregnant })}>Save</button>
    </div>
    <TargetSaveError message={error} />
  </>;
}

function ConditionCategory({ value, open, onOpen, onChange }: { readonly value: string; readonly open: boolean; readonly onOpen: (open: boolean) => void; readonly onChange: (value: string) => void }) {
  return <label className="fx-medical-control fx-condition-category"><strong>Condition Category</strong><span>
    <select aria-label="Condition Category" value={value} onFocus={() => onOpen(true)}
      onChange={(event) => { onChange(event.target.value); onOpen(false); }}>
      {CONDITION_CATEGORIES.map((option) => <option key={option}>{option}</option>)}
    </select>{open && <ul aria-hidden="true">{CONDITION_CATEGORIES.map((option) => <li key={option}>{option}</li>)}</ul>}
  </span></label>;
}
