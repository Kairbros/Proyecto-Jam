import { FastifyInstance } from 'fastify'
import type { CastVoteInput, UpdateVoteInput } from './votes.schema'

const voteSelect = {
  id: true, score: true, comment: true, createdAt: true, updatedAt: true,
  submission: { select: { id: true, title: true } },
  voter: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } }
}

export async function castVote(
  app: FastifyInstance,
  slug: string,
  voterId: string,
  input: CastVoteInput
) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')
  if (jam.status !== 'VOTING') throw new Error('VOTING_NOT_OPEN')

  const participation = await app.prisma.jamParticipation.findUnique({
    where: { userId_jamId: { userId: voterId, jamId: jam.id } }
  })
  if (!participation) throw new Error('NOT_PARTICIPATING')

  const submission = await app.prisma.submission.findUnique({
    where: { id: input.submissionId }
  })
  if (!submission || submission.jamId !== jam.id) throw new Error('SUBMISSION_NOT_FOUND')
  // Can't vote your own submission — nor your own team's submission
  if (submission.userId === voterId) throw new Error('CANNOT_VOTE_OWN')
  if (participation.teamId && submission.teamId === participation.teamId) throw new Error('CANNOT_VOTE_OWN')

  return app.prisma.vote.create({
    data: {
      jamId: jam.id,
      submissionId: input.submissionId,
      voterId,
      score: input.score,
      comment: input.comment
    },
    select: voteSelect
  })
}

export async function updateVote(
  app: FastifyInstance,
  slug: string,
  voterId: string,
  input: UpdateVoteInput
) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')
  if (jam.status !== 'VOTING') throw new Error('VOTING_NOT_OPEN')

  const vote = await app.prisma.vote.findUnique({
    where: { voterId_jamId: { voterId, jamId: jam.id } }
  })
  if (!vote) throw new Error('VOTE_NOT_FOUND')

  return app.prisma.vote.update({
    where: { id: vote.id },
    data: input,
    select: voteSelect
  })
}

export async function retractVote(app: FastifyInstance, slug: string, voterId: string) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')
  if (jam.status !== 'VOTING') throw new Error('VOTING_NOT_OPEN')

  const vote = await app.prisma.vote.findUnique({
    where: { voterId_jamId: { voterId, jamId: jam.id } }
  })
  if (!vote) throw new Error('VOTE_NOT_FOUND')

  await app.prisma.vote.delete({ where: { id: vote.id } })
}

export async function getMyVote(app: FastifyInstance, slug: string, voterId: string) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')

  return app.prisma.vote.findUnique({
    where: { voterId_jamId: { voterId, jamId: jam.id } },
    select: voteSelect
  })
}

export async function getResults(app: FastifyInstance, slug: string) {
  const jam = await app.prisma.jam.findUnique({ where: { slug } })
  if (!jam) throw new Error('JAM_NOT_FOUND')
  if (jam.status !== 'CLOSED') throw new Error('RESULTS_NOT_READY')

  const submissions = await app.prisma.submission.findMany({
    where: { jamId: jam.id },
    select: {
      id: true, title: true, description: true, fileUrl: true,
      externalUrl: true, createdAt: true,
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
      team: { select: { id: true, name: true } },
      screenshots: { select: { id: true, url: true, order: true }, orderBy: { order: 'asc' as const } },
      votes: { select: { score: true } }
    }
  })

  const ranked = submissions
    .map(s => {
      const voteCount = s.votes.length
      const avgScore = voteCount > 0
        ? s.votes.reduce((sum, v) => sum + v.score, 0) / voteCount
        : 0
      const { votes, ...rest } = s
      return { submission: rest, voteCount, avgScore }
    })
    .sort((a, b) => b.avgScore - a.avgScore || b.voteCount - a.voteCount)
    .map((item, i) => ({ rank: i + 1, ...item }))

  return { items: ranked }
}
