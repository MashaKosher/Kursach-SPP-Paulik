import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { ListQuerySchema, toSkipTake } from "../utils/pagination.js";

export const newsRouter = Router();

// Public: only published
newsRouter.get("/", async (req, res, next) => {
  try {
    const query = ListQuerySchema.parse(req.query);

    const orderBy =
      query.sort === "title"
        ? { title: query.order ?? "asc" }
        : query.sort === "publishedAt"
          ? { publishedAt: query.order ?? "desc" }
          : { createdAt: query.order ?? "desc" };

    const where = {
      isPublished: true,
      AND: [
        query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: "insensitive" as const } },
                { excerpt: { contains: query.q, mode: "insensitive" as const } },
                { content: { contains: query.q, mode: "insensitive" as const } }
              ]
            }
          : {}
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

newsRouter.get("/:slug", async (req, res, next) => {
  try {
    const slug = z.string().min(1).parse(req.params.slug);
    const item = await prisma.news.findFirst({
      where: { slug, isPublished: true },
      include: { images: true, author: { select: { id: true, email: true, name: true } } }
    });
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (e) {
    return next(e);
  }
});

// Protected CRUD (can manage drafts)
const NewsCreateSchema = z.object({
  title: z.string().trim().min(1).max(250),
  slug: z.string().trim().min(1).max(250),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().min(1),
  isPublished: z.boolean().optional(),
  imageUrls: z.array(z.string().url()).optional()
});

newsRouter.post("/", requireAuth, requireRole("admin"), async (req: AuthedRequest, res, next) => {
  try {
    const body = NewsCreateSchema.parse(req.body);
    const now = new Date();
    const created = await prisma.news.create({
      data: {
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        content: body.content,
        isPublished: body.isPublished ?? false,
        publishedAt: body.isPublished ? now : null,
        authorId: req.user!.id,
        images: body.imageUrls
          ? { create: body.imageUrls.map((url, idx) => ({ url, sortOrder: idx })) }
          : undefined
      },
      include: { images: true, author: { select: { id: true, email: true, name: true } } }
    });
    return res.status(201).json(created);
  } catch (e) {
    return next(e);
  }
});

const NewsUpdateSchema = NewsCreateSchema.partial();

newsRouter.put("/:id", requireAuth, requireRole("admin"), async (req: AuthedRequest, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = NewsUpdateSchema.parse(req.body);

    const now = new Date();
    const updated = await prisma.news.update({
      where: { id },
      data: {
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        content: body.content,
        isPublished: body.isPublished,
        publishedAt: body.isPublished === true ? now : body.isPublished === false ? null : undefined
      }
    });

    if (body.imageUrls) {
      await prisma.newsImage.deleteMany({ where: { newsId: id } });
      await prisma.newsImage.createMany({
        data: body.imageUrls.map((url, idx) => ({ newsId: id, url, sortOrder: idx }))
      });
    }

    const item = await prisma.news.findUnique({
      where: { id: updated.id },
      include: { images: true, author: { select: { id: true, email: true, name: true } } }
    });
    return res.json(item);
  } catch (e) {
    return next(e);
  }
});

newsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    await prisma.news.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    return next(e);
  }
});


