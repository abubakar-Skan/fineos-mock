import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, type NavigateFunction } from "react-router-dom";
import { AppShell } from "../../components/fineos/AppShell";
import { RecordShell } from "../../components/fineos/RecordShell";
import { EmptyState } from "../../components/fineos/DataTable";
import { Dialog } from "../../components/fineos/Dialog";
import { createNotification, getParty, updateContact, type PartyView } from "../../app/api";

const PARTY_TABS = [
  "Profile", "Policies for Client", "Party History",
  "Leave Information", "Payment Preferences", "Payment History", "Cases", "Tasks",
] as const;

const OTHER_ACTIONS = ["Merge Party", "Add Activity", "Add Case", "Inquiry", "Surround UI"] as const;

export function PartyPage() {
  const { partyId, view } = useParams();
  const [party, setParty] = usePartyState(partyId);
  if (!party) return <AppShell><p className="fx-loading">Loading…</p></AppShell>;
  return <AppShell><PartyRecord party={party} view={view} onParty={setParty} /></AppShell>;
}

const usePartyState = (id?: string): [PartyView | null, (party: PartyView) => void] => {
  const [party, setParty] = useState<PartyView | null>(null);
  useEffect(() => { void loadParty(id, setParty); }, [id]);
  return [party, setParty];
};

const loadParty = async (id: string | undefined, set: (party: PartyView) => void): Promise<void> => {
  if (!id) return;
  const result = await getParty(id);
  if (result.ok) set(result.value);
};

interface RecordProps {
  readonly party: PartyView;
  readonly view?: string;
  readonly onParty: (party: PartyView) => void;
}

function PartyRecord({ party, view, onParty }: RecordProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>("Profile");
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const actions = <PartyActions onEdit={() => setEditing(true)} onNotice={setNotice} onCreate={() => void startNotification(party.id, navigate)} />;
  const overflow = { label: "More tabs", onSelect: () => setNotice("No additional tabs available.") };
  return <RecordShell title={party.fullName} subtitleLabel="Customer Number" subtitleValue={party.customerNumber ?? "—"}
    actions={actions} tabs={PARTY_TABS} activeTab={tab}
    onTab={(next) => selectPartyTab(next, party.id, setTab, navigate)} tabOverflow={overflow}>
    {notice && <p role="status" className="fx-notice">{notice}</p>}<PartyTabPanel tab={tab} view={view} party={party} />
    {editing && <EditPartyDialog party={party} onClose={() => setEditing(false)} onSave={(next) => finishEdit(next, onParty, setEditing)} />}
  </RecordShell>;
}

const selectPartyTab = (
  tab: string, partyId: string,
  setTab: (tab: string) => void, navigate: NavigateFunction,
): void => {
  setTab(tab);
  navigate(`/parties/${partyId}`);
};

interface PartyActionsProps {
  readonly onEdit: () => void;
  readonly onNotice: (message: string) => void;
  readonly onCreate: () => void;
}

const startNotification = async (partyId: string, navigate: NavigateFunction): Promise<void> => {
  const result = await createNotification(partyId, { source: "Phone", notificationDate: "2026-02-13" });
  if (result.ok) navigate(`/notifications/${result.value.draftId}/intake/notification-details`);
};

function PartyActions({ onEdit, onNotice, onCreate }: PartyActionsProps) {
  return (
    <>
      <button type="button" className="fx-action" onClick={onCreate}>Create Notification</button>
      <button type="button" className="fx-action" onClick={onEdit}>Edit Party</button>
      <button type="button" className="fx-action" disabled>Delete Party</button>
      {OTHER_ACTIONS.map((action) => (
        <button key={action} type="button" className="fx-action" onClick={() => onNotice(`${action} started.`)}>{action}</button>
      ))}
    </>
  );
}

interface PanelProps {
  readonly tab: string;
  readonly view?: string;
  readonly party: PartyView;
}

function PartyTabPanel({ tab, view, party }: PanelProps) {
  if (view === "contact-details") return <ContactDetails party={party} />;
  if (view === "communication-preferences") return <CommunicationPreferences party={party} />;
  if (tab === "Profile") return <ProfileTab party={party} />;
  return <EmptyState label={`${tab} — no data available`} />;
}

function ContactDetails({ party }: { readonly party: PartyView }) {
  return <section><h2 className="fx-section-title">Contact Details</h2>
    <div className="fx-detail-grid">
      <DetailField label="Mobile" value={party.phone ?? "—"} />
      <DetailField label="Email" value={party.email ?? "—"} />
      <DetailField label="Home Phone" value={party.homePhone ?? "—"} />
    </div>
    <Link className="fx-link" to={`/parties/${party.id}`}>Back to Profile</Link>
    <Link className="fx-link" to={`/parties/${party.id}/communication-preferences`}>
      Communication Preferences
    </Link>
  </section>;
}

function ProfileTab({ party }: { readonly party: PartyView }) {
  return (
    <section>
      <h2 className="fx-section-title">Personal Details</h2>
      <ProfilePanels party={party} />
      <Link className="fx-link" to={`/parties/${party.id}/contact-details`}>Contact Details</Link>
    </section>
  );
}

function CommunicationPreferences({ party }: { readonly party: PartyView }) {
  return <section><h2 className="fx-section-title">Communication Preferences</h2>
    <div className="fx-detail-grid">
      <WrittenCorrespondence email={party.email} />
      <NotificationUpdates email={party.email} />
      <DetailPanel title="Direct Communication">
        <DetailField label="Preferred contact method" value="Email" />
      </DetailPanel>
    </div>
    <Link className="fx-link" to={`/parties/${party.id}/contact-details`}>Back to Contact Details</Link>
  </section>;
}

function WrittenCorrespondence({ email }: { readonly email: string | null }) {
  return <DetailPanel title="Written Correspondence">
    <DetailField label="Go paperless" value="Yes" />
    <DetailField label="Send notification of correspondence via" value={email ?? "Email"} />
  </DetailPanel>;
}

function NotificationUpdates({ email }: { readonly email: string | null }) {
  return <DetailPanel title="Notification of Updates">
    <DetailField label="Notify on update via SMS" value="No" />
    <DetailField label="Notify on update via Email" value="Yes" />
    <DetailField label="Send email to" value={email ?? "—"} />
  </DetailPanel>;
}

function ProfilePanels({ party }: { readonly party: PartyView }) {
  return (
    <div className="fx-detail-grid">
      <NamePanel party={party} />
      <IdentificationPanel party={party} />
      <AdditionalPanel party={party} />
    </div>
  );
}

function NamePanel({ party }: { readonly party: PartyView }) {
  return (
    <DetailPanel title="Name">
      <DetailField label="Name" value={party.fullName} />
      <DetailField label="Verified" value="Yes" />
    </DetailPanel>
  );
}

function IdentificationPanel({ party }: { readonly party: PartyView }) {
  return (
    <DetailPanel title="Personal Identification">
      <DetailField label="Identification number type" value="Social Security Number" />
      <DetailField label="Date of birth" value={party.dateOfBirth ?? "—"} />
    </DetailPanel>
  );
}

function AdditionalPanel({ party }: { readonly party: PartyView }) {
  return (
    <DetailPanel title="Additional Information">
      <DetailField label="Party type" value={party.partyType} />
      <DetailField label="Employer" value={party.employer ?? "—"} />
    </DetailPanel>
  );
}

interface EditPartyProps {
  readonly party: PartyView;
  readonly onClose: () => void;
  readonly onSave: (party: PartyView) => void;
}

function EditPartyDialog({ party, onClose, onSave }: EditPartyProps) {
  return (
    <Dialog title="Edit Party" onClose={onClose}>
      <div className="fx-dialog-head"><h2>Edit Party</h2></div>
      <ContactForm party={party} onCancel={onClose} onDone={onSave} />
    </Dialog>
  );
}

interface ContactFormProps {
  readonly party: PartyView;
  readonly onCancel: () => void;
  readonly onDone: (party: PartyView) => void;
}

const finishEdit = (next: PartyView, onParty: (party: PartyView) => void, setEditing: (open: boolean) => void): void => {
  onParty(next);
  setEditing(false);
};

function ContactForm({ party, onCancel, onDone }: ContactFormProps) {
  const [error, setError] = useState<string | null>(null);
  return (
    <form className="fx-contact-form" aria-label="Edit contact details" onSubmit={(event) => saveContact(event, party.id, onDone, setError)}>
      <LabeledField label="Phone" name="phone" defaultValue={party.phone ?? ""} />
      <LabeledField label="Email" name="email" type="email" defaultValue={party.email ?? ""} />
      {error && <p role="alert" className="fx-error">{error}</p>}
      <div className="fx-form-actions"><button type="submit" className="fx-primary">Save</button><button type="button" className="fx-dark" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

const saveContact = async (
  event: FormEvent<HTMLFormElement>,
  id: string,
  onDone: (party: PartyView) => void,
  onError: (message: string) => void,
): Promise<void> => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const result = await updateContact(id, { phone: value(form, "phone"), email: value(form, "email") });
  if (result.ok) onDone(result.value);
  else onError(result.message);
};

const value = (form: FormData, key: string): string => String(form.get(key) ?? "");

function DetailPanel({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className="fx-detail-panel">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function DetailField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="fx-detail-field">
      <div className="fx-detail-label">{label}</div>
      <div className="fx-detail-value">{value}</div>
    </div>
  );
}

interface LabeledFieldProps {
  readonly label: string;
  readonly name: string;
  readonly type?: string;
  readonly defaultValue?: string;
}

function LabeledField({ label, name, type, defaultValue }: LabeledFieldProps) {
  return (
    <label className="fx-field">
      <span className="fx-field-label">{label}</span>
      <input className="fx-input" name={name} type={type ?? "text"} defaultValue={defaultValue} />
    </label>
  );
}
