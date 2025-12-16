import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { productsRouter } from "./routes/products.js";
import { newsRouter } from "./routes/news.js";
import { categoriesRouter } from "./routes/categories.js";
import { tagsRouter } from "./routes/tags.js";
import { contactRequestsRouter } from "./routes/contactRequests.js";
import { adminRouter } from "./routes/admin.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Public auth
  app.use("/auth", authRouter);

  // Admin (auth required)
  app.use("/admin", adminRouter);

  // Public read/search/sort
  app.use("/products", productsRouter);
  app.use("/news", newsRouter);
  app.use("/categories", categoriesRouter);
  app.use("/tags", tagsRouter);

  // Public create contact request; protected list/update/delete inside router
  app.use("/contact-requests", contactRequestsRouter);

  app.use(errorHandler);
  return app;
}


