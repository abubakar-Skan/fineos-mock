import {
  toPartyId,
  type ApiResult,
  type PartyId,
} from "@fineos/contracts";
import { apiErr, apiOk } from "./api-result";
import type { PartyRepository } from "./ports";

export type ProviderError = "provider_not_found" | "invalid_provider_type";

export const validateProvider = (
  parties: PartyRepository,
  id: string | undefined,
): ApiResult<PartyId | undefined, ProviderError> => {
  if (id === undefined) return apiOk(undefined);
  const party = parties.findById(toPartyId(id));
  if (!party) return apiErr("provider_not_found", `Provider ${id} was not found.`);
  if (party.partyType !== "medical_provider") {
    return apiErr("invalid_provider_type", `Party ${id} is not a medical provider.`);
  }
  return apiOk(party.id);
};
