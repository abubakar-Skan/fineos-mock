import type { FastifyReply } from "fastify";
import { z } from "zod";
import type { ApiErrorCode, ApiResult } from "@fineos/contracts";
import { apiErr } from "../application/api-result";

const STATUS_BY_ERROR: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  invalid_credentials: 401,
  party_not_found: 404,
  unknown_section: 404,
  case_not_found: 404,
  invalid_section: 422,
  invalid_date: 422,
  invalid_date_range: 422,
  provider_not_found: 422,
  invalid_provider_type: 422,
  component_scope_required: 422,
  missing_diagnosis_code: 422,
  invalid_decision_override: 422,
  already_submitted: 409,
  execution_in_progress: 409,
  case_already_terminal: 409,
};

export const send = <T>(
  reply: FastifyReply,
  result: ApiResult<T, ApiErrorCode>,
  okStatus = 200,
  soft = false,
): void => {
  void reply.status(statusFor(result, okStatus, soft)).send(result);
};

const statusFor = <T>(
  result: ApiResult<T, ApiErrorCode>,
  okStatus: number,
  soft: boolean,
): number =>
  result.ok ? okStatus : soft ? 200 : STATUS_BY_ERROR[result.error];

export const parse = <T>(
  schema: z.ZodType<T>,
  data: unknown,
): ApiResult<T, "invalid_request"> => {
  const parsed = schema.safeParse(data);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : apiErr("invalid_request", "The request payload was invalid.");
};
