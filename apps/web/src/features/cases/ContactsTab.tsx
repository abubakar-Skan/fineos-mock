import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getParty, updateContact, type PartyView } from "../../app/api";

export function ContactsTab({ partyId }: { readonly partyId: string }) {
  const [party, setParty] = useParty(partyId);
  if (!party) return <p className="fx-loading">Loading…</p>;
  return <section><h2 className="fx-section-title">Contact Details</h2>
    <ContactDetails party={party} />
    <ContactEntry party={party} onSaved={setParty} />
    <div className="fx-party-route-links">
      <Link className="fx-link" to={`/parties/${party.id}`}>Open claimant profile</Link>
      <Link className="fx-link" to={`/parties/${party.id}/communication-preferences`}>Communication Preferences</Link>
    </div>
  </section>;
}

const useParty = (id: string): [PartyView | null, (party: PartyView) => void] => {
  const [party, setParty] = useState<PartyView | null>(null);
  useEffect(() => { void loadParty(id, setParty); }, [id]);
  return [party, setParty];
};

const loadParty = async (id: string, set: (party: PartyView) => void): Promise<void> => {
  const result = await getParty(id);
  if (result.ok) set(result.value);
};

function ContactDetails({ party }: { readonly party: PartyView }) {
  return <div className="fx-detail-grid">
    <Field label="Mobile" value={party.phone ?? "—"} />
    <Field label="Email" value={party.email ?? "—"} />
    <Field label="Home Phone" value={party.homePhone ?? "—"} />
  </div>;
}

function Field({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="fx-detail-field"><div className="fx-detail-label">{label}</div><div className="fx-detail-value">{value}</div></div>;
}

function ContactEntry({ party, onSaved }: { readonly party: PartyView; readonly onSaved: (party: PartyView) => void }) {
  const [error, setError] = useState<string | null>(null);
  return <form className="fx-contact-form" aria-label="New contact details" onSubmit={(event) => void save(event, party, onSaved, setError)}>
    <h3 className="fx-section-title">New Contact Details</h3>
    <Input label="Add phone number" name="phone" defaultValue={party.phone ?? ""} />
    <Input label="Add email address" name="email" type="email" defaultValue={party.email ?? ""} />
    {error && <p role="alert" className="fx-error">{error}</p>}
    <div className="fx-form-actions"><button type="submit" className="fx-primary">Save</button></div>
  </form>;
}

const save = async (
  event: FormEvent<HTMLFormElement>,
  party: PartyView,
  onSaved: (party: PartyView) => void,
  onError: (message: string) => void,
): Promise<void> => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const result = await updateContact(party.id, { phone: read(form, "phone"), email: read(form, "email") });
  if (result.ok) onSaved(result.value);
  else onError(result.message);
};

const read = (form: FormData, key: string): string => String(form.get(key) ?? "");

function Input({ label, name, type, defaultValue }: { readonly label: string; readonly name: string; readonly type?: string; readonly defaultValue?: string }) {
  return <label className="fx-field"><span className="fx-field-label">{label}</span>
    <input className="fx-input" name={name} type={type ?? "text"} defaultValue={defaultValue} />
  </label>;
}
