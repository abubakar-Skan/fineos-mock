import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, type NavigateFunction } from "react-router-dom";
import type { PartyAddress, Process2PartyProfile } from "@fineos/contracts";
import { AppShell } from "../../components/fineos/AppShell";
import { RecordShell } from "../../components/fineos/RecordShell";
import { EmptyState } from "../../components/fineos/DataTable";
import { Dialog } from "../../components/fineos/Dialog";
import { PanelList } from "../cases/dossier-ui";
import { createNotification, getParty, updateContact, type PartyView } from "../../app/api";

const PARTY_TABS = [
  "Profile", "Policies for Client", "Party History",
  "Leave Information", "Payment Preferences", "Payment History", "Cases", "Tasks",
] as const;

const OTHER_ACTIONS = ["Merge Party", "Add Activity", "Add Case", "Inquiry", "Surround UI"] as const;

// Only an insured Process 2 profile carries the panelised party details; other
// parties (Erica fixture, freshly created providers) have no typed profile and
// fall back to a minimal, generically derived view.
const profileOf = (party: PartyView): Process2PartyProfile | null => {
  const details = party.details;
  return details && "profilePanels" in details ? details : null;
};

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
  const isOverlay = view === "contact-details";
  const record = <RecordShell title={party.fullName} icon="person" subtitleLabel="Customer Number" subtitleValue={party.customerNumber ?? "—"}
    bandKind="party" actions={actions} tabs={PARTY_TABS} activeTab={tab}
    onTab={(next) => selectPartyTab(next, party.id, setTab, navigate)} tabOverflow={overflow}>
    {notice && <p role="status" className="fx-notice">{notice}</p>}<PartyTabPanel tab={tab} view={view} party={party} />
    {editing && <EditPartyDialog party={party} onClose={() => setEditing(false)} onSave={(next) => finishEdit(next, onParty, setEditing)} />}
  </RecordShell>;
  return isOverlay ? <div className="fx-party-execution-detail"><ExecutionCaseBackdrop party={party} />{record}</div> : record;
}

function ExecutionCaseBackdrop({ party }: { readonly party: PartyView }) {
  return <aside className="fx-party-case-backdrop" aria-hidden="true">
    <div className="fx-comp-box"><b>Notification</b><b>Absence Case</b><b>Group Disability Claim</b><b>STD Benefit</b></div>
    <h2>⊖ Participants</h2><strong>Requester</strong><span>♟ {party.fullName}</span><strong>Employer</strong><span>▰ {party.employer ?? "—"}</span>
    <button type="button" disabled>Add Participant⌄</button>
    <h2>Ownership</h2><strong>Assigned To</strong><span>Eligibility Specialist Team /<br />Eligibility Specialist</span>
    <strong>In Department</strong><span>Eligibility Specialist Team</span><button type="button" disabled>Transfer Case⌄</button>
    <h2>Summary Information</h2><strong>Admin Group</strong><span>Unknown</span>
  </aside>;
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

function ProfileTab({ party }: { readonly party: PartyView }) {
  const profile = profileOf(party);
  return (
    <section className="fx-party-profile">
      <h2 className="fx-section-title">Personal Details</h2>
      {profile ? <div className="fx-party-cols fx-party-cols--wide"><PanelList panels={profile.profilePanels} /></div> : <GenericProfile party={party} />}
      <AddressDetailsSection addresses={profile?.addresses ?? []} />
      <Link className="fx-link" to={`/parties/${party.id}/contact-details`}>Contact Details</Link>
    </section>
  );
}

function GenericProfile({ party }: { readonly party: PartyView }) {
  return (
    <div className="fx-party-cols fx-party-cols--wide"><div className="fx-party-col">
      <DetailPanel title="Name"><DetailField label="Name" value={party.fullName} /><DetailField label="Verified" value="Yes" /></DetailPanel>
      <DetailPanel title="Personal Identification"><DetailField label="Date of birth" value={usDate(party.dateOfBirth)} /></DetailPanel>
      <DetailPanel title="Additional Information"><DetailField label="Party type" value="Insured" /><DetailField label="Occupation" value="Unknown" /></DetailPanel>
    </div></div>
  );
}

function AddressDetailsSection({ addresses }: { readonly addresses: readonly PartyAddress[] }) {
  return (
    <>
      <h2 className="fx-section-title fx-address-heading">Address Details</h2>
      <div className="fx-address-block">
        {addresses.map((address) => <AddressPanel key={`${address.type}-${address.line1}`} address={address} />)}
        <NewAddressPanel />
      </div>
    </>
  );
}

const formatAddress = (address: PartyAddress): string =>
  [address.line1, address.line2, `${address.city} ${address.region} ${address.postalCode}`, address.country]
    .filter((line) => line && line.trim().length > 0)
    .join("\n");

function AddressPanel({ address }: { readonly address: PartyAddress }) {
  return (
    <div className="fx-detail-panel fx-address-home">
      <h3>{address.type.toUpperCase()}<span className="fx-address-icons" aria-hidden="true">✎ 🗑</span></h3>
      <DetailField label="Mailing address" value={formatAddress(address)} />
    </div>
  );
}

function NewAddressPanel() {
  return (
    <div className="fx-detail-panel fx-address-new">
      <div className="fx-faux-panel-title">NEW ADDRESS</div>
      <span className="fx-link">+ Add address</span>
    </div>
  );
}

const usDate = (iso: string | null): string =>
  iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}` : (iso ?? "—");

function ContactDetails({ party }: { readonly party: PartyView }) {
  const profile = profileOf(party);
  return <section className="fx-party-contact">
    <AddressSummary addresses={profile?.addresses ?? []} />
    <h2 className="fx-section-title">Contact Details</h2>
    {profile ? <div className="fx-contact-panels"><PanelList panels={profile.contactPanels} /><NewContactDetails /></div> : <GenericContact party={party} />}
    <div className="fx-party-route-links"><Link className="fx-link" to={`/parties/${party.id}`}>Back to Profile</Link>
      <Link className="fx-link" to={`/parties/${party.id}/communication-preferences`}>Communication Preferences</Link></div>
  </section>;
}

function AddressSummary({ addresses }: { readonly addresses: readonly PartyAddress[] }) {
  const address = addresses[0];
  return <div className="fx-address-summary">
    <DetailField label="Mailing address" value={address ? formatAddress(address) : "—"} />
    <DetailField label="Effective from" value={address?.effectiveFrom ?? "-"} />
    <DetailField label="Effective to" value={address?.effectiveTo ?? "-"} />
    <DetailField label="Status" value="Verified ⟳" />
    <span className="fx-link">+ Add address</span>
  </div>;
}

function GenericContact({ party }: { readonly party: PartyView }) {
  return <div className="fx-contact-panels">
    <DetailPanel title="Mobile"><DetailField label="Number" value={party.phone ?? "—"} /></DetailPanel>
    <DetailPanel title="Email"><DetailField label="Email" value={party.email ?? "—"} /></DetailPanel>
    <DetailPanel title="Home Phone"><DetailField label="Number" value={party.homePhone ?? "—"} /></DetailPanel>
    <NewContactDetails />
  </div>;
}

function NewContactDetails() {
  return <div className="fx-detail-panel"><div className="fx-faux-panel-title">New Contact Details</div>
    <span className="fx-link">+ Add phone number</span><span className="fx-link">+ Add email address</span><span className="fx-link">+ Add web address</span></div>;
}

function CommunicationPreferences({ party }: { readonly party: PartyView }) {
  const profile = profileOf(party);
  return <section className="fx-party-contact fx-party-communication">
    <div className="fx-party-status"><strong>Status</strong><span>Verified ⟳</span></div>
    <h2 className="fx-section-title">Contact Details</h2>
    {profile ? <div className="fx-contact-panels"><PanelList panels={profile.contactPanels} /><NewContactDetails /></div> : <GenericContact party={party} />}
    <h2 className="fx-section-title">Communication Preferences</h2>
    <div className="fx-communication-panels">
      {profile ? <PanelList panels={profile.communicationPreferences} /> : <DetailPanel title="Direct Communication"><DetailField label="Preferred contact method" value={party.email ?? "Email"} /></DetailPanel>}
    </div>
    <Link className="fx-link" to={`/parties/${party.id}/contact-details`}>Back to Contact Details</Link>
  </section>;
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
