import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../application/session-service";
import { parse, send } from "./http";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const registerSessionRoutes = (app: FastifyInstance): void => {
  app.post("/api/session", (req, reply) => {
    const body = parse(credentialsSchema, req.body);
    if (!body.ok) return send(reply, body);
    return send(reply, authenticate(body.value));
  });
};
