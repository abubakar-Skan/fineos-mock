import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { PartyService } from "../application/party-service";
import type { ContactInput, ProviderInput } from "../application/ports";
import { parse, send } from "./http";

const searchSchema = z.object({ term: z.string().min(1) });
const contactSchema = z.object({
  phone: z.string().nullish(),
  email: z.string().nullish(),
});
const providerSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

export const registerPartyRoutes = (app: FastifyInstance, parties: PartyService): void => {
  app.get("/api/parties/search", (req, reply) => searchParties(req, reply, parties));
  app.get("/api/parties/:partyId", (req, reply) => send(reply, parties.get(idParam(req))));
  app.patch("/api/parties/:partyId/contact", (req, reply) => updateContact(req, reply, parties));
  app.post("/api/providers", (req, reply) => createProvider(req, reply, parties));
};

const searchParties = (req: FastifyRequest, reply: FastifyReply, parties: PartyService): void => {
  const query = parse(searchSchema, req.query);
  if (!query.ok) return send(reply, query);
  return send(reply, parties.search(query.value.term));
};

const updateContact = (req: FastifyRequest, reply: FastifyReply, parties: PartyService): void => {
  const body = parse(contactSchema, req.body);
  if (!body.ok) return send(reply, body);
  return send(reply, parties.updateContact(idParam(req), toContact(body.value)));
};

const createProvider = (req: FastifyRequest, reply: FastifyReply, parties: PartyService): void => {
  const body = parse(providerSchema, req.body);
  if (!body.ok) return send(reply, body);
  return send(reply, parties.createProvider(toProvider(body.value)), 201);
};

const toContact = (input: { phone?: string | null; email?: string | null }): ContactInput => ({
  phone: input.phone ?? null,
  email: input.email ?? null,
});

const toProvider = (input: ProviderInput): ProviderInput => input;

const idParam = (req: FastifyRequest): string =>
  (req.params as { partyId: string }).partyId;
