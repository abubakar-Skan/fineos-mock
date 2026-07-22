import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { ApiErrorCode, ApiResult, Process2TargetState } from "@fineos/contracts";
import type { TargetStateService } from "../application/target-state-service";
import { parse, send } from "./http";

const absenceHubSchema = z.object({
  expectedReturnToWorkDate: z.string(),
  actualReturnToWorkDate: z.string(),
  intentionToReturn: z.string(),
});
const absenceConditionSchema = z.object({
  leaveReason: z.string(),
  workState: z.string(),
  conditionDescription: z.string(),
});
const gdcClaimSchema = z.object({ lastDayWorked: z.string() });
const gdcMedicalSchema = z.object({ conditionCategory: z.string(), pregnant: z.boolean() });
const diagnosisSchema = z.object({ code: z.string().min(1) });
const providerSchema = z.object({ providerPartyId: z.string().min(1) });

// Granular, always-available manual endpoints for ACT_11-16: never gated by
// AUTOMATION_SHORTCUTS_ENABLED, since manual UI/API persistence is the
// default (agent-first) path, not the orchestration shortcut.
export const registerTargetStateRoutes = (app: FastifyInstance, service: TargetStateService): void => {
  patch(app, "/absence-hub", absenceHubSchema, (id, body) => service.updateAbsenceHub(id, body));
  patch(app, "/absence-condition", absenceConditionSchema, (id, body) => service.updateAbsenceCondition(id, body));
  patch(app, "/gdc-claim", gdcClaimSchema, (id, body) => service.updateGdcClaim(id, body));
  patch(app, "/gdc-medical", gdcMedicalSchema, (id, body) => service.updateGdcMedical(id, body));
  patch(app, "/diagnosis", diagnosisSchema, (id, body) => service.updateDiagnosis(id, body.code));
  patch(app, "/provider", providerSchema, (id, body) => service.updateProvider(id, body.providerPartyId));
};

type Handler<T> = (caseId: string, body: T) => ApiResult<Process2TargetState, ApiErrorCode>;

const patch = <T>(app: FastifyInstance, suffix: string, schema: z.ZodType<T>, run: Handler<T>): void => {
  app.patch(`/api/cases/:caseId${suffix}`, (req, reply) => handle(req, reply, schema, run));
};

const handle = <T>(
  req: FastifyRequest, reply: FastifyReply, schema: z.ZodType<T>, run: Handler<T>,
): void => {
  const body = parse(schema, req.body);
  if (!body.ok) return send(reply, body);
  return send(reply, run(caseParam(req), body.value));
};

const caseParam = (req: FastifyRequest): string => (req.params as { caseId: string }).caseId;
