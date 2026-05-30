import { FastifyInstance } from 'fastify'

const PAGE_SIZE = 20

const participationSelect = {
  id: true,
  createdAt: true,
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
  team: { select: { id: true, name: true } }
}

const teamSelect = {
  id: true,
  name: true,
  createdAt: true,
  _count: { select: { members: true } },
  members: {
    select: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } }
    }
  }
}

export async function joinJam(app: FastifyInstance, slug: string, userId: string) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')
  if (jam.organizerId === userId) throw new Error('FORBIDDEN')
  if (jam.status !== 'OPEN' && jam.status !== 'IN_PROGRESS') throw new Error('JAM_NOT_OPEN')

  // Serializable so the capacity check + insert can't race past maxParticipants
  return app.prisma.$transaction(async (tx) => {
    const existing = await tx.jamParticipation.findUnique({
      where: { userId_jamId: { userId, jamId: jam.id } }
    })
    if (existing) throw new Error('ALREADY_PARTICIPATING')

    if (jam.maxParticipants) {
      const count = await tx.jamParticipation.count({ where: { jamId: jam.id } })
      if (count >= jam.maxParticipants) throw new Error('JAM_FULL')
    }

    return tx.jamParticipation.create({
      data: { userId, jamId: jam.id },
      select: participationSelect
    })
  }, { isolationLevel: 'Serializable' })
}

export async function leaveJam(app: FastifyInstance, slug: string, userId: string) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')

  const participation = await app.prisma.jamParticipation.findUnique({
    where: { userId_jamId: { userId, jamId: jam.id } }
  })
  if (!participation) throw new Error('NOT_PARTICIPATING')
  if (jam.status === 'CLOSED') throw new Error('JAM_NOT_OPEN')

  // Can't abandon a jam once you've submitted — would orphan the submission
  const submission = await app.prisma.submission.findUnique({
    where: { userId_jamId: { userId, jamId: jam.id } }
  })
  if (submission) throw new Error('CANNOT_LEAVE_AFTER_SUBMISSION')

  const { teamId } = participation
  await app.prisma.$transaction(async (tx) => {
    await tx.jamParticipation.delete({ where: { id: participation.id } })
    // Clean up the team if this was its last member
    if (teamId) {
      const remaining = await tx.jamParticipation.count({ where: { teamId } })
      if (remaining === 0) await tx.team.delete({ where: { id: teamId } })
    }
  })
}

export async function listParticipants(app: FastifyInstance, slug: string, cursor?: string) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')

  const rows = await app.prisma.jamParticipation.findMany({
    where: { jamId: jam.id },
    take: PAGE_SIZE + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'asc' },
    select: participationSelect
  })

  const hasMore = rows.length > PAGE_SIZE
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null }
}

export async function createTeam(app: FastifyInstance, slug: string, userId: string, name: string) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')
  if (jam.teamMode === 'SOLO_ONLY') throw new Error('TEAMS_NOT_ALLOWED')
  if (jam.status !== 'OPEN' && jam.status !== 'IN_PROGRESS') throw new Error('JAM_NOT_OPEN')

  const participation = await app.prisma.jamParticipation.findUnique({
    where: { userId_jamId: { userId, jamId: jam.id } }
  })
  if (!participation) throw new Error('NOT_PARTICIPATING')
  if (participation.teamId) throw new Error('ALREADY_IN_TEAM')

  const teamId = await app.prisma.$transaction(async (tx) => {
    const team = await tx.team.create({ data: { jamId: jam.id, name } })
    await tx.jamParticipation.update({
      where: { id: participation.id },
      data: { teamId: team.id }
    })
    return team.id
  })

  return app.prisma.team.findUnique({ where: { id: teamId }, select: teamSelect })
}

export async function listTeams(app: FastifyInstance, slug: string, cursor?: string) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')

  const rows = await app.prisma.team.findMany({
    where: { jamId: jam.id },
    take: PAGE_SIZE + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'asc' },
    select: teamSelect
  })

  const hasMore = rows.length > PAGE_SIZE
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null }
}

export async function joinTeam(app: FastifyInstance, slug: string, teamId: string, userId: string) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')
  if (jam.teamMode === 'SOLO_ONLY') throw new Error('TEAMS_NOT_ALLOWED')
  if (jam.status !== 'OPEN' && jam.status !== 'IN_PROGRESS') throw new Error('JAM_NOT_OPEN')

  const participation = await app.prisma.jamParticipation.findUnique({
    where: { userId_jamId: { userId, jamId: jam.id } }
  })
  if (!participation) throw new Error('NOT_PARTICIPATING')
  if (participation.teamId) throw new Error('ALREADY_IN_TEAM')

  const team = await app.prisma.team.findUnique({ where: { id: teamId } })
  if (!team || team.jamId !== jam.id) throw new Error('TEAM_NOT_FOUND')

  // Serializable so the size check + join can't race past maxTeamSize
  await app.prisma.$transaction(async (tx) => {
    if (jam.maxTeamSize) {
      const members = await tx.jamParticipation.count({ where: { teamId } })
      if (members >= jam.maxTeamSize) throw new Error('TEAM_FULL')
    }
    await tx.jamParticipation.update({
      where: { id: participation.id },
      data: { teamId }
    })
  }, { isolationLevel: 'Serializable' })

  return app.prisma.team.findUnique({ where: { id: teamId }, select: teamSelect })
}

export async function leaveTeam(app: FastifyInstance, slug: string, teamId: string, userId: string) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')

  const participation = await app.prisma.jamParticipation.findUnique({
    where: { userId_jamId: { userId, jamId: jam.id } }
  })
  if (!participation) throw new Error('NOT_PARTICIPATING')
  if (!participation.teamId || participation.teamId !== teamId) throw new Error('NOT_IN_TEAM')

  // Verify team belongs to this jam
  const team = await app.prisma.team.findUnique({ where: { id: teamId } })
  if (!team || team.jamId !== jam.id) throw new Error('TEAM_NOT_FOUND')

  // Can't abandon a team that already has a submission — it would orphan it
  const submission = await app.prisma.submission.findUnique({ where: { teamId } })
  if (submission) throw new Error('CANNOT_LEAVE_AFTER_SUBMISSION')

  await app.prisma.$transaction(async (tx) => {
    await tx.jamParticipation.update({
      where: { id: participation.id },
      data: { teamId: null }
    })
    // Clean up the team if this was its last member
    const remaining = await tx.jamParticipation.count({ where: { teamId } })
    if (remaining === 0) await tx.team.delete({ where: { id: teamId } })
  })
}
