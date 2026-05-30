import { z } from 'zod'

export const castVoteSchema = z.object({
  submissionId: z.string(),
  score:        z.number().int().min(1).max(10),
  comment:      z.string().max(750).optional(),
})

export const updateVoteSchema = z.object({
  score:   z.number().int().min(1).max(10).optional(),
  comment: z.string().max(750).nullable().optional(),
})

export type CastVoteInput   = z.infer<typeof castVoteSchema>
export type UpdateVoteInput = z.infer<typeof updateVoteSchema>
