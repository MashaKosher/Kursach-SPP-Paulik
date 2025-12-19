import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { ListQuerySchema, toSkipTake } from "../utils/pagination.js";

export const tagsRouter = Router();

tagsRouter.get("/", async (req, res, next) => {
  try {
    const query = ListQuerySchema.parse(req.query);
    const orderBy =
      query.sort === "name"
        ? { name: query.order ?? "asc" }
        : { createdAt: query.order ?? "desc" };

    const where = query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" as const } },
            { slug: { contains: query.q, mode: "insensitive" as const } }
          ]
        }
      : {};

    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      prisma.tag.findMany({ where, orderBy, skip, take }),
      prisma.tag.count({ where })
    ]);

    return res.json({ items, total, page: query.page, pageSize: query.pageSize });
  } catch (e) {
    return next(e);
  }
});

const TagCreateSchema = z.object({
  name: z.string().trim().min(1).max(50),
  slug: z.string().trim().min(1).max(80)
});

tagsRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const body = TagCreateSchema.parse(req.body);
    const created = await prisma.tag.create({ data: body });
    return res.status(201).json(created);
  } catch (e) {
    return next(e);
  }
});

const TagUpdateSchema = TagCreateSchema.partial();

tagsRouter.put("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = TagUpdateSchema.parse(req.body);
    const updated = await prisma.tag.update({ where: { id }, data: body });
    return res.json(updated);
  } catch (e) {
    return next(e);
  }
});

tagsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    await prisma.tag.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    return next(e);
  }
});


