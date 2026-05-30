import { z } from 'zod'

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'At most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores'),
  displayName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters').max(72)
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

export const forgotPasswordSchema = z.object({
  email: z.string().email()
})

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(72)
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>