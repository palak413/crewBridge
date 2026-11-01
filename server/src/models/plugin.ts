import type { Schema } from 'mongoose'

/**
 * JSON shape for every model: `id` instead of `_id`, ObjectIds as strings, no `__v`,
 * and never any secret fields. Dates serialize as ISO strings via JSON.stringify.
 */
export function apiJson(schema: Schema) {
  schema.set('toJSON', {
    versionKey: false,
    flattenObjectIds: true,
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = String(ret._id)
      delete ret._id
      delete ret.passwordHash
      delete ret.chatMemberIds
      return ret
    },
  })
}
