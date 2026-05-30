import { FastifyInstance } from 'fastify'
import { notify } from '../../lib/notifications'

const PAGE_SIZE = 20

export async function followUser(app: FastifyInstance, followerId: string, targetUsername: string) {
  const target = await app.prisma.user.findUnique({ where: { username: targetUsername } })
  if (!target) throw new Error('USER_NOT_FOUND')
  if (target.id === followerId) throw new Error('CANNOT_FOLLOW_SELF')

  const existing = await app.prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: target.id } }
  })
  if (existing) return

  const follower = await app.prisma.user.findUnique({
    where: { id: followerId },
    select: { username: true, avatarUrl: true }
  })

  await app.prisma.follow.create({ data: { followerId, followingId: target.id } })

  await notify(app.prisma, target.id, {
    type: 'NEW_FOLLOWER',
    followerId,
    followerUsername: follower!.username,
    followerAvatarUrl: follower!.avatarUrl
  }).catch(() => null)
}

export async function unfollowUser(app: FastifyInstance, followerId: string, targetUsername: string) {
  const target = await app.prisma.user.findUnique({ where: { username: targetUsername } })
  if (!target) throw new Error('USER_NOT_FOUND')

  await app.prisma.follow.deleteMany({
    where: { followerId, followingId: target.id }
  })
}

export async function getFollowers(
  app: FastifyInstance,
  username: string,
  cursor?: string
) {
  const user = await app.prisma.user.findUnique({ where: { username } })
  if (!user) throw new Error('USER_NOT_FOUND')

  const follows = await app.prisma.follow.findMany({
    where: { followingId: user.id },
    take: PAGE_SIZE + 1,
    ...(cursor ? { skip: 1, cursor: { followerId_followingId: { followerId: cursor, followingId: user.id } } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      follower: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true }
      }
    }
  })

  const hasMore = follows.length > PAGE_SIZE
  const items = hasMore ? follows.slice(0, PAGE_SIZE) : follows
  const nextCursor = hasMore ? items[items.length - 1].followerId : null

  return { items: items.map(f => f.follower), nextCursor }
}

export async function getFollowing(
  app: FastifyInstance,
  username: string,
  cursor?: string
) {
  const user = await app.prisma.user.findUnique({ where: { username } })
  if (!user) throw new Error('USER_NOT_FOUND')

  const follows = await app.prisma.follow.findMany({
    where: { followerId: user.id },
    take: PAGE_SIZE + 1,
    ...(cursor ? { skip: 1, cursor: { followerId_followingId: { followerId: user.id, followingId: cursor } } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      following: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true }
      }
    }
  })

  const hasMore = follows.length > PAGE_SIZE
  const items = hasMore ? follows.slice(0, PAGE_SIZE) : follows
  const nextCursor = hasMore ? items[items.length - 1].followingId : null

  return { items: items.map(f => f.following), nextCursor }
}

export async function searchUsers(app: FastifyInstance, q: string, cursor?: string) {
  if (!q || q.trim().length < 1) return { items: [], nextCursor: null }

  const users = await app.prisma.user.findMany({
    where: {
      OR: [
        { username:    { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } }
      ],
      isBanned: false
    },
    take: PAGE_SIZE + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { username: 'asc' },
    select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true }
  })

  const hasMore = users.length > PAGE_SIZE
  const items = hasMore ? users.slice(0, PAGE_SIZE) : users
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return { items, nextCursor }
}
