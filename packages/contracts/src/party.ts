export type PartyId = string & { readonly __brand: "PartyId" };

export const toPartyId = (value: string): PartyId => value as PartyId;
