import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import type { JamJobData } from './queue'
import { notifyMany } from './notifications'

const prisma = new PrismaClient()

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null
})

export function startJamWorker() {
  const worker = new Worker<JamJobData>(
    'jam',
    async (job) => {
      const { type, jamId } = job.data

      const jam = await prisma.jam.findUnique({
        where: { id: jamId },
        select: { id: true, slug: true, title: true, organizerId: true }
      })
      if (!jam) return

      const participantIds = await prisma.jamParticipation
        .findMany({ where: { jamId }, select: { userId: true } })
        .then((rows: { userId: string }[]) => rows.map(r => r.userId))

      switch (type) {
        case 'reveal-theme': {
          await prisma.jam.update({
            where: { id: jamId },
            data: { status: 'IN_PROGRESS', themeRevealed: true }
          })
          await notifyMany(prisma, participantIds, {
            type: 'JAM_STATUS_CHANGED',
            jamId: jam.id, jamSlug: jam.slug, jamTitle: jam.title, newStatus: 'IN_PROGRESS'
          }).catch(() => null)
          break
        }
        case 'open-voting': {
          await prisma.jam.update({
            where: { id: jamId },
            data: { status: 'VOTING' }
          })
          await notifyMany(prisma, participantIds, {
            type: 'JAM_VOTING_OPEN',
            jamId: jam.id, jamSlug: jam.slug, jamTitle: jam.title
          }).catch(() => null)
          break
        }
        case 'close-jam': {
          await prisma.jam.update({
            where: { id: jamId },
            data: { status: 'CLOSED' }
          })
          const allIds = [...new Set([...participantIds, jam.organizerId])]
          await notifyMany(prisma, allIds, {
            type: 'JAM_RESULTS_PUBLISHED',
            jamId: jam.id, jamSlug: jam.slug, jamTitle: jam.title
          }).catch(() => null)
          break
        }
      }
    },
    { connection }
  )

  worker.on('completed', (job) => {
    console.log(`[worker] Job ${job.name} (${job.id}) completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[worker] Job ${job?.name} failed:`, err.message)
  })

  return worker
}
