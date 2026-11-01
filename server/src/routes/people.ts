import { availabilities, volunteerInputSchema } from '@crewbridge/shared'
import { Router } from 'express'
import { z } from 'zod'
import { canManagePerson, visiblePeopleIds } from '../auth/access'
import { me, requireRole } from '../auth/session'
import { conflict, forbidden, notFound, oid, parse, sameId } from '../lib/http'
import { User, type UserDoc } from '../models'

const availabilitySchema = z.object({ availability: z.enum(availabilities) })

async function loadVisiblePerson(u: UserDoc, rawId: unknown) {
  const id = oid(rawId, 'Volunteer')
  const visible = await visiblePeopleIds(u)
  if (!visible.some((v) => sameId(v, id))) throw notFound('Volunteer')
  const person = await User.findById(id)
  if (!person) throw notFound('Volunteer')
  return person
}

async function assertEmailFree(email: string, exceptId?: unknown) {
  const clash = await User.exists({ email: email.toLowerCase(), ...(exceptId ? { _id: { $ne: exceptId } } : {}) })
  if (clash) throw conflict('Someone with this email already exists.', { email: 'Already in your directory' })
}

export function peopleRoutes() {
  const r = Router()

  r.get('/', async (req, res) => {
    const ids = await visiblePeopleIds(me(req))
    const people = await User.find({ _id: { $in: ids } }).collation({ locale: 'en' }).sort({ name: 1 })
    res.json(people.map((p) => p.toJSON()))
  })

  r.post('/', requireRole('organizer', 'leader'), async (req, res) => {
    const u = me(req)
    const data = parse(volunteerInputSchema, req.body)
    await assertEmailFree(data.email)
    const person = await User.create({ ...data, email: data.email.toLowerCase(), createdBy: u._id })
    res.status(201).json(person.toJSON())
  })

  r.put('/:id', async (req, res) => {
    const u = me(req)
    const person = await loadVisiblePerson(u, req.params.id)
    if (!(await canManagePerson(u, person.toObject() as UserDoc))) throw forbidden('You can’t edit this person’s profile.')
    const data = parse(volunteerInputSchema, req.body)
    const self = sameId(person._id, u._id)
    // A claimed account's email belongs to its owner.
    if (!self && person.passwordHash && data.email.toLowerCase() !== person.email) {
      throw forbidden('Only the account owner can change their email.')
    }
    await assertEmailFree(data.email, person._id)
    const keepRole = self || person.role === 'organizer'
    if (person.availability !== data.availability) person.availabilityUpdatedAt = new Date()
    person.set({ ...data, email: data.email.toLowerCase(), role: keepRole ? person.role : data.role })
    await person.save()
    res.json(person.toJSON())
  })

  r.patch('/:id/availability', async (req, res) => {
    const u = me(req)
    const person = await loadVisiblePerson(u, req.params.id)
    if (!(await canManagePerson(u, person.toObject() as UserDoc))) throw forbidden('You can only change your own availability.')
    const { availability } = parse(availabilitySchema, req.body)
    person.set({ availability, availabilityUpdatedAt: new Date() })
    await person.save()
    res.json(person.toJSON())
  })

  return r
}
