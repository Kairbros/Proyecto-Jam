import { z } from 'zod'

const dateField = z.coerce.date()

export const createJamSchema = z.object({
  title:           z.string().min(3).max(100),
  description:     z.string().min(10).max(5000),
  rules:           z.string().max(5000).optional(),
  theme:           z.string().min(1).max(200),
  teamMode:        z.enum(['SOLO_ONLY', 'TEAMS_OPTIONAL', 'TEAMS_ONLY']).default('TEAMS_OPTIONAL'),
  maxParticipants: z.number().int().positive().optional(),
  maxTeamSize:     z.number().int().min(2).max(10).optional(),
  tags:            z.array(z.string().max(30)).max(10).default([]),
  startAt:         dateField,
  submissionsEndAt: dateField,
  votingEndAt:     dateField,
}).refine(d => d.startAt > new Date(), {
  message: 'startAt must be in the future', path: ['startAt']
}).refine(d => d.submissionsEndAt > d.startAt, {
  message: 'submissionsEndAt must be after startAt', path: ['submissionsEndAt']
}).refine(d => d.votingEndAt > d.submissionsEndAt, {
  message: 'votingEndAt must be after submissionsEndAt', path: ['votingEndAt']
})

export const updateJamSchema = z.object({
  title:           z.string().min(3).max(100).optional(),
  description:     z.string().min(10).max(5000).optional(),
  rules:           z.string().max(5000).optional(),
  theme:           z.string().min(1).max(200).optional(),
  teamMode:        z.enum(['SOLO_ONLY', 'TEAMS_OPTIONAL', 'TEAMS_ONLY']).optional(),
  maxParticipants: z.number().int().positive().nullable().optional(),
  maxTeamSize:     z.number().int().min(2).max(10).nullable().optional(),
  tags:            z.array(z.string().max(30)).max(10).optional(),
  startAt:         dateField.optional(),
  submissionsEndAt: dateField.optional(),
  votingEndAt:     dateField.optional(),
})

export const createTeamSchema = z.object({
  name: z.string().min(1).max(50)
})

export type CreateJamInput = z.infer<typeof createJamSchema>
export type UpdateJamInput = z.infer<typeof updateJamSchema>
export type CreateTeamInput = z.infer<typeof createTeamSchema>
