import { defineConfig } from 'drizzle-kit'

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
}

export default defineConfig({
  out: './migrations',
  schema: './src/lib/db/schema.ts',
  dialect: 'turso',
  dbCredentials: {
    url,
    authToken,
  },
})
