import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { ListQuerySchema, toSkipTake } from "../utils/pagination.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (req, res, next) => {
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
      prisma.category.findMany({ where, orderBy, skip, take }),
      prisma.category.count({ where })
    ]);

    return res.json({ items, total, page: query.page, pageSize: query.pageSize });
  } catch (e) {
    return next(e);
  }
});

const CategoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(120)
});

categoriesRouter.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const body = CategoryCreateSchema.parse(req.body);
    const created = await prisma.category.create({ data: body });
    return res.status(201).json(created);
  } catch (e) {
    return next(e);
  }
});

const CategoryUpdateSchema = CategoryCreateSchema.partial();

categoriesRouter.put("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = CategoryUpdateSchema.parse(req.body);
    const updated = await prisma.category.update({ where: { id }, data: body });
    return res.json(updated);
  } catch (e) {
    return next(e);
  }
});

categoriesRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    await prisma.category.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    return next(e);
  }
});


