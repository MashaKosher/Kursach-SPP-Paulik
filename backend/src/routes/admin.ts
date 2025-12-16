import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { ListQuerySchema, toSkipTake } from "../utils/pagination.js";

export const adminRouter = Router();
adminRouter.use(requireAuth);

adminRouter.get("/products", async (req, res, next) => {
  try {
    const query = ListQuerySchema.extend({
      isActive: z.enum(["true", "false"]).optional()
    }).parse(req.query);

    const orderBy =
      query.sort === "price"
        ? { price: query.order ?? "desc" }
        : query.sort === "title"
          ? { title: query.order ?? "asc" }
          : { createdAt: query.order ?? "desc" };

    const where = {
      AND: [
        query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: "insensitive" as const } },
                { description: { contains: query.q, mode: "insensitive" as const } }
              ]
            }
          : {},
        query.isActive ? { isActive: query.isActive === "true" } : {}
      ]
    };

    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: { category: true, images: true, tags: { include: { tag: true } } }
      }),
      prisma.product.count({ where })
    ]);

    return res.json({ items, total, page: query.page, pageSize: query.pageSize });
  } catch (e) {
    return next(e);
  }
});

adminRouter.get("/products/:id", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const item = await prisma.product.findUnique({
      where: { id },
      include: { category: true, images: true, tags: { include: { tag: true } } }
    });
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (e) {
    return next(e);
  }
});

adminRouter.get("/news", async (req, res, next) => {
  try {
    const query = ListQuerySchema.extend({
      isPublished: z.enum(["true", "false"]).optional()
    }).parse(req.query);

    const orderBy =
      query.sort === "title"
        ? { title: query.order ?? "asc" }
        : query.sort === "publishedAt"
          ? { publishedAt: query.order ?? "desc" }
          : { createdAt: query.order ?? "desc" };

    const where = {
      AND: [
        query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: "insensitive" as const } },
                { excerpt: { contains: query.q, mode: "insensitive" as const } },
                { content: { contains: query.q, mode: "insensitive" as const } }
              ]
            }
          : {},
        query.isPublished ? { isPublished: query.isPublished === "true" } : {}
      ]
    };

    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      prisma.news.findMany({
        where,
        orderBy,
        skip,
        take,
        include: { images: true, author: { select: { id: true, email: true, name: true } } }
      }),
      prisma.news.count({ where })
    ]);

    return res.json({ items, total, page: query.page, pageSize: query.pageSize });
  } catch (e) {
    return next(e);
  }
});

adminRouter.get("/news/:id", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const item = await prisma.news.findUnique({
      where: { id },
      include: { images: true, author: { select: { id: true, email: true, name: true } } }
    });
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (e) {
    return next(e);
  }
});


