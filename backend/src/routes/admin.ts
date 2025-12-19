import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { ListQuerySchema, toSkipTake } from "../utils/pagination.js";

export const adminRouter = Router();
adminRouter.use(requireAuth);
adminRouter.use(requireRole("admin"));

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

adminRouter.get("/users", async (req, res, next) => {
  try {
    const query = ListQuerySchema.extend({
      isActive: z.enum(["true", "false"]).optional()
    }).parse(req.query);

    const orderBy =
      query.sort === "email"
        ? { email: query.order ?? "asc" }
        : query.sort === "createdAt"
          ? { createdAt: query.order ?? "desc" }
          : { createdAt: query.order ?? "desc" };

    const where = {
      AND: [
        query.q
          ? {
              OR: [
                { email: { contains: query.q, mode: "insensitive" as const } },
                { name: { contains: query.q, mode: "insensitive" as const } }
              ]
            }
          : {},
        query.isActive ? { isActive: query.isActive === "true" } : {}
      ]
    };

    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          roles: { select: { role: { select: { name: true } } } }
        }
      }),
      prisma.user.count({ where })
    ]);

    return res.json({
      items: items.map((u) => ({
        ...u,
        roles: u.roles.map((r) => r.role.name)
      })),
      total,
      page: query.page,
      pageSize: query.pageSize
    });
  } catch (e) {
    return next(e);
  }
});

adminRouter.put("/users/:id", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = z.object({ isActive: z.boolean().optional() }).parse(req.body);

    // Prevent self-lockout
    if (id === (req as any).user.id && body.isActive === false) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: body.isActive }
    });
    return res.json({ id: updated.id, isActive: updated.isActive });
  } catch (e) {
    return next(e);
  }
});

adminRouter.put("/users/:id/roles", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = z.object({ roles: z.array(z.string().min(1)).min(1) }).parse(req.body);

    // Prevent removing your own admin role (safety)
    if (id === (req as any).user.id && !body.roles.includes("admin")) {
      return res.status(400).json({ message: "You cannot remove your own admin role" });
    }

    const roleRecords = await Promise.all(
      body.roles.map((name) =>
        prisma.role.upsert({
          where: { name },
          create: { name },
          update: {}
        })
      )
    );

    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: id } }),
      prisma.userRole.createMany({
        data: roleRecords.map((r) => ({ userId: id, roleId: r.id })),
        skipDuplicates: true
      })
    ]);

    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } }
    });
    if (!user) return res.status(404).json({ message: "Not found" });
    return res.json({
      id: user.id,
      roles: user.roles.map((r) => r.role.name)
    });
  } catch (e) {
    return next(e);
  }
});


