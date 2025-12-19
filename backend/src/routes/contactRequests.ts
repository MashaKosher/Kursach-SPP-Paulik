import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { ListQuerySchema, toSkipTake } from "../utils/pagination.js";

export const contactRequestsRouter = Router();

// Public create (from "contact us" form)
const ContactCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().toLowerCase(),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().min(5).max(2000)
});

contactRequestsRouter.post("/", async (req, res, next) => {
  try {
    const body = ContactCreateSchema.parse(req.body);
    const created = await prisma.contactRequest.create({ data: body });
    return res.status(201).json(created);
  } catch (e) {
    return next(e);
  }
});

// Protected: list/update/delete
contactRequestsRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const query = ListQuerySchema.extend({
      status: z.string().trim().optional()
    }).parse(req.query);

    const where = {
      AND: [
        query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: "insensitive" as const } },
                { email: { contains: query.q, mode: "insensitive" as const } },
                { message: { contains: query.q, mode: "insensitive" as const } }
              ]
            }
          : {},
        query.status ? { status: query.status } : {}
      ]
    };

    const orderBy = { createdAt: query.order ?? "desc" as const };
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      prisma.contactRequest.findMany({ where, orderBy, skip, take }),
      prisma.contactRequest.count({ where })
    ]);

    return res.json({ items, total, page: query.page, pageSize: query.pageSize });
  } catch (e) {
    return next(e);
  }
});

const ContactUpdateSchema = z.object({
  status: z.enum(["new", "in_progress", "done", "archived"]).optional()
});

contactRequestsRouter.put("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = ContactUpdateSchema.parse(req.body);
    const updated = await prisma.contactRequest.update({ where: { id }, data: body });
    return res.json(updated);
  } catch (e) {
    return next(e);
  }
});

contactRequestsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    await prisma.contactRequest.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    return next(e);
  }
});


