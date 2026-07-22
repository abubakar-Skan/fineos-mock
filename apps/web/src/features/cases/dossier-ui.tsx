import { useState } from "react";
import { Link } from "react-router-dom";
import type { DossierField, DossierPanel } from "@fineos/contracts";

// Shared renderers so every case screen draws label/value pairs and panels
// straight from the dossier instead of bespoke per-screen markup.
export function FieldView({ field }: { readonly field: DossierField }) {
  return <div className="fx-detail-field">
    <div className="fx-detail-label">{field.label}</div>
    <div className="fx-detail-value">{fieldValue(field)}</div>
  </div>;
}

const fieldValue = (field: DossierField) =>
  field.route ? <Link className="fx-link" to={field.route}>{field.value}</Link> : field.value;

export function PanelView({ panel }: { readonly panel: DossierPanel }) {
  return <div className="fx-detail-panel"><h3>{panel.title}</h3>
    {panel.fields.map((field) => <FieldView key={field.key} field={field} />)}
  </div>;
}

export function PanelList({ panels }: { readonly panels: readonly DossierPanel[] }) {
  return <>{panels.map((panel) => <PanelView key={panel.id} panel={panel} />)}</>;
}

interface SaveResult {
  readonly ok: boolean;
  readonly message?: string;
}

// Shared save/refresh boilerplate for the ACT_11-14 target panels: each is a
// blank-until-saved form backed by one manual PATCH endpoint plus a reload.
export function useTargetSave<T>(
  save: (payload: T) => Promise<SaveResult>,
  refresh: () => Promise<unknown>,
) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (payload: T): Promise<void> => {
    setSaving(true);
    const result = await save(payload);
    setSaving(false);
    if (!result.ok) return setError(result.message ?? "Save failed.");
    setError(null);
    await refresh();
  };
  return { saving, error, run };
}

export function TargetSaveError({ message }: { readonly message: string | null }) {
  return message ? <p role="alert" className="fx-error">{message}</p> : null;
}
