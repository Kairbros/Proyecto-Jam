'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, parseApiError } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/contexts/LanguageContext'
import type { Jam, TeamMode } from '@/types/jam'

function toLocalDatetime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const now = new Date()
const defaultStart   = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
const defaultEnd     = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
const defaultVoting  = new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000)

export default function NewJamPage() {
  const t = useT()
  const { user, accessToken, loading: authLoading } = useAuth()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [rules, setRules] = useState('')
  const [theme, setTheme] = useState('')
  const [teamMode, setTeamMode] = useState<TeamMode>('TEAMS_OPTIONAL')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [maxTeamSize, setMaxTeamSize] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [startAt, setStartAt] = useState(toLocalDatetime(defaultStart))
  const [submissionsEndAt, setSubmissionsEndAt] = useState(toLocalDatetime(defaultEnd))
  const [votingEndAt, setVotingEndAt] = useState(toLocalDatetime(defaultVoting))

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverPos, setCoverPos] = useState(50)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [authLoading, user, router])

  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview) }, [coverPreview])

  function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken) return
    setError(null)

    if (title.trim().length < 3) return setError(t.jamNew.errorTitleMin)
    if (description.trim().length < 10) return setError(t.jamNew.errorDescMin)
    if (!theme.trim()) return setError(t.jamNew.errorThemeRequired)
    const start = new Date(startAt), subEnd = new Date(submissionsEndAt), voteEnd = new Date(votingEndAt)
    if (start <= new Date()) return setError(t.jamNew.errorStartFuture)
    if (subEnd <= start) return setError(t.jamNew.errorSubAfterStart)
    if (voteEnd <= subEnd) return setError(t.jamNew.errorVoteAfterSub)

    setSubmitting(true)
    const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10)

    try {
      const jam = await api.post('jams', {
        json: {
          title: title.trim(),
          description: description.trim(),
          rules: rules.trim() || undefined,
          theme: theme.trim(),
          teamMode,
          maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : undefined,
          maxTeamSize: maxTeamSize ? parseInt(maxTeamSize, 10) : undefined,
          tags,
          startAt: new Date(startAt).toISOString(),
          submissionsEndAt: new Date(submissionsEndAt).toISOString(),
          votingEndAt: new Date(votingEndAt).toISOString(),
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<Jam>()

      if (coverFile) {
        try {
          const formData = new FormData()
          formData.append('file', coverFile)
          await api.post(`jams/${jam.slug}/cover?position=${coverPos}`, {
            body: formData,
            headers: { Authorization: `Bearer ${accessToken}` }
          })
        } catch { /* non-fatal */ }
      }

      router.push(`/jams/${jam.slug}`)
    } catch (err: unknown) {
      setError(await parseApiError(err, 'Could not create jam. Check your inputs and try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const teamModeOptions = [
    { value: 'SOLO_ONLY' as TeamMode, label: t.jamNew.soloOnly },
    { value: 'TEAMS_OPTIONAL' as TeamMode, label: t.jamNew.soloOrTeams },
    { value: 'TEAMS_ONLY' as TeamMode, label: t.jamNew.teamsOnly },
  ]

  const timelineFields = [
    { label: t.jamNew.jamStarts, value: startAt, setter: setStartAt, min: toLocalDatetime(now) },
    { label: t.jamNew.submissionsClose, value: submissionsEndAt, setter: setSubmissionsEndAt, min: startAt },
    { label: t.jamNew.votingEnds, value: votingEndAt, setter: setVotingEndAt, min: submissionsEndAt },
  ]

  if (authLoading) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/" className="text-sm text-gray-500 transition hover:text-gray-700 dark:hover:text-gray-300">{t.jamNew.breadcrumbJams}</Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{t.jamNew.breadcrumbNew}</span>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">{t.jamNew.title}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover image */}
        <div className="border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">{t.jamNew.coverImage}</h2>
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="relative block h-40 w-full overflow-hidden border border-gray-200 transition hover:border-violet-500/50 dark:border-gray-700 group"
          >
            {coverPreview
              ? <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" style={{ objectPosition: `center ${coverPos}%` }} />
              : <div className="h-full w-full bg-violet-900" />
            }
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
              <span className="text-sm font-medium text-white">{coverPreview ? t.jamNew.changeCover : t.jamNew.uploadCover}</span>
            </div>
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={onPickCover} />

          {coverPreview && (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">{t.jamNew.verticalPosition}</label>
                <span className="text-xs text-gray-500">{coverPos}%</span>
              </div>
              <input type="range" min={0} max={100} value={coverPos} onChange={e => setCoverPos(Number(e.target.value))} className="mt-1 w-full accent-violet-500" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-600">{t.jamNew.verticalHint}</p>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-600">{t.jamNew.coverHint}</p>
        </div>

        {/* Basic info */}
        <div className="border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{t.jamNew.basicInfo}</h2>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.titleField} <span className="text-red-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} minLength={3} maxLength={100} required
              className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              placeholder={t.jamNew.titlePlaceholder} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.description} <span className="text-red-500">*</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} minLength={10} maxLength={5000} required rows={4}
              className="w-full resize-none border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              placeholder={t.jamNew.descriptionPlaceholder} />
            <p className={`mt-1 text-xs ${description.trim().length > 0 && description.trim().length < 10 ? 'text-amber-500' : 'text-gray-500 dark:text-gray-600'}`}>
              {t.jamNew.descriptionMin} {description.trim().length > 0 && `(${description.trim().length})`}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.rules}</label>
            <textarea value={rules} onChange={e => setRules(e.target.value)} maxLength={5000} rows={3}
              className="w-full resize-none border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              placeholder={t.jamNew.rulesPlaceholder} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">
              {t.jamNew.theme} <span className="text-red-500">*</span>
              <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">{t.jamNew.themeHint}</span>
            </label>
            <input value={theme} onChange={e => setTheme(e.target.value)} maxLength={200} required
              className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              placeholder={t.jamNew.themePlaceholder} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.tags}</label>
            <input value={tagsInput} onChange={e => setTagsInput(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              placeholder={t.jamNew.tagsPlaceholder} />
            <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">{t.jamNew.tagsHint}</p>
          </div>
        </div>

        {/* Team settings */}
        <div className="border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{t.jamNew.teamSettings}</h2>

          <div>
            <label className="mb-2 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.teamMode}</label>
            <div className="grid grid-cols-3 gap-2">
              {teamModeOptions.map(opt => (
                <button key={opt.value} type="button" onClick={() => setTeamMode(opt.value)}
                  className={`px-3 py-2 text-sm font-medium transition border ${
                    teamMode === opt.value
                      ? 'border-violet-500 bg-violet-500/15 text-violet-600 dark:text-violet-300'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.maxParticipants}</label>
              <input type="number" min={2} value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)}
                className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                placeholder={t.jamNew.unlimited} />
            </div>
            {teamMode !== 'SOLO_ONLY' && (
              <div>
                <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.maxTeamSize}</label>
                <input type="number" min={2} max={10} value={maxTeamSize} onChange={e => setMaxTeamSize(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  placeholder={t.jamNew.noLimit} />
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{t.jamNew.timeline}</h2>

          {timelineFields.map(({ label, value, setter, min }) => (
            <div key={label}>
              <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{label} <span className="text-red-500">*</span></label>
              <input type="datetime-local" value={value} min={min} onChange={e => setter(e.target.value)} required
                className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white [color-scheme:dark]" />
            </div>
          ))}
        </div>

        {error && (
          <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-8 transition">
            {submitting ? t.jamNew.creating : t.jamNew.createDraft}
          </button>
          <Link href="/" className="text-sm text-gray-500 transition hover:text-gray-700 dark:hover:text-gray-300">{t.jamNew.cancel}</Link>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-600">{t.jamNew.draftHint}</p>
      </form>
    </div>
  )
}
