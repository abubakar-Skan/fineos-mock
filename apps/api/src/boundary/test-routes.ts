import type { FastifyInstance } from "fastify";
import { apiOk } from "../application/api-result";

export const registerTestRoutes = (
  app: FastifyInstance,
  resetTestData?: () => void,
): void => {
  if (!resetTestData) return;
  app.post("/api/test/reset", (_request, reply) => {
    resetTestData();
    return reply.send(apiOk({ reset: true as const }));
  });
};
