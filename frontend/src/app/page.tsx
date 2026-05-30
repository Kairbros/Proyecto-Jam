'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/contexts/LanguageContext'
import JamCard from '@/components/JamCard'
import { LogoMark } from '@/components/Icons'
import type { Jam } from '@/types/jam'

export default function HomePage() {
  const t = useT()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [jams, setJams] = useState<Jam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && user) router.replace('/feed')
  }, [authLoading, user, router])

  useEffect(() => {
    api.get('jams')
      .json<{ items: Jam[] }>()
      .then(res => setJams(res.items.slice(0, 6)))
      .catch(() => setJams([]))
      .finally(() => setLoading(false))
  }, [])

  if (authLoading || user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin border-2 border-violet-500 border-t-transparent" />
      </div>
    )
  }

  const [word1, word2, word3] = t.landing.headline.split('. ').map(s => s.replace('.', ''))

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="border-b border-gray-100 px-4 py-20 text-center dark:border-gray-800 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <LogoMark className="mx-auto mb-6 h-14 w-14" />
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-7xl">
            {word1}. <span className="text-violet-500">{word2}.</span> {word3}.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-500 dark:text-gray-400">
            {t.landing.subtitle}
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/register" className="btn-primary px-7 py-3 text-base">
              {t.landing.getStarted}
            </Link>
            <Link href="/jams" className="btn-ghost px-7 py-3 text-base">
              {t.landing.browseJams}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured jams */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.landing.featuredJams}</h2>
          <Link href="/jams" className="text-sm text-violet-500 transition hover:text-violet-600 dark:hover:text-violet-400">{t.landing.viewAll}</Link>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800/60" />
            ))}
          </div>
        ) : jams.length === 0 ? (
          <div className="border border-gray-200 bg-gray-50 py-16 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
            {t.landing.noJams}{' '}
            <Link href="/register" className="text-violet-500 hover:text-violet-600 dark:hover:text-violet-400">{t.landing.hostOne}</Link>.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {jams.map(jam => <JamCard key={jam.id} jam={jam} />)}
          </div>
        )}
      </section>
    </div>
  )
}
