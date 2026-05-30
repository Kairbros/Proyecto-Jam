import { z } from 'zod'

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio:         z.string().max(300).optional(),
  websiteUrl:  z.string().url().max(200).optional().or(z.literal('')),
  githubUrl:   z.string().url().max(200).optional().or(z.literal('')),
  itchUrl:     z.string().url().max(200).optional().or(z.literal('')),
  twitterUrl:  z.string().url().max(200).optional().or(z.literal('')),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
