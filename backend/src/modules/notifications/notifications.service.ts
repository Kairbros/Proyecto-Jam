import { FastifyInstance } from 'fastify'

const PAGE_SIZE = 20

export async function listNotifications(
  app: FastifyInstance,
  userId: string,
  unreadOnly: boolean,
  cursor?: string
) {
  const where: any = { userId }
  if (unreadOnly) where.read = false

  const rows = await app.prisma.notification.findMany({
    where,
    take: PAGE_SIZE + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' }
  })

  const hasMore = rows.length > PAGE_SIZE
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null }
}

export async function getUnreadCount(app: FastifyInstance, userId: string) {
  const count = await app.prisma.notification.count({ where: { userId, read: false } })
  return { count }
}

export async function markAllRead(app: FastifyInstance, userId: string) {
  await app.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
}

export async function markOneRead(app: FastifyInstance, notificationId: string, userId: string) {
  const n = await app.prisma.notification.findUnique({ where: { id: notificationId } })
  if (!n || n.userId !== userId) throw new Error('NOTIFICATION_NOT_FOUND')
  await app.prisma.notification.update({ where: { id: notificationId }, data: { read: true } })
}

export async function deleteNotification(app: FastifyInstance, notificationId: string, userId: string) {
  const n = await app.prisma.notification.findUnique({ where: { id: notificationId } })
  if (!n || n.userId !== userId) throw new Error('NOTIFICATION_NOT_FOUND')
  await app.prisma.notification.delete({ where: { id: notificationId } })
}
