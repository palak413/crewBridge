import mongoose from 'mongoose'
import type { MongoMemoryServer } from 'mongodb-memory-server'
import type { Env } from '../config/env'

let memoryServer: MongoMemoryServer | null = null

/**
 * Connect to MongoDB. With no MONGODB_URI outside production, starts an in-memory MongoDB so the
 * app runs locally without Atlas — data is lost on restart, and a warning says so.
 */
export async function connectDb(env: Env, log: (msg: string) => void = console.log) {
  let uri = env.mongoUri
  if (!uri) {
    const { MongoMemoryServer: Mms } = await import('mongodb-memory-server')
    memoryServer = await Mms.create()
    uri = memoryServer.getUri('crewbridge')
    log('⚠ MONGODB_URI not set — using a temporary in-memory MongoDB. Data is lost when the server stops.')
  }
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 })
  log(`MongoDB connected (${memoryServer ? 'in-memory' : redact(uri)})`)
  return { inMemory: !!memoryServer }
}

export async function disconnectDb() {
  await mongoose.disconnect()
  if (memoryServer) {
    await memoryServer.stop()
    memoryServer = null
  }
}

function redact(uri: string) {
  try {
    const u = new URL(uri)
    return `${u.protocol}//${u.host}${u.pathname}`
  } catch {
    return 'configured URI'
  }
}
