import { createApp } from './app'
import { loadEnv } from './config/env'
import { connectDb, disconnectDb } from './db/connect'
import { User } from './models'
import { seedDemo } from './seed/seedDemo'

const env = loadEnv()
const { inMemory } = await connectDb(env)

// A throwaway in-memory database starts empty; load the demo workspace so the app is usable.
if (inMemory && !(await User.exists({}))) {
  const { password, accounts } = await seedDemo(env)
  console.log(`Seeded demo data. Sign in as ${accounts[0]} (password: ${password}).`)
}

const server = createApp(env).listen(env.port, () => {
  console.log(`CrewBridge API listening on http://localhost:${env.port} (${env.nodeEnv})`)
})

async function shutdown() {
  server.close()
  await disconnectDb()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
