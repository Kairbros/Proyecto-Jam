import { FastifyInstance } from 'fastify'
import {
  listNotifications, getUnreadCount,
  markAllRead, markOneRead, deleteNotification
} from './notifications.service'
import { ErrorSchema, bearer } from '../../lib/swagger-schemas'

const NotificationSchema = {
  type: 'object',
  properties: {
    id:        { type: 'string' },
    type:      { type: 'string' },
    // additionalProperties: true so fast-json-stringify passes through the
    // dynamic payload keys (commenterUsername, jamSlug, etc.) instead of {}
    data:      { type: 'object', additionalProperties: true },
    read:      { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' }
  }
}

const IdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } }
}

export async function notificationsRoutes(app: FastifyInstance) {
  // GET /notifications
  app.get('/', {
    schema: {
      tags: ['Notifications'],
      summary: 'List my notifications (newest first)',
      security: bearer,
      querystring: {
        type: 'object',
        properties: {
          unread: { type: 'boolean', description: 'Only return unread notifications' },
          cursor: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: { type: 'array', items: NotificationSchema },
            nextCursor: { type: 'string', nullable: true }
          }
        },
        401: ErrorSchema
      }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { unread, cursor } = request.query as { unread?: boolean; cursor?: string }
    return reply.send(await listNotifications(app, sub, !!unread, cursor))
  })

  // GET /notifications/unread-count
  app.get('/unread-count', {
    schema: {
      tags: ['Notifications'],
      summary: 'Get count of unread notifications',
      security: bearer,
      response: {
        200: { type: 'object', properties: { count: { type: 'number' } } },
        401: ErrorSchema
      }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    return reply.send(await getUnreadCount(app, sub))
  })

  // POST /notifications/read-all
  app.post('/read-all', {
    schema: {
      tags: ['Notifications'],
      summary: 'Mark all notifications as read',
      security: bearer,
      response: { 204: { type: 'null' }, 401: ErrorSchema }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    await markAllRead(app, sub)
    return reply.code(204).send()
  })

  // PATCH /notifications/:id/read
  app.patch('/:id/read', {
    schema: {
      tags: ['Notifications'],
      summary: 'Mark a single notification as read',
      security: bearer,
      params: IdParamSchema,
      response: { 204: { type: 'null' }, 401: ErrorSchema, 404: ErrorSchema }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    await markOneRead(app, id, sub)
    return reply.code(204).send()
  })

  // DELETE /notifications/:id
  app.delete('/:id', {
    schema: {
      tags: ['Notifications'],
      summary: 'Delete a notification',
      security: bearer,
      params: IdParamSchema,
      response: { 204: { type: 'null' }, 401: ErrorSchema, 404: ErrorSchema }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    await deleteNotification(app, id, sub)
    return reply.code(204).send()
  })
}
