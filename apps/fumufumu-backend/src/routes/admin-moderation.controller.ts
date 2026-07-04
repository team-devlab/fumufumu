import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import type { AppBindings } from "@/index";
import { authGuard } from "@/middlewares/authGuard.middleware";
import { adminGuard } from "@/middlewares/adminGuard.middleware";
import { injectModerationService } from "@/middlewares/injectService.middleware";
import {
  moderationTargetParamSchema,
  moderationTargetTypeParamSchema,
  hideReasonsQuerySchema,
  hideModerationSchema,
  unhideModerationSchema,
} from "@/validators/moderation.validator";

const factory = createFactory<AppBindings>();

const hideHandlers = factory.createHandlers(
  zValidator("param", moderationTargetParamSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  zValidator("json", hideModerationSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const { targetType, id } = c.req.valid("param");
    const body = c.req.valid("json");
    const adminUserId = c.get("appUserId");
    const service = c.get("moderationService");

    const result = await service.hide(targetType, id, adminUserId, body.reason, body.skipAuditLog);
    return c.json(result, 200);
  },
);

const unhideHandlers = factory.createHandlers(
  zValidator("param", moderationTargetParamSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  zValidator("json", unhideModerationSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const { targetType, id } = c.req.valid("param");
    const body = c.req.valid("json");
    const adminUserId = c.get("appUserId");
    const service = c.get("moderationService");

    const result = await service.unhide(targetType, id, adminUserId, body.skipAuditLog);
    return c.json(result, 200);
  },
);

const hideReasonsHandlers = factory.createHandlers(
  zValidator("param", moderationTargetTypeParamSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  zValidator("query", hideReasonsQuerySchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const { targetType } = c.req.valid("param");
    const { ids } = c.req.valid("query");
    const service = c.get("moderationService");

    const result = await service.getLatestHideReasons(targetType, ids);
    return c.json(result, 200);
  },
);

const historyHandlers = factory.createHandlers(
  zValidator("param", moderationTargetParamSchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const { targetType, id } = c.req.valid("param");
    const service = c.get("moderationService");

    const result = await service.getHistory(targetType, id);
    return c.json(result, 200);
  },
);

export const adminModerationRoute = new Hono<AppBindings>();

// ADR 010 §4: /api/admin/* 全体に authGuard → adminGuard を必須化する。
// adminGuard は authGuard が確定させた appUserId を前提とするため、必ずこの順序。
adminModerationRoute.use("/*", authGuard, adminGuard, injectModerationService);
adminModerationRoute.post("/:targetType/:id/hide", ...hideHandlers);
adminModerationRoute.post("/:targetType/:id/unhide", ...unhideHandlers);
// hide-reasons は :id を取らない2セグメントGETのため、3セグメントの :id/history とは衝突しない
adminModerationRoute.get("/:targetType/hide-reasons", ...hideReasonsHandlers);
adminModerationRoute.get("/:targetType/:id/history", ...historyHandlers);
