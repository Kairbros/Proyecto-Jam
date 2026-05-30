import { FastifyInstance } from 'fastify'
import { uploadFile, deleteFile } from '../../lib/storage'
import type { UpdateProfileInput } from './users.schema'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_AVATAR_SIZE = 5 * 1024 * 1024   // 5 MB
const MAX_BANNER_SIZE = 10 * 1024 * 1024  // 10 MB

export function safeUser(user: Record<string, unknown>) {
  const { passwordHash: _, ...rest } = user
  return rest
}

export async function getProfile(app: FastifyInstance, username: string) {
  const user = await app.prisma.user.findUnique({
    where: { username },
    select: {
      id: true, username: true, displayName: true, bio: true,
      avatarUrl: true, bannerUrl: true, websiteUrl: true,
      githubUrl: true, itchUrl: true, twitterUrl: true,
      isVerified: true, createdAt: true,
      _count: { select: { followers: true, following: true } }
    }
  })
  if (!user) throw new Error('USER_NOT_FOUND')
  return user
}

export async function getMe(app: FastifyInstance, userId: string) {
  const user = await app.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, username: true, email: true, displayName: true, bio: true,
      avatarUrl: true, bannerUrl: true, websiteUrl: true,
      githubUrl: true, itchUrl: true, twitterUrl: true,
      isVerified: true, isAdmin: true, createdAt: true,
      _count: { select: { followers: true, following: true } }
    }
  })
  if (!user) throw new Error('USER_NOT_FOUND')
  return user
}

export async function updateProfile(
  app: FastifyInstance,
  userId: string,
  input: UpdateProfileInput
) {
  // Convert empty strings to null to clear optional URL fields
  const data: Record<string, string | null | undefined> = {}
  for (const [k, v] of Object.entries(input)) {
    data[k] = v === '' ? null : v
  }

  return app.prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, username: true, email: true, displayName: true, bio: true,
      avatarUrl: true, bannerUrl: true, websiteUrl: true,
      githubUrl: true, itchUrl: true, twitterUrl: true,
      isVerified: true, createdAt: true
    }
  })
}

export async function uploadAvatar(
  app: FastifyInstance,
  userId: string,
  file: { filename: string; mimetype: string; toBuffer: () => Promise<Buffer> }
) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw new Error('INVALID_FILE_TYPE')
  }

  const buffer = await file.toBuffer()
  if (buffer.length > MAX_AVATAR_SIZE) throw new Error('FILE_TOO_LARGE')

  const ext = file.filename.split('.').pop() ?? 'jpg'
  const key = `avatars/${userId}.${ext}`

  const url = await uploadFile(key, buffer, file.mimetype)
  // Version the URL so every consumer (navbar, profile, posts…) busts its cache
  // on each upload, even though the storage key is reused.
  const versioned = `${url}?v=${Date.now()}`

  return app.prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: versioned },
    select: { avatarUrl: true }
  })
}

export async function uploadBanner(
  app: FastifyInstance,
  userId: string,
  file: { filename: string; mimetype: string; toBuffer: () => Promise<Buffer> }
) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw new Error('INVALID_FILE_TYPE')
  }

  const buffer = await file.toBuffer()
  if (buffer.length > MAX_BANNER_SIZE) throw new Error('FILE_TOO_LARGE')

  const ext = file.filename.split('.').pop() ?? 'jpg'
  const key = `banners/${userId}.${ext}`

  const url = await uploadFile(key, buffer, file.mimetype)
  const versioned = `${url}?v=${Date.now()}`

  return app.prisma.user.update({
    where: { id: userId },
    data: { bannerUrl: versioned },
    select: { bannerUrl: true }
  })
}

export async function deleteAvatar(app: FastifyInstance, userId: string) {
  const user = await app.prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true }
  })
  if (user?.avatarUrl) {
    // strip any ?v= cache-busting query before deriving the storage key
    const key = user.avatarUrl.split('?')[0].split('/').slice(-2).join('/')
    await deleteFile(key).catch(() => null)
  }
  return app.prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
    select: { avatarUrl: true }
  })
}
