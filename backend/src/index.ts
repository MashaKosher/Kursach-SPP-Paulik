import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./prisma.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT} (env: ${process.env.NODE_ENV ?? "development"})`);
});

async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));


