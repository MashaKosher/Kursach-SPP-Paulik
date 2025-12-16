import { z } from "zod";

export const ListQuerySchema = z.object({
  q: z.string().trim().optional(),
  sort: z.string().trim().optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});

export function toSkipTake(page: number, pageSize: number) {
  const take = pageSize;
  const skip = (page - 1) * pageSize;
  return { skip, take };
}


