import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { toPartyId } from "@fineos/contracts";
import type {
  ExecutionDecisions,
  ExecutionService,
  ProviderDecision,
} from "../application/execution-service";
import { parse, send } from "./http";

const searchSchema = z.object({ term: z.string().min(1) });
const providerDecisionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("attach"), providerPartyId: z.string().min(1) }),
  z.object({ kind: z.literal("skip") }),
]);
const executeSchema = z.object({
  conditionDescription: z.string().optional(),
  diagnosisCode: z.string().optional(),
  providerDecision: providerDecisionSchema.optional(),
  override: z.string().optional(),
});

export const registerCaseRoutes = (
  app: FastifyInstance,
  execution: ExecutionService,
  automationShortcutsEnabled: boolean,
): void => {
  app.get("/api/cases/search", (req, reply) => searchCases(req, reply, execution));
  app.get("/api/cases/recent", (_req, reply) => send(reply, execution.recentCases()));
  app.get("/api/cases/:caseId", (req, reply) => send(reply, execution.getCase(caseParam(req)), 200, isSoftRequest(req)));
  if (!automationShortcutsEnabled) return;
  app.post("/api/cases/:caseId/execute", (req, reply) => execute(req, reply, execution));
  app.get("/api/cases/:caseId/execution-runs/:runId", (req, reply) => getRun(req, reply, execution));
};

const searchCases = (req: FastifyRequest, reply: FastifyReply, execution: ExecutionService): void => {
  const query = parse(searchSchema, req.query);
  if (!query.ok) return send(reply, query);
  return send(reply, execution.searchCases(query.value.term));
};

const execute = (req: FastifyRequest, reply: FastifyReply, execution: ExecutionService): void => {
  const body = parse(executeSchema, req.body);
  if (!body.ok) return send(reply, body);
  return send(reply, execution.execute(caseParam(req), toDecisions(body.value)));
};

const toDecisions = (body: z.infer<typeof executeSchema>): ExecutionDecisions => ({
  ...body,
  providerDecision: toProviderDecision(body.providerDecision),
});

const toProviderDecision = (
  decision: z.infer<typeof providerDecisionSchema> | undefined,
): ProviderDecision | undefined =>
  decision?.kind === "attach"
    ? { kind: "attach", providerPartyId: toPartyId(decision.providerPartyId) }
    : decision;

const getRun = (req: FastifyRequest, reply: FastifyReply, execution: ExecutionService): void => {
  const { caseId, runId } = req.params as { caseId: string; runId: string };
  return send(reply, execution.getRun(caseId, runId));
};

const caseParam = (req: FastifyRequest): string =>
  (req.params as { caseId: string }).caseId;

// A missing case is a first-class UI state, so the browser data-fetch asks for a
// soft (HTTP 200) typed result to avoid a network-level console error; direct API
// and tooling calls omit the flag and still receive a strict 404.
const isSoftRequest = (req: FastifyRequest): boolean =>
  (req.query as { mode?: string }).mode === "soft";
