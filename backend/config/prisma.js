require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_PRIVATE_URL ||
  process.env.POSTGRES_PRIVATE_URL;

if (databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

const prisma = new PrismaClient();

module.exports = prisma;
