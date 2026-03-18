import { defineConfig } from "prisma/config";

export default defineConfig({
  migrate: {
    adapter: {
      url: process.env.DATABASE_URL!,
    },
  },
});
