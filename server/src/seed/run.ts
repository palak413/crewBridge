/**
 * Load demo data into the configured database.
 *   npm run seed            — only if the database has no users
 *   npm run seed -- --reset — wipe CrewBridge collections first
 * Refuses to run in production unless SEED_ALLOW_PRODUCTION=true.
 */
import { loadEnv } from '../config/env'
import { connectDb, disconnectDb } from '../db/connect'
import { User } from '../models'
import { clearAll, seedDemo } from './seedDemo'

const env = loadEnv()
if (env.nodeEnv === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
  console.error('Refusing to seed in production. Set SEED_ALLOW_PRODUCTION=true to override.')
  process.exit(1)
}
if (!env.mongoUri) {
  console.error('MONGODB_URI is not set. The dev server seeds its in-memory database automatically; this script is for a real database.')
  process.exit(1)
}

await connectDb(env)
try {
  if (process.argv.includes('--reset')) await clearAll()
  else if (await User.exists({})) {
    console.error('Database already has users. Re-run with --reset to wipe and reseed.')
    process.exitCode = 1
  }
  if (process.exitCode !== 1) {
    await User.init() // build indexes before inserting
    const { password, accounts } = await seedDemo(env)
    console.log(`Seeded demo workspace. Accounts: ${accounts.join(', ')} — password: ${password}`)
  }
} finally {
  await disconnectDb()
}
