import { FastifyInstance } from 'fastify'
import { updateProfileSchema } from './users.schema'
import { getProfile, getMe, updateProfile, uploadAvatar, uploadBanner, deleteAvatar } from './users.service'
import { followUser, unfollowUser, getFollowers, getFollowing, searchUsers } from './follow.service'
import { getUserPosts as getUserPostsFn } from '../posts/posts.service'
import { getUserJams as getUserJamsFn } from '../jams/jams.service'
import {
  ErrorSchema, OkSchema, UserPublicSchema, UserPrivateSchema,
  PaginatedUsersSchema, PaginatedPostsSchema,
  CursorQuerySchema, UsernameParamSchema, bearer
} from '../../lib/swagger-schemas'

export async function usersRoutes(app: FastifyInstance) {
  // GET /users/search?q=...
  app.get('/search', {
    schema: {
      tags: ['Users'],
      summary: 'Search users by username or display name',
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q:      { type: 'string', minLength: 1, description: 'Search query' },
          cursor: { type: 'string', description: 'Pagination cursor' }
        }
      },
      response: { 200: PaginatedUsersSchema }
    }
  }, async (request, reply) => {
    const { q, cursor } = request.query as { q?: string; cursor?: string }
    return reply.send(await searchUsers(app, q ?? '', cursor))
  })

  // GET /users/me
  app.get('/me', {
    schema: {
      tags: ['Users'],
      summary: 'Get my profile',
      security: bearer,
      response: { 200: UserPrivateSchema, 401: ErrorSchema }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    return reply.send(await getMe(app, sub))
  })

  // PATCH /users/me
  app.patch('/me', {
    schema: {
      tags: ['Users'],
      summary: 'Update my profile',
      security: bearer,
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string', minLength: 1, maxLength: 50 },
          bio:         { type: 'string', maxLength: 300 },
          websiteUrl:  { type: 'string', description: 'Pass empty string to clear' },
          githubUrl:   { type: 'string', description: 'Pass empty string to clear' },
          itchUrl:     { type: 'string', description: 'Pass empty string to clear' },
          twitterUrl:  { type: 'string', description: 'Pass empty string to clear' }
        }
      },
      response: { 200: UserPrivateSchema, 401: ErrorSchema }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const input = updateProfileSchema.parse(request.body)
    return reply.send(await updateProfile(app, sub, input))
  })

  // POST /users/me/avatar
  app.post('/me/avatar', {
    schema: {
      tags: ['Users'],
      summary: 'Upload avatar (multipart/form-data, field: file, max 5MB)',
      security: bearer,
      consumes: ['multipart/form-data'],
      response: {
        200: { type: 'object', properties: { avatarUrl: { type: 'string' } } },
        401: ErrorSchema, 400: ErrorSchema
      }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const data = await request.file()
    if (!data) return reply.code(400).send({ error: 'No file provided' })
    return reply.send(await uploadAvatar(app, sub, data))
  })

  // DELETE /users/me/avatar
  app.delete('/me/avatar', {
    schema: {
      tags: ['Users'],
      summary: 'Delete my avatar',
      security: bearer,
      response: {
        200: { type: 'object', properties: { avatarUrl: { type: 'string', nullable: true } } },
        401: ErrorSchema
      }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    return reply.send(await deleteAvatar(app, sub))
  })

  // POST /users/me/banner
  app.post('/me/banner', {
    schema: {
      tags: ['Users'],
      summary: 'Upload banner (multipart/form-data, field: file, max 10MB)',
      security: bearer,
      consumes: ['multipart/form-data'],
      response: {
        200: { type: 'object', properties: { bannerUrl: { type: 'string' } } },
        401: ErrorSchema, 400: ErrorSchema
      }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const data = await request.file()
    if (!data) return reply.code(400).send({ error: 'No file provided' })
    return reply.send(await uploadBanner(app, sub, data))
  })

  // GET /users/:username
  app.get('/:username', {
    schema: {
      tags: ['Users'],
      summary: 'Get public profile',
      params: UsernameParamSchema,
      response: { 200: UserPrivateSchema, 404: ErrorSchema }
    }
  }, async (request, reply) => {
    const { username } = request.params as { username: string }
    return reply.send(await getProfile(app, username))
  })

  // POST /users/:username/follow
  app.post('/:username/follow', {
    schema: {
      tags: ['Users'],
      summary: 'Follow a user',
      security: bearer,
      params: UsernameParamSchema,
      response: { 204: { type: 'null' }, 400: ErrorSchema, 401: ErrorSchema, 404: ErrorSchema }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { username } = request.params as { username: string }
    await followUser(app, sub, username)
    return reply.code(204).send()
  })

  // DELETE /users/:username/follow
  app.delete('/:username/follow', {
    schema: {
      tags: ['Users'],
      summary: 'Unfollow a user',
      security: bearer,
      params: UsernameParamSchema,
      response: { 204: { type: 'null' }, 401: ErrorSchema, 404: ErrorSchema }
    },
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { username } = request.params as { username: string }
    await unfollowUser(app, sub, username)
    return reply.code(204).send()
  })

  // GET /users/:username/followers
  app.get('/:username/followers', {
    schema: {
      tags: ['Users'],
      summary: 'List followers',
      params: UsernameParamSchema,
      querystring: CursorQuerySchema,
      response: { 200: PaginatedUsersSchema, 404: ErrorSchema }
    }
  }, async (request, reply) => {
    const { username } = request.params as { username: string }
    const { cursor } = request.query as { cursor?: string }
    return reply.send(await getFollowers(app, username, cursor))
  })

  // GET /users/:username/following
  app.get('/:username/following', {
    schema: {
      tags: ['Users'],
      summary: 'List following',
      params: UsernameParamSchema,
      querystring: CursorQuerySchema,
      response: { 200: PaginatedUsersSchema, 404: ErrorSchema }
    }
  }, async (request, reply) => {
    const { username } = request.params as { username: string }
    const { cursor } = request.query as { cursor?: string }
    return reply.send(await getFollowing(app, username, cursor))
  })

  // GET /users/:username/posts
  app.get('/:username/posts', {
    schema: {
      tags: ['Users'],
      summary: 'List posts by user',
      params: UsernameParamSchema,
      querystring: CursorQuerySchema,
      response: { 200: PaginatedPostsSchema, 404: ErrorSchema }
    }
  }, async (request, reply) => {
    const { username } = request.params as { username: string }
    const { cursor } = request.query as { cursor?: string }
    let viewerId: string | undefined
    try { await request.jwtVerify(); viewerId = (request.user as any).sub } catch {}
    return reply.send(await getUserPostsFn(app, username, cursor, viewerId))
  })

  // GET /users/:username/jams — jams organized by this user
  app.get('/:username/jams', {
    schema: {
      tags: ['Users'],
      summary: 'List jams organized by user',
      params: UsernameParamSchema,
      querystring: CursorQuerySchema,
      response: { 404: ErrorSchema }
    }
  }, async (request, reply) => {
    const { username } = request.params as { username: string }
    const { cursor } = request.query as { cursor?: string }
    let viewerId: string | undefined
    try { await request.jwtVerify(); viewerId = (request.user as any).sub } catch {}
    return reply.send(await getUserJamsFn(app, username, cursor, viewerId))
  })
}
