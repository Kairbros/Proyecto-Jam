'use client'
import Link from 'next/link'
import { UsersIcon } from '@/components/Icons'
import { useT } from '@/contexts/LanguageContext'
import { coverObjectPosition } from '@/lib/cover'
import type { Jam } from '@/types/jam'

const STATUS_STYLES: Record<string, string> = {
  DRAFT:       'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  OPEN:        'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  IN_PROGRESS: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300',
  VOTING:      'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  CLOSED:      'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
  SUBMISSIONS: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300',
}

const FALLBACK_COLORS = [
  'bg-violet-900',
  'bg-slate-700',
  'bg-teal-800',
  'bg-amber-800',
  'bg-indigo-800',
]

function pickColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function JamCard({ jam }: { jam: Jam }) {
  const t = useT()
  const fallbackColor = pickColor(jam.id)

  const STATUS_LABELS: Record<string, string> = {
    DRAFT:       t.jams.draft,
    OPEN:        t.jams.open,
    IN_PROGRESS: t.jams.inProgressLabel,
    VOTING:      t.jams.voting,
    CLOSED:      t.jams.closed,
    SUBMISSIONS: t.jams.submissions,
  }

  return (
    <Link
      href={`/jams/${jam.slug}`}
      className="card-hover group block border border-gray-200 bg-gray-50 overflow-hidden dark:border-gray-800 dark:bg-gray-900"
    >
      {/* ── Top info section ── */}
      <div className="px-4 pt-4 pb-3">

        {/* Row: status + dots / participant count */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className={`label-mono px-2 py-1 ${STATUS_STYLES[jam.status] ?? ''}`}>
              {STATUS_LABELS[jam.status] ?? jam.status}
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-sm font-bold text-gray-700 dark:text-gray-300">
            <UsersIcon className="h-3.5 w-3.5" />
            <span>{jam._count.participants}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black uppercase leading-none tracking-tight text-gray-900 line-clamp-2 transition group-hover:text-violet-500 dark:text-white">
          {jam.title}
        </h3>

        {/* Tematica bar */}
        {jam.themeRevealed && jam.theme && (
          <div className="mt-3 bg-gray-800 px-3 py-2 dark:bg-gray-950">
            <p className="label-mono truncate text-gray-100">
              {t.jams.tematica}&nbsp;&nbsp;<span className="text-gray-300">{jam.theme.toUpperCase()}</span>
            </p>
          </div>
        )}
      </div>

      {/* ── Cover section ── */}
      <div>
        <div className={`relative h-44 ${fallbackColor} overflow-hidden`}>
          {jam.coverUrl && (
            <img
              src={jam.coverUrl}
              alt={jam.title}
              style={{ objectPosition: coverObjectPosition(jam.coverUrl) }}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-black/65 px-3 py-2.5">
            <p className="font-mono text-[11px] leading-relaxed text-gray-200 line-clamp-2">
              {jam.description}
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
        <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
          {t.jams.by} <span className="font-semibold text-gray-700 dark:text-gray-300">{jam.organizer.displayName}</span>
        </span>
        <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500">
          {t.jams.starts} {formatDate(jam.startAt)}
        </span>
      </div>
    </Link>
  )
}
