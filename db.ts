import { PrismaClient } from '@prisma/client'

// Detect Turso (libsql://) vs local SQLite (file:/)
const dbUrl = process.env.DATABASE_URL || 'file:/home/z/my-project/db/custom.db'
const isTurso = dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://')

function createPrismaClient() {
  if (isTurso) {
    // Cloud SQLite (Turso) for Vercel/serverless
    // Dynamic import to avoid bundling issues on non-Turso deployments
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')
    const { createClient } = require('@libsql/client')

    const libsql = createClient({
      url: dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

    const adapter = new PrismaLibSQL(libsql)
    // For Turso, we still need a dummy DATABASE_URL for Prisma schema validation
    // The actual connection goes through the adapter
    process.env.DATABASE_URL = 'file:/tmp/turso-proxy.db'
    return new PrismaClient({ adapter } as any)
  } else {
    // Local SQLite for VPS/self-hosted
    return new PrismaClient()
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db