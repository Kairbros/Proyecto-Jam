import { z } from 'zod'

export const createSubmissionSchema = z.object({
  title:       z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  externalUrl: z.string().url().optional(),
})

export const updateSubmissionSchema = z.object({
  title:       z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  externalUrl: z.string().url().nullable().optional(),
})

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>
