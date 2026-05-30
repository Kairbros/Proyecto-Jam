'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/contexts/LanguageContext'
import JamCard from '@/components/JamCard'
import { PlusIcon } from '@/components/Icons'
import type { Jam, JamStatus } from '@/types/jam'

const FILTER_VALUES: (JamStatus | '')[] = ['', 'OPEN', 'IN_PROGRESS', 'VOTING', 'CLOSED']

export default function JamsBrowsePage() {
  const t = useT()
  const { user } = useAuth()
  const [jams, setJams] = useState<Jam[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<JamStatus | ''>('')

  const filterLabels: Record<string, string> = {
    '': t.jams.all,
    OPEN: t.jams.open,
    IN_PROGRESS: t.jams.inProgress,
    VOTING: t.jams.voting,
    CLOSED: t.jams.closed,
  }

  useEffect(() => {
    setLoading(true)
    const params = filter ? `?status=${filter}` : ''
    api.get(`jams${params}`)
      .json<{ items: Jam[] }>()
      .then(res => setJams(res.items))
      .catch(() => setJams([]))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.jams.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.jams.subtitle}</p>
        </div>
        {user && (
          <Link href="/jams/new" className="btn-primary self-start sm:self-auto">
            <PlusIcon className="h-4 w-4" /> {t.jams.hostJam}
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-8 flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_VALUES.map(v => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`label-mono shrink-0 border px-3 py-1.5 transition ${
              filter === v
                ? 'border-violet-500 bg-violet-500/15 text-violet-600 dark:text-violet-300'
                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500 dark:hover:border-gray-700 dark:hover:text-white'
            }`}
          >
            {filterLabels[v]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800/60" />
          ))}
        </div>
      ) : jams.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 border border-gray-200 bg-gray-50 py-20 text-center dark:border-gray-800 dark:bg-gray-900/50">
          <p className="text-gray-500 dark:text-gray-400">{t.jams.noJams}</p>
          {filter && (
            <button onClick={() => setFilter('')} className="text-sm text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 transition">
              {t.jams.clearFilter}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {jams.map(jam => <JamCard key={jam.id} jam={jam} />)}
        </div>
      )}
    </div>
  )
}
