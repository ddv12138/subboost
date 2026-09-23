import "dotenv/config";
import { defineConfig } from "prisma/config";

const datasourceUrl =
  process.env.DATABASE_URL?.trim() || "file:./dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: datasourceUrl,
  },
});
