import dotenv from "dotenv";

dotenv.config();

import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_PRIVATE_URL ||
  process.env.POSTGRES_PRIVATE_URL;

if (databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl!,
  },
});
