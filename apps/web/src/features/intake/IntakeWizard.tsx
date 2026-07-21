import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useNavigate, useParams, type NavigateFunction } from "react-router-dom";
import { serializeIntakeSection } from "@fineos/contracts";
import { AppShell } from "../../components/fineos/AppShell";
import { saveSection } from "../../app/api";
import {
  FIRST_STEP, findStep, visibleSteps,
  type ComponentFlags, type IntakeStep,
} from "./intake-steps";
import { StepForm, type DraftActions, type DraftState } from "./fields/StepForms";
import {
  fieldKey, loadDraft, markSaved, readField, resetDraftStep, storeDraft,
  type DraftModel,
} from "./intake-state";

const CLAIMANT = "Erica Alexander";
const CUSTOMER_NUMBER = "80937";
const NO_COMPONENT_MESSAGE = "At least one Leave or GDC component must be selected.";
const REASON_MESSAGE = "Select an absence reason to continue.";
export function IntakeWizard() {
  const { draftId, step } = useParams();
  const [model, setModel] = useState<DraftModel>(() => loadDraft(draftId ?? ""));
  useEffect(() => setModel(() => loadDraft(draftId ?? "")), [draftId]);
  const current = findStep(step ?? "");
  if (!draftId) return <Navigate to="/dashboard" replace />;
  if (!current) return <Navigate to={`/notifications/${draftId}/intake/${FIRST_STEP}`} replace />;
  return <AppShell><Wizard draftId={draftId} current={current} model={model} setModel={setModel} /></AppShell>;
}

interface WizardProps {
  readonly draftId: string;
  readonly current: IntakeStep;
  readonly model: DraftModel;
  readonly setModel: (update: (model: DraftModel) => DraftModel) => void;
}

function Wizard({ draftId, current, model, setModel }: WizardProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const steps = visibleSteps(model.flags);
  const get = (name: string): string => readField(model, current.slug, name);
  const ctx: NavCtx = { draftId, current, steps, model, get, setError, navigate, setModel };
  const content = <StepForm slug={current.slug} state={toState(model)} actions={buildActions(setModel, current.slug)} get={get} />;
  return <><ProcessRecordHeader /><WizardBody current={current} steps={steps} saved={model.saved}
    error={error} content={content} onSelect={(slug) => void goToStep(ctx, slug)} ctx={ctx}
    onReset={() => void resetCurrent(ctx)} onClose={() => navigate(-1)} /></>;
}

const toState = (model: DraftModel): DraftState => ({
  flags: model.flags,
  fields: model.fields,
  periods: model.periods,
  provider: model.provider,
});

const buildActions = (setModel: WizardProps["setModel"], slug: IntakeStep["slug"]): DraftActions => ({
  setField: (name, value) => setModel((m) => ({ ...m, fields: { ...m.fields, [fieldKey(slug, name)]: value } })),
  setFlag: (flag, value) => setModel((m) => ({ ...m, flags: { ...m.flags, [flag]: value } })),
  addPeriod: (period) => setModel((m) => ({ ...m, periods: [...m.periods, period] })),
  setProvider: (choice) => setModel((m) => ({ ...m, provider: choice })),
});

interface NavCtx {
  readonly draftId: string;
  readonly current: IntakeStep;
  readonly steps: readonly IntakeStep[];
  readonly model: DraftModel;
  readonly get: (name: string) => string;
  readonly setError: (message: string | null) => void;
  readonly navigate: NavigateFunction;
  readonly setModel: WizardProps["setModel"];
}

const stepPath = (draftId: string, slug: string): string => `/notifications/${draftId}/intake/${slug}`;

const currentIndex = (ctx: NavCtx): number => ctx.steps.findIndex((step) => step.slug === ctx.current.slug);

const isLastStep = (ctx: NavCtx): boolean => currentIndex(ctx) === ctx.steps.length - 1;

const goNext = async (ctx: NavCtx): Promise<void> => {
  const error = validateStep(ctx);
  if (error) return ctx.setError(error);
  ctx.setError(null);
  if (await persist(ctx)) advance(ctx);
};

const persist = async (ctx: NavCtx): Promise<boolean> => {
  if (!ctx.current.sectionKey) return true;
  const result = await saveSection(ctx.draftId, ctx.current.sectionKey, serializeIntakeSection(ctx.model, ctx.current.slug));
  if (!result.ok) { ctx.setError(result.message); return false; }
  syncSavedDraft(ctx);
  return true;
};

const syncSavedDraft = (ctx: NavCtx): void => {
  const saved = markSaved(ctx.model, ctx.current.slug);
  ctx.setModel(() => saved);
  storeDraft(ctx.draftId, saved);
};

const goToStep = async (ctx: NavCtx, slug: string): Promise<void> => {
  ctx.setError(null);
  if (await persist(ctx)) ctx.navigate(stepPath(ctx.draftId, slug));
};

const resetCurrent = async (ctx: NavCtx): Promise<void> => {
  const reset = resetDraftStep(ctx.model, ctx.current.slug);
  ctx.setModel(() => reset);
  if (await persistModel(ctx, reset)) return storeDraft(ctx.draftId, reset);
  ctx.setModel(() => ctx.model);
};

const persistModel = async (ctx: NavCtx, model: DraftModel): Promise<boolean> => {
  if (!ctx.current.sectionKey) return true;
  const result = await saveSection(ctx.draftId, ctx.current.sectionKey, serializeIntakeSection(model, ctx.current.slug));
  if (result.ok) return true;
  ctx.setError(result.message);
  return false;
};

const advance = (ctx: NavCtx): void => {
  const next = ctx.steps[currentIndex(ctx) + 1];
  if (next) ctx.navigate(stepPath(ctx.draftId, next.slug));
  else ctx.navigate(`/notifications/${ctx.draftId}/confirmation`);
};

const goPrev = async (ctx: NavCtx): Promise<void> => {
  const prev = ctx.steps[currentIndex(ctx) - 1];
  if (prev) await goToStep(ctx, prev.slug);
};

const validateStep = (ctx: NavCtx): string | null => {
  if (ctx.current.slug === "notification-options") return anyComponent(ctx.model.flags) ? null : NO_COMPONENT_MESSAGE;
  if (ctx.current.slug === "reason-for-absence") return hasReason(ctx.get("absenceReason")) ? null : REASON_MESSAGE;
  return null;
};

const anyComponent = (flags: ComponentFlags): boolean =>
  flags.requestLeave || flags.requestAccommodation || flags.requestGdc;

const hasReason = (reason: string): boolean => reason !== "" && reason !== "Please Select";

function ProcessRecordHeader() {
  return <><div className="fx-record-head fx-process-record">
    <span className="fx-record-avatar" aria-hidden="true">◱</span>
    <h1>{CLAIMANT}</h1>
    <span className="fx-process-status">Process Status</span>
  </div><div className="fx-record-sub"><strong>Customer Number</strong>{CUSTOMER_NUMBER}</div></>;
}

interface WizardBodyProps {
  readonly current: IntakeStep;
  readonly steps: readonly IntakeStep[];
  readonly saved: readonly string[];
  readonly error: string | null;
  readonly content: ReactNode;
  readonly ctx: NavCtx;
  readonly onSelect: (slug: string) => void;
  readonly onReset: () => void;
  readonly onClose: () => void;
}

function WizardBody(props: WizardBodyProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="fx-wizard">
      <NavBar ctx={props.ctx} onClose={props.onClose} onReset={props.onReset} />
      <WizardMain props={props} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
    </div>
  );
}

function WizardMain({ props, collapsed, onToggle }: { readonly props: WizardBodyProps; readonly collapsed: boolean; readonly onToggle: () => void }) {
  return <div className="fx-wizard-main">
    <ProcessSteps steps={props.steps} activeSlug={props.current.slug} saved={props.saved}
      collapsed={collapsed} onToggle={onToggle} onSelect={props.onSelect} />
    <WizardForm current={props.current} error={props.error} content={props.content}
      ctx={props.ctx} onClose={props.onClose} onReset={props.onReset} />
    <NotesPanel />
  </div>;
}

function WizardForm(props: Pick<WizardBodyProps, "current" | "error" | "content" | "ctx" | "onClose" | "onReset">) {
  return (
    <div className="fx-wizard-form">
      <h2 className="fx-wizard-title">{props.current.title}</h2>
      {props.error && <p role="alert" className="fx-error">{props.error}</p>}
      {props.content}
      <BottomBar ctx={props.ctx} onClose={props.onClose} onReset={props.onReset} />
    </div>
  );
}

function NavBar({ ctx, onClose, onReset }: { readonly ctx: NavCtx; readonly onClose: () => void; readonly onReset: () => void }) {
  return (
    <div className="fx-wizard-topbar">
      <div className="fx-wizard-topbar-left"><button type="button" className="fx-ghost" onClick={onClose}>Close</button><button type="button" className="fx-ghost" onClick={onReset}>Reset</button></div>
      <StepButtons ctx={ctx} />
    </div>
  );
}

function BottomBar({ ctx, onClose, onReset }: { readonly ctx: NavCtx; readonly onClose: () => void; readonly onReset: () => void }) {
  return (
    <div className="fx-wizard-bottombar">
      <button type="button" className="fx-ghost" onClick={onClose}>Close</button>
      <button type="button" className="fx-ghost" onClick={onReset}>Reset</button>
      <StepButtons ctx={ctx} />
    </div>
  );
}

function StepButtons({ ctx }: { readonly ctx: NavCtx }) {
  const first = currentIndex(ctx) <= 0;
  return (
    <div className="fx-wizard-steps-nav">
      <button type="button" className="fx-ghost" disabled={first} onClick={() => void goPrev(ctx)}>Previous</button>
      <button type="button" className="fx-primary" onClick={() => void goNext(ctx)}>{isLastStep(ctx) ? "Finish" : "Next"}</button>
    </div>
  );
}

interface ProcessStepsProps {
  readonly steps: readonly IntakeStep[];
  readonly activeSlug: string;
  readonly saved: readonly string[];
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly onSelect: (slug: string) => void;
}

function ProcessSteps({ steps, activeSlug, saved, collapsed, onToggle, onSelect }: ProcessStepsProps) {
  return (
    <nav className="fx-process-steps" aria-label="Process Steps">
      <ProcessHead collapsed={collapsed} onToggle={onToggle} />
      {!collapsed && steps.map((step) => (
        <ProcessStepItem key={step.slug} step={step} active={step.slug === activeSlug} done={saved.includes(step.slug)} onSelect={() => onSelect(step.slug)} />
      ))}
    </nav>
  );
}

function ProcessHead({ collapsed, onToggle }: Pick<ProcessStepsProps, "collapsed" | "onToggle">) {
  return <div className="fx-process-head"><span>Process Steps</span>
    <button type="button" className="fx-process-toggle" aria-label="Toggle process steps"
      aria-expanded={!collapsed} onClick={onToggle}>{collapsed ? "›" : "‹"}</button>
  </div>;
}

interface ProcessStepItemProps {
  readonly step: IntakeStep;
  readonly active: boolean;
  readonly done: boolean;
  readonly onSelect: () => void;
}

function ProcessStepItem({ step, active, done, onSelect }: ProcessStepItemProps) {
  return (
    <button type="button" className={active ? "fx-process-step fx-process-step--on" : "fx-process-step"}
      aria-current={active ? "step" : undefined} onClick={onSelect}>
      <span className="fx-process-mark" aria-hidden="true">{done ? "◉" : "○"}</span>{step.title}
    </button>
  );
}

function NotesPanel() {
  const [notes, setNotes] = useState("");
  return (
    <aside className="fx-notes" aria-label="Notes">
      <h3 className="fx-notes-title">Notes</h3>
      <textarea className="fx-notes-area" aria-label="Notes" placeholder="You can store your notes here…" value={notes} onChange={(event) => setNotes(event.target.value)} />
    </aside>
  );
}
