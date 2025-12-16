import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { ListQuerySchema, toSkipTake } from "../utils/pagination.js";

export const productsRouter = Router();

// Public: list with search/sort
productsRouter.get("/", async (req, res, next) => {
  try {
    const query = ListQuerySchema.extend({
      categorySlug: z.string().trim().optional()
    }).parse(req.query);

    const orderBy =
      query.sort === "price"
        ? { price: query.order ?? "desc" }
        : query.sort === "title"
          ? { title: query.order ?? "asc" }
          : { createdAt: query.order ?? "desc" };

    const where = {
      isActive: true,
      AND: [
        query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: "insensitive" as const } },
                { description: { contains: query.q, mode: "insensitive" as const } }
              ]
            }
          : {},
        query.categorySlug
          ? { category: { slug: query.categorySlug } }
          : {}
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

productsRouter.get("/:slug", async (req, res, next) => {
  try {
    const slug = z.string().min(1).parse(req.params.slug);
    const item = await prisma.product.findFirst({
      where: { slug, isActive: true },
      include: { category: true, images: true, tags: { include: { tag: true } } }
    });
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (e) {
    return next(e);
  }
});

// Protected CRUD
const ProductCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(250),
  description: z.string().trim().max(5000).optional(),
  price: z.coerce.number().nonnegative(),
  isActive: z.boolean().optional(),
  categoryId: z.string().uuid().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  tagIds: z.array(z.string().uuid()).optional()
});

productsRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = ProductCreateSchema.parse(req.body);
    const created = await prisma.product.create({
      data: {
        title: body.title,
        slug: body.slug,
        description: body.description,
        price: body.price,
        isActive: body.isActive ?? true,
        categoryId: body.categoryId,
        images: body.imageUrls
          ? { create: body.imageUrls.map((url, idx) => ({ url, sortOrder: idx })) }
          : undefined
      }
    });

    if (body.tagIds?.length) {
      await prisma.productTag.createMany({
        data: body.tagIds.map((tagId) => ({ productId: created.id, tagId })),
        skipDuplicates: true
      });
    }

    const item = await prisma.product.findUnique({
      where: { id: created.id },
      include: { category: true, images: true, tags: { include: { tag: true } } }
    });
    return res.status(201).json(item);
  } catch (e) {
    return next(e);
  }
});

const ProductUpdateSchema = ProductCreateSchema.partial();

productsRouter.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = ProductUpdateSchema.parse(req.body);

    const updated = await prisma.product.update({
      where: { id },
      data: {
        title: body.title,
        slug: body.slug,
        description: body.description,
        price: body.price,
        isActive: body.isActive,
        categoryId: body.categoryId
      }
    });

    if (body.imageUrls) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      await prisma.productImage.createMany({
        data: body.imageUrls.map((url, idx) => ({ productId: id, url, sortOrder: idx }))
      });
    }

    if (body.tagIds) {
      await prisma.productTag.deleteMany({ where: { productId: id } });
      if (body.tagIds.length) {
        await prisma.productTag.createMany({
          data: body.tagIds.map((tagId) => ({ productId: id, tagId })),
          skipDuplicates: true
        });
      }
    }

    const item = await prisma.product.findUnique({
      where: { id: updated.id },
      include: { category: true, images: true, tags: { include: { tag: true } } }
    });
    return res.json(item);
  } catch (e) {
    return next(e);
  }
});

productsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    await prisma.product.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    return next(e);
  }
});


