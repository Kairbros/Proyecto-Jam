import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { sendEmail } from '../../lib/mailer'
import type { RegisterInput, LoginInput } from './auth.schema'

const SALT_ROUNDS = 12
const REFRESH_TOKEN_TTL_DAYS = 30

export async function register(app: FastifyInstance, input: RegisterInput) {
  const existing = await app.prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] }
  })

  if (existing) {
    throw new Error(existing.email === input.email ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN')
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)

  const user = await app.prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      passwordHash,
      displayName: input.displayName
    }
  })

  const verifyToken = randomBytes(32).toString('hex')
  await app.redis.set(`email-verify:${verifyToken}`, user.id, 'EX', 86400)

  // fire-and-forget: registration succeeds even if email fails
  sendEmail({
    to: user.email,
    subject: 'Verify your JamHub account',
    html: `<p>Click <a href="${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}">here</a> to verify your account. Link expires in 24 hours.</p>`
  }).catch((err) => app.log.warn({ err }, 'Failed to send verification email'))

  return user
}

export async function login(app: FastifyInstance, input: LoginInput) {
  const user = await app.prisma.user.findUnique({ where: { email: input.email } })

  if (!user) throw new Error('INVALID_CREDENTIALS')
  if (user.isBanned) throw new Error('ACCOUNT_BANNED')

  const valid = await bcrypt.compare(input.password, user.passwordHash)
  if (!valid) throw new Error('INVALID_CREDENTIALS')

  const accessToken = app.jwt.sign(
    { sub: user.id, email: user.email },
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' }
  )

  const refreshToken = randomBytes(40).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS)

  await app.prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt }
  })

  return { user, accessToken, refreshToken }
}

export async function refresh(app: FastifyInstance, token: string) {
  const stored = await app.prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true }
  })

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await app.prisma.refreshToken.delete({ where: { token } })
    throw new Error('INVALID_REFRESH_TOKEN')
  }

  if (stored.user.isBanned) throw new Error('ACCOUNT_BANNED')

  const accessToken = app.jwt.sign(
    { sub: stored.user.id, email: stored.user.email },
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' }
  )

  return { accessToken, user: stored.user }
}

export async function logout(app: FastifyInstance, token: string) {
  await app.prisma.refreshToken.deleteMany({ where: { token } })
}

export async function verifyEmail(app: FastifyInstance, token: string) {
  const userId = await app.redis.get(`email-verify:${token}`)
  if (!userId) throw new Error('INVALID_TOKEN')

  await app.prisma.user.update({
    where: { id: userId },
    data: { isVerified: true }
  })

  await app.redis.del(`email-verify:${token}`)
}

export async function forgotPassword(app: FastifyInstance, email: string) {
  const user = await app.prisma.user.findUnique({ where: { email } })
  if (!user) return // no revelar si el email existe

  const resetToken = randomBytes(32).toString('hex')
  await app.redis.set(`pwd-reset:${resetToken}`, user.id, 'EX', 3600)

  sendEmail({
    to: user.email,
    subject: 'Reset your JamHub password',
    html: `<p>Click <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">here</a> to reset your password. Expires in 1 hour.</p>`
  }).catch((err) => app.log.warn({ err }, 'Failed to send password reset email'))
}

export async function resetPassword(
  app: FastifyInstance,
  token: string,
  newPassword: string
) {
  const userId = await app.redis.get(`pwd-reset:${token}`)
  if (!userId) throw new Error('INVALID_TOKEN')

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)

  await app.prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  await app.redis.del(`pwd-reset:${token}`)
  await app.prisma.refreshToken.deleteMany({ where: { userId } })
}