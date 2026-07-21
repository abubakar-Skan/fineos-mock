import { toPartyId, type ApiResult } from "@fineos/contracts";
import { apiErr, apiOk } from "./api-result";
import type { ContactInput, PartyRecord, PartyRepository, ProviderInput } from "./ports";

type PartyLookup = ApiResult<PartyRecord, "party_not_found">;

export interface PartyService {
  search(term: string): ApiResult<readonly PartyRecord[], never>;
  get(id: string): PartyLookup;
  updateContact(id: string, contact: ContactInput): PartyLookup;
  createProvider(input: ProviderInput): ApiResult<PartyRecord, never>;
}

export const createPartyService = (parties: PartyRepository): PartyService => ({
  search: (term) => apiOk(parties.search(term)),
  get: (id) => found(parties.findById(toPartyId(id))),
  updateContact: (id, contact) => found(parties.updateContact(toPartyId(id), contact)),
  createProvider: (input) => apiOk(parties.createProvider(input)),
});

const found = (party: PartyRecord | undefined): PartyLookup =>
  party ? apiOk(party) : apiErr("party_not_found", "The requested party does not exist.");
