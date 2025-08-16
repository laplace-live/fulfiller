import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './migrations',
  schema: './src/lib/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env['DB_FILE_NAME'] || 'fulfillments.db',
  },
})
