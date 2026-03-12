import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppBindings } from "@/index";
import { authGuard } from "@/middlewares/authGuard.middleware";
import { injectConsultationService } from "@/middlewares/injectService.middleware";
import {
  listConsultationContentChecksQuerySchema,
  consultationIdParamSchema,
  decideConsultationContentCheckSchema,
} from "@/validators/content-check.validator";

const factory = createFactory<AppBindings>();

const listConsultationContentChecksHandlers = factory.createHandlers(
  zValidator("query", listConsultationContentChecksQuerySchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const query = c.req.valid("query");
    const service = c.get("consultationService");

    if (query.view === "summary") {
      const result = await service.listPendingConsultationContentChecks();
      return c.json(result, 200);
    }

    const result = await service.findPendingConsultationsByIds(query.ids ?? []);
    return c.json(result, 200);
  },
);

const decideConsultationContentCheckHandlers = factory.createHandlers(
  zValidator("param", consultationIdParamSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  zValidator("json", decideConsultationContentCheckSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const { consultationId } = c.req.valid("param");
    const body = c.req.valid("json");
    const service = c.get("consultationService");

    const result = await service.decideConsultationContentCheck(
      consultationId,
      body.decision,
      body.reason,
    );

    return c.json(result, 200);
  },
);

export const adminContentCheckRoute = new Hono<AppBindings>();

adminContentCheckRoute.use("/*", authGuard, injectConsultationService);
adminContentCheckRoute.get("/consultations", ...listConsultationContentChecksHandlers);
adminContentCheckRoute.post("/consultations/:consultationId/decision", ...decideConsultationContentCheckHandlers);
