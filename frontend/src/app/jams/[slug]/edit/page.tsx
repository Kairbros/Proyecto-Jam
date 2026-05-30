'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/contexts/LanguageContext'
import { coverObjectPosition } from '@/lib/cover'
import type { Jam, TeamMode } from '@/types/jam'

function toLocalDatetime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditJamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const t = useT()
  const { user, accessToken, loading: authLoading } = useAuth()
  const router = useRouter()

  const [jam, setJam] = useState<Jam | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [forbidden, setForbidden] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [rules, setRules] = useState('')
  const [theme, setTheme] = useState('')
  const [teamMode, setTeamMode] = useState<TeamMode>('TEAMS_OPTIONAL')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [maxTeamSize, setMaxTeamSize] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [startAt, setStartAt] = useState('')
  const [submissionsEndAt, setSubmissionsEndAt] = useState('')
  const [votingEndAt, setVotingEndAt] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverPos, setCoverPos] = useState(50)
  const [pendingCover, setPendingCover] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    api.get(`jams/${slug}`)
      .json<Jam>()
      .then(data => {
        if (data.status !== 'DRAFT') { setForbidden(true); return }
        setJam(data)
        setTitle(data.title)
        setDescription(data.description)
        setRules(data.rules ?? '')
        setTheme(data.theme ?? '')
        setTeamMode(data.teamMode)
        setMaxParticipants(data.maxParticipants ? String(data.maxParticipants) : '')
        setMaxTeamSize(data.maxTeamSize ? String(data.maxTeamSize) : '')
        setTagsInput(data.tags.join(', '))
        setStartAt(toLocalDatetime(data.startAt))
        setSubmissionsEndAt(toLocalDatetime(data.submissionsEndAt))
        setVotingEndAt(toLocalDatetime(data.votingEndAt))
        setCoverUrl(data.coverUrl ?? null)
        const m = data.coverUrl?.match(/[?&]pos=(\d+)/)
        if (m) setCoverPos(Number(m[1]))
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingCover(file)
    setPendingPreview(URL.createObjectURL(file))
    setCoverPos(50)
    e.target.value = ''
  }

  async function handleSaveCover() {
    if (!pendingCover || !accessToken) return
    setUploadingCover(true)
    setSaveError(null)
    try {
      const formData = new FormData()
      formData.append('file', pendingCover)
      const res = await api.post(`jams/${slug}/cover?position=${coverPos}`, {
        body: formData,
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<{ coverUrl: string }>()
      setCoverUrl(res.coverUrl)
      if (pendingPreview) URL.revokeObjectURL(pendingPreview)
      setPendingCover(null)
      setPendingPreview(null)
    } catch {
      setSaveError('Could not upload cover image (max 5MB).')
    } finally {
      setUploadingCover(false)
    }
  }

  function cancelPendingCover() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingCover(null)
    setPendingPreview(null)
  }

  useEffect(() => {
    if (!loading && jam && user && jam.organizer.id !== user.id) {
      setForbidden(true)
    }
  }, [loading, jam, user])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken) return
    setSaving(true)
    setSaveError(null)

    const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10)

    try {
      const updated = await api.patch(`jams/${slug}`, {
        json: {
          title: title.trim(),
          description: description.trim(),
          rules: rules.trim() || undefined,
          theme: theme.trim(),
          teamMode,
          maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
          maxTeamSize: maxTeamSize ? parseInt(maxTeamSize, 10) : null,
          tags,
          startAt: new Date(startAt).toISOString(),
          submissionsEndAt: new Date(submissionsEndAt).toISOString(),
          votingEndAt: new Date(votingEndAt).toISOString(),
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<Jam>()
      setJam(updated)
      router.push(`/jams/${updated.slug}`)
    } catch {
      setSaveError(t.jamEdit.errorSave)
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!accessToken) return
    setPublishing(true)
    try {
      await api.post(`jams/${slug}/publish`, { headers: { Authorization: `Bearer ${accessToken}` } })
      router.push(`/jams/${slug}`)
    } catch {
      setSaveError(t.jamEdit.errorPublish)
    } finally {
      setPublishing(false)
    }
  }

  async function handleDelete() {
    if (!accessToken) return
    setDeleting(true)
    try {
      await api.delete(`jams/${slug}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      router.push('/')
    } catch {
      setSaveError(t.jamEdit.errorDelete)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const teamModeOptions = [
    { value: 'SOLO_ONLY' as TeamMode, label: t.jamNew.soloOnly },
    { value: 'TEAMS_OPTIONAL' as TeamMode, label: t.jamNew.soloOrTeams },
    { value: 'TEAMS_ONLY' as TeamMode, label: t.jamNew.teamsOnly },
  ]

  const timelineFields = [
    { label: t.jamNew.jamStarts, value: startAt, setter: setStartAt },
    { label: t.jamNew.submissionsClose, value: submissionsEndAt, setter: setSubmissionsEndAt },
    { label: t.jamNew.votingEnds, value: votingEndAt, setter: setVotingEndAt },
  ]

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse bg-gray-200 dark:bg-gray-800/60" />
        ))}
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t.jamEdit.notFound}</h1>
        <Link href="/" className="text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300">{t.jamEdit.backHome}</Link>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t.jamEdit.notAllowed}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t.jamEdit.notAllowedDesc}</p>
        <Link href={`/jams/${slug}`} className="text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300">{t.jamEdit.backToJam}</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/jams/${slug}`} className="text-sm text-gray-500 transition hover:text-gray-700 dark:hover:text-gray-300">← {jam?.title}</Link>
          <span className="text-gray-400">/</span>
          <span className="text-sm text-gray-400">{t.jamEdit.breadcrumbEdit}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePublish} disabled={publishing}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 transition">
            {publishing ? t.jamEdit.publishing : t.jamEdit.publishJam}
          </button>
          <button onClick={() => setShowDeleteConfirm(true)}
            className="border border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-500 text-sm px-4 py-1.5 transition dark:border-gray-800 dark:hover:border-red-500/50 dark:hover:text-red-400">
            {t.jamEdit.delete}
          </button>
        </div>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">{t.jamEdit.title}</h1>

      {/* Cover image */}
      <div className="mb-6 border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">{t.jamNew.coverImage}</h2>

        {pendingCover ? (
          <>
            <div className="h-40 w-full overflow-hidden border border-gray-200 dark:border-gray-700">
              <img src={pendingPreview!} alt="Cover preview" className="h-full w-full object-cover" style={{ objectPosition: `center ${coverPos}%` }} />
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">{t.jamNew.verticalPosition}</label>
                <span className="text-xs text-gray-500">{coverPos}%</span>
              </div>
              <input type="range" min={0} max={100} value={coverPos} onChange={e => setCoverPos(Number(e.target.value))} className="mt-1 w-full accent-violet-500" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-600">{t.jamNew.verticalHint}</p>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={handleSaveCover} disabled={uploadingCover}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-1.5 text-sm font-medium text-white transition">
                {uploadingCover ? t.jamEdit.savingCover : t.jamEdit.saveCover}
              </button>
              <button type="button" onClick={cancelPendingCover}
                className="border border-gray-200 px-4 py-1.5 text-sm text-gray-500 transition hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white">
                {t.jamEdit.cancel}
              </button>
            </div>
          </>
        ) : (
          <label className="relative block h-40 w-full cursor-pointer overflow-hidden border border-gray-200 transition hover:border-violet-500/50 dark:border-gray-700 group">
            {coverUrl
              ? <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" style={{ objectPosition: coverObjectPosition(coverUrl) }} />
              : <div className="h-full w-full bg-violet-900" />
            }
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
              <span className="text-sm font-medium text-white">{coverUrl ? t.jamNew.changeCover : t.jamNew.uploadCover}</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={onPickCover} />
          </label>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-600">{t.jamEdit.coverHint}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic info */}
        <div className="border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{t.jamNew.basicInfo}</h2>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.titleField} <span className="text-red-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required
              className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.description} <span className="text-red-500">*</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={5000} required rows={4}
              className="w-full resize-none border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.rules}</label>
            <textarea value={rules} onChange={e => setRules(e.target.value)} maxLength={5000} rows={3}
              className="w-full resize-none border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.theme} <span className="text-red-500">*</span></label>
            <input value={theme} onChange={e => setTheme(e.target.value)} maxLength={200} required
              className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.jamNew.tags}</label>
            <input value={tagsInput} onChange={e => setTagsInput(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              placeholder={t.jamEdit.commaSeparated} />
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

          {timelineFields.map(({ label, value, setter }) => (
            <div key={label}>
              <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{label}</label>
              <input type="datetime-local" value={value} onChange={e => setter(e.target.value)} required
                className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white [color-scheme:dark]" />
            </div>
          ))}
        </div>

        {saveError && (
          <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{saveError}</p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-2.5 px-8 transition">
            {saving ? t.jamEdit.saving : t.jamEdit.saveChanges}
          </button>
          <Link href={`/jams/${slug}`} className="text-sm text-gray-500 transition hover:text-gray-700 dark:hover:text-gray-300">{t.jamEdit.cancel}</Link>
        </div>
      </form>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t.jamEdit.deleteDialog}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{t.jamEdit.deleteDialogDesc}</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-2 transition">
                {deleting ? t.jamEdit.deleting : t.jamEdit.deleteJam}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border border-gray-200 text-gray-600 hover:text-gray-900 py-2 transition dark:border-gray-700 dark:text-gray-300 dark:hover:text-white">
                {t.jamEdit.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
