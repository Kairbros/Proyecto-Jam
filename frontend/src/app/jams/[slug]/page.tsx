'use client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/contexts/LanguageContext'
import Avatar from '@/components/Avatar'
import { GamepadIcon, DocumentIcon } from '@/components/Icons'
import { coverObjectPosition } from '@/lib/cover'
import type { Jam, Participant, Team, Submission, Vote, Result } from '@/types/jam'
import type { Translations } from '@/i18n/en'

const STATUS_STYLES: Record<string, string> = {
  DRAFT:       'bg-gray-500/15 text-gray-400 border border-gray-500/25',
  OPEN:        'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  IN_PROGRESS: 'bg-violet-500/15 text-violet-400 border border-violet-500/25',
  SUBMISSIONS: 'bg-sky-500/15 text-sky-400 border border-sky-500/25',
  VOTING:      'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  CLOSED:      'bg-gray-500/15 text-gray-400 border border-gray-500/25',
}

const COVER_GRADIENTS = [
  'from-violet-900 to-indigo-950',
  'from-rose-900 to-pink-950',
  'from-cyan-900 to-blue-950',
  'from-emerald-900 to-teal-950',
  'from-amber-900 to-orange-950',
]

function pickGradient(id: string = '') {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length]
}

type Tab = 'overview' | 'teams' | 'submissions' | 'results'

export default function JamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const t = useT()
  const { user, accessToken } = useAuth()
  const router = useRouter()

  const [jam, setJam] = useState<Jam | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')

  const [participating, setParticipating] = useState(false)
  const [myTeamId, setMyTeamId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoaded, setTeamsLoaded] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [teamActionLoading, setTeamActionLoading] = useState<string | null>(null)

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false)
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [submitTitle, setSubmitTitle] = useState('')
  const [submitDesc, setSubmitDesc] = useState('')
  const [submitUrl, setSubmitUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [myVote, setMyVote] = useState<{ submissionId: string; score: number; comment: string } | null>(null)
  const [voteLoading, setVoteLoading] = useState(false)
  const [showVoteForm, setShowVoteForm] = useState<string | null>(null)
  const [voteScore, setVoteScore] = useState(5)
  const [voteComment, setVoteComment] = useState('')

  const [results, setResults] = useState<Result[]>([])
  const [resultsLoaded, setResultsLoaded] = useState(false)

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const [publishing, setPublishing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingJam, setDeletingJam] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const [showEditSub, setShowEditSub] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [savingSub, setSavingSub] = useState(false)
  const [deletingSub, setDeletingSub] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadingShot, setUploadingShot] = useState(false)
  const [subError, setSubError] = useState<string | null>(null)

  useEffect(() => {
    api.get(`jams/${slug}`)
      .json<Jam>()
      .then(data => setJam(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!jam) return
    if (!user) {
      setParticipating(false)
      setMyTeamId(null)
      setMyVote(null)
      setMySubmission(null)
      return
    }
    api.get(`jams/${slug}/participants`)
      .json<{ items: Participant[] }>()
      .then(({ items }) => {
        const mine = items.find(p => p.user.id === user.id)
        setParticipating(!!mine)
        setMyTeamId(mine?.team?.id ?? null)
      })
      .catch(() => {})
  }, [jam?.id, user?.id, slug])

  useEffect(() => {
    if (tab !== 'teams' || !jam || teamsLoaded) return
    api.get(`jams/${slug}/teams`)
      .json<{ items: Team[] }>()
      .then(({ items }) => { setTeams(items); setTeamsLoaded(true) })
      .catch(() => setTeamsLoaded(true))
  }, [tab, jam?.id, slug, teamsLoaded])

  useEffect(() => {
    if (tab !== 'submissions' || !jam || submissionsLoaded) return
    api.get(`jams/${slug}/submissions`)
      .json<{ items: Submission[] }>()
      .then(({ items }) => {
        setSubmissions(items)
        setSubmissionsLoaded(true)
        if (user) {
          const mine = items.find(s => s.user.id === user.id) ??
            (myTeamId ? items.find(s => s.team?.id === myTeamId) : undefined)
          setMySubmission(mine ?? null)
        }
      })
      .catch(() => setSubmissionsLoaded(true))
  }, [tab, jam?.id, slug, submissionsLoaded, user?.id, myTeamId])

  useEffect(() => {
    if (tab !== 'submissions' || !jam || jam.status !== 'VOTING' || !accessToken) return
    api.get(`jams/${slug}/votes/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .json<Vote>()
      .then(vote => {
        if (vote) setMyVote({ submissionId: vote.submission.id, score: vote.score, comment: vote.comment ?? '' })
      })
      .catch(() => {})
  }, [tab, jam?.status, slug, accessToken])

  useEffect(() => {
    if (tab !== 'results' || !jam || resultsLoaded) return
    api.get(`jams/${slug}/results`)
      .json<{ items: Result[] }>()
      .then(({ items }) => { setResults(items); setResultsLoaded(true) })
      .catch(() => setResultsLoaded(true))
  }, [tab, jam?.id, slug, resultsLoaded])

  async function handleJoin() {
    if (!accessToken) { router.push('/login'); return }
    setActionLoading(true); setActionError(null)
    try {
      await api.post(`jams/${slug}/join`, { headers: { Authorization: `Bearer ${accessToken}` } })
      setParticipating(true)
      setJam(p => p ? { ...p, _count: { ...p._count, participants: p._count.participants + 1 } } : p)
    } catch (err: unknown) {
      const body = err && typeof err === 'object' && 'response' in err
        ? await (err as { response: Response }).response.json().catch(() => null)
        : null
      const msg = body?.error ?? ''
      if (msg === 'JAM_FULL') setActionError('This jam is full.')
      else if (msg === 'ALREADY_PARTICIPATING') setActionError('You are already in this jam.')
      else setActionError('Could not join the jam.')
    } finally { setActionLoading(false) }
  }

  async function handleLeave() {
    if (!accessToken) return
    setActionLoading(true); setActionError(null)
    try {
      await api.delete(`jams/${slug}/join`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (myTeamId && user) {
        setTeams(prev => prev
          .map(tm => tm.id === myTeamId
            ? { ...tm, _count: { members: Math.max(0, tm._count.members - 1) }, members: tm.members.filter(m => m.user.id !== user.id) }
            : tm
          )
          .filter(tm => tm.id !== myTeamId || tm._count.members > 0)
        )
      }
      setParticipating(false)
      setMyTeamId(null)
      setJam(p => p ? { ...p, _count: { ...p._count, participants: Math.max(0, p._count.participants - 1) } } : p)
    } catch {
      setActionError('Cannot leave after submitting a game.')
    } finally { setActionLoading(false) }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken || !newTeamName.trim()) return
    setCreatingTeam(true)
    try {
      const team = await api.post(`jams/${slug}/teams`, {
        json: { name: newTeamName.trim() },
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<Team>()
      setTeams(prev => [team, ...prev])
      setMyTeamId(team.id)
      setNewTeamName('')
    } catch { /* silently fail */ } finally { setCreatingTeam(false) }
  }

  async function handleJoinTeam(teamId: string) {
    if (!accessToken || !user) return
    setTeamActionLoading(teamId)
    try {
      await api.post(`jams/${slug}/teams/${teamId}/join`, { headers: { Authorization: `Bearer ${accessToken}` } })
      const me = { user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl } }
      setMyTeamId(teamId)
      setTeams(prev => prev.map(tm => tm.id === teamId
        ? { ...tm, _count: { members: tm._count.members + 1 }, members: tm.members.some(m => m.user.id === user.id) ? tm.members : [...tm.members, me] }
        : tm
      ))
    } catch { /* silently fail */ } finally { setTeamActionLoading(null) }
  }

  async function handleLeaveTeam() {
    if (!accessToken || !myTeamId || !user) return
    setTeamActionLoading(myTeamId)
    try {
      await api.delete(`jams/${slug}/teams/${myTeamId}/join`, { headers: { Authorization: `Bearer ${accessToken}` } })
      setTeams(prev => prev
        .map(tm => tm.id === myTeamId
          ? { ...tm, _count: { members: Math.max(0, tm._count.members - 1) }, members: tm.members.filter(m => m.user.id !== user.id) }
          : tm
        )
        .filter(tm => tm.id !== myTeamId || tm._count.members > 0)
      )
      setMyTeamId(null)
    } catch { /* silently fail */ } finally { setTeamActionLoading(null) }
  }

  async function handleCreateSubmission(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken || !submitTitle.trim() || !submitDesc.trim()) return
    setSubmitting(true)
    try {
      const sub = await api.post(`jams/${slug}/submissions`, {
        json: { title: submitTitle.trim(), description: submitDesc.trim(), externalUrl: submitUrl.trim() || undefined },
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<Submission>()
      setMySubmission(sub)
      setSubmissions(prev => [sub, ...prev])
      setJam(p => p ? { ...p, _count: { ...p._count, submissions: p._count.submissions + 1 } } : p)
      setShowSubmitForm(false)
      setSubmitTitle(''); setSubmitDesc(''); setSubmitUrl('')
    } catch { /* silently fail */ } finally { setSubmitting(false) }
  }

  async function handleCastVote(submissionId: string) {
    if (!accessToken) return
    setVoteLoading(true)
    try {
      const v = await api.post(`jams/${slug}/votes`, {
        json: { submissionId, score: voteScore, comment: voteComment.trim() || undefined },
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<Vote>()
      setMyVote({ submissionId: v.submission.id, score: v.score, comment: v.comment ?? '' })
      setShowVoteForm(null)
    } catch { /* silently fail */ } finally { setVoteLoading(false) }
  }

  async function handleUpdateVote() {
    if (!accessToken || !myVote) return
    setVoteLoading(true)
    try {
      const v = await api.patch(`jams/${slug}/votes`, {
        json: { score: voteScore, comment: voteComment.trim() || undefined },
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<Vote>()
      setMyVote({ submissionId: v.submission.id, score: v.score, comment: v.comment ?? '' })
      setShowVoteForm(null)
    } catch { /* silently fail */ } finally { setVoteLoading(false) }
  }

  async function handleRetractVote() {
    if (!accessToken) return
    setVoteLoading(true)
    try {
      await api.delete(`jams/${slug}/votes`, { headers: { Authorization: `Bearer ${accessToken}` } })
      setMyVote(null)
    } catch { /* silently fail */ } finally { setVoteLoading(false) }
  }

  function openVoteForm(sub: Submission) {
    if (myVote?.submissionId === sub.id) {
      setVoteScore(myVote.score)
      setVoteComment(myVote.comment)
    } else {
      setVoteScore(5)
      setVoteComment('')
    }
    setShowVoteForm(sub.id)
  }

  async function handlePublish() {
    if (!accessToken) return
    setPublishing(true); setDraftError(null)
    try {
      const updated = await api.post(`jams/${slug}/publish`, { headers: { Authorization: `Bearer ${accessToken}` } }).json<Jam>()
      setJam(updated)
    } catch (err: unknown) {
      const body = err && typeof err === 'object' && 'response' in err
        ? await (err as { response: Response }).response.json().catch(() => null)
        : null
      setDraftError(body?.error ?? t.jamDetail.draftNotice)
    } finally { setPublishing(false) }
  }

  async function handleDeleteJam() {
    if (!accessToken) return
    setDeletingJam(true)
    try {
      await api.delete(`jams/${slug}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      router.push('/')
    } catch {
      setDraftError(t.jamDetail.deleteJam)
      setDeletingJam(false)
      setShowDeleteConfirm(false)
    }
  }

  async function handleCancelJam() {
    if (!accessToken) return
    setCancelling(true)
    try {
      const updated = await api.post(`jams/${slug}/cancel`, { headers: { Authorization: `Bearer ${accessToken}` } }).json<Jam>()
      setJam(updated)
      setShowCancelConfirm(false)
    } catch { /* silently fail */ } finally { setCancelling(false) }
  }

  function openEditSub() {
    if (!mySubmission) return
    setEditTitle(mySubmission.title)
    setEditDesc(mySubmission.description ?? '')
    setEditUrl(mySubmission.externalUrl ?? '')
    setSubError(null)
    setShowEditSub(true)
  }

  async function handleSaveSub() {
    if (!accessToken || !mySubmission) return
    setSavingSub(true); setSubError(null)
    try {
      const updated = await api.patch(`jams/${slug}/submissions/${mySubmission.id}`, {
        json: { title: editTitle.trim(), description: editDesc.trim(), externalUrl: editUrl.trim() || null },
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<Submission>()
      setMySubmission(updated)
      setSubmissions(prev => prev.map(s => s.id === updated.id ? updated : s))
      setShowEditSub(false)
    } catch { setSubError('Could not save changes.') } finally { setSavingSub(false) }
  }

  async function handleDeleteSub() {
    if (!accessToken || !mySubmission) return
    setDeletingSub(true)
    try {
      await api.delete(`jams/${slug}/submissions/${mySubmission.id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      setSubmissions(prev => prev.filter(s => s.id !== mySubmission.id))
      setMySubmission(null)
      setJam(p => p ? { ...p, _count: { ...p._count, submissions: Math.max(0, p._count.submissions - 1) } } : p)
    } catch { setSubError('Could not delete submission.') } finally { setDeletingSub(false) }
  }

  async function handleUploadGameFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !accessToken || !mySubmission) return
    setUploadingFile(true); setSubError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post(`jams/${slug}/submissions/${mySubmission.id}/file`, {
        body: formData, headers: { Authorization: `Bearer ${accessToken}` }, timeout: false,
      }).json<{ fileUrl: string; fileSizeBytes: number }>()
      setMySubmission(prev => prev ? { ...prev, fileUrl: res.fileUrl, fileSizeBytes: res.fileSizeBytes } : prev)
    } catch { setSubError('Could not upload file.') } finally { setUploadingFile(false); e.target.value = '' }
  }

  async function handleUploadScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !accessToken || !mySubmission) return
    setUploadingShot(true); setSubError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const shot = await api.post(`jams/${slug}/submissions/${mySubmission.id}/screenshots`, {
        body: formData, headers: { Authorization: `Bearer ${accessToken}` }
      }).json<{ id: string; url: string; order: number }>()
      setMySubmission(prev => prev ? { ...prev, screenshots: [...prev.screenshots, shot] } : prev)
    } catch { setSubError('Could not upload screenshot (max 5, 10MB each).') } finally { setUploadingShot(false); e.target.value = '' }
  }

  const statusLabels: Record<string, string> = {
    DRAFT:       t.jamDetail.statusDraft,
    OPEN:        t.jamDetail.statusOpen,
    IN_PROGRESS: t.jamDetail.statusInProgress,
    SUBMISSIONS: t.jamDetail.statusSubmissions,
    VOTING:      t.jamDetail.statusVoting,
    CLOSED:      t.jamDetail.statusClosed,
  }

  const teamModeLabels: Record<string, string> = {
    SOLO_ONLY:      t.jamDetail.soloOnly,
    TEAMS_OPTIONAL: t.jamDetail.soloOrTeams,
    TEAMS_ONLY:     t.jamDetail.teamsRequired,
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="h-64 animate-pulse bg-gray-200 dark:bg-gray-800/60" />
        <div className="mt-8 space-y-4">
          <div className="h-8 w-2/3 animate-pulse bg-gray-200 dark:bg-gray-800/60" />
          <div className="h-4 w-full animate-pulse bg-gray-200 dark:bg-gray-800/60" />
        </div>
      </div>
    )
  }

  if (notFound || !jam) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <GamepadIcon className="h-12 w-12 text-gray-400 dark:text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t.jamDetail.notFound}</h1>
        <Link href="/jams" className="text-violet-500 transition hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300">{t.jamDetail.back}</Link>
      </div>
    )
  }

  const gradient = pickGradient(jam.id)
  const isOrganizer = user?.id === jam.organizer.id
  const canJoin = (jam.status === 'OPEN' || jam.status === 'IN_PROGRESS') && !isOrganizer
  const showTeamsTab = jam.teamMode !== 'SOLO_ONLY'
  const showSubmissionsTab = ['IN_PROGRESS', 'SUBMISSIONS', 'VOTING', 'CLOSED'].includes(jam.status)
  const showResultsTab = jam.status === 'CLOSED'

  const availableTabs = [
    { id: 'overview' as Tab, label: t.jamDetail.overview },
    ...(showTeamsTab ? [{ id: 'teams' as Tab, label: t.jamDetail.teams }] : []),
    ...(showSubmissionsTab ? [{ id: 'submissions' as Tab, label: jam.status === 'VOTING' ? t.jamDetail.voting : t.jamDetail.submissionsTab }] : []),
    ...(showResultsTab ? [{ id: 'results' as Tab, label: t.jamDetail.results }] : []),
  ]

  return (
    <div className="min-h-screen">
      {/* Cover */}
      <div className={`relative h-56 w-full bg-gradient-to-br ${gradient} sm:h-72`}>
        {jam.coverUrl && (
          <img src={jam.coverUrl} alt={jam.title} style={{ objectPosition: coverObjectPosition(jam.coverUrl) }} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header */}
        <div className="-mt-20 relative mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3">
              <span className={`label-mono w-fit rounded-md px-2.5 py-1 ${STATUS_STYLES[jam.status] ?? ''}`}>
                {statusLabels[jam.status] ?? jam.status}
              </span>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{jam.title}</h1>
              <div className="flex items-center gap-2">
                <Avatar name={jam.organizer.displayName} src={jam.organizer.avatarUrl} size="xs" />
                <span className="text-sm text-gray-400">
                  {t.jamDetail.by} <Link href={`/users/${jam.organizer.username}`} className="text-gray-300 hover:text-violet-300 transition">{jam.organizer.displayName}</Link>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              {isOrganizer ? (
                <div className="flex gap-2">
                  {jam.status !== 'DRAFT' && jam.status !== 'CLOSED' && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="rounded-xl border border-gray-700 px-5 py-2 text-sm font-medium text-gray-400 hover:border-red-500/50 hover:text-red-400 transition">
                      {t.jamDetail.cancelJam}
                    </button>
                  )}
                </div>
              ) : user ? (
                canJoin ? (
                  <button
                    onClick={participating ? handleLeave : handleJoin}
                    disabled={actionLoading}
                    className={`rounded-xl px-6 py-2.5 font-medium transition disabled:opacity-50 ${
                      participating
                        ? 'border border-gray-700 text-gray-300 hover:border-red-500/50 hover:text-red-400'
                        : 'bg-violet-600 text-white hover:bg-violet-500'
                    }`}
                  >
                    {actionLoading ? '…' : participating ? t.jamDetail.leaveJam : t.jamDetail.joinJam}
                  </button>
                ) : null
              ) : (
                <Link href="/login" className="rounded-xl bg-violet-600 px-6 py-2.5 text-center font-medium text-white hover:bg-violet-500 transition">
                  {t.jamDetail.signInJoin}
                </Link>
              )}
              {actionError && <p className="text-xs text-red-400">{actionError}</p>}
            </div>
          </div>
        </div>

        {/* Draft banner */}
        {isOrganizer && jam.status === 'DRAFT' && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <DocumentIcon className="h-6 w-6 shrink-0 text-amber-400" />
                <div>
                  <h3 className="font-semibold text-white">{t.jamDetail.draftNotice}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{t.jamDetail.draftNoticeDesc}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={handlePublish} disabled={publishing}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition">
                  {publishing ? t.jamDetail.publishing : t.jamDetail.publishJam}
                </button>
                <Link href={`/jams/${slug}/edit`}
                  className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:border-violet-500 hover:text-white transition">
                  {t.common.edit}
                </Link>
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-xl border border-gray-800 px-4 py-2.5 text-sm text-gray-500 hover:border-red-500/50 hover:text-red-400 transition">
                  {t.common.delete}
                </button>
              </div>
            </div>
            {draftError && <p className="mt-3 text-sm text-red-400">{draftError}</p>}
          </div>
        )}

        {/* Tab bar */}
        {availableTabs.length > 1 && (
          <div className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
            {availableTabs.map(tabItem => (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`-mb-px border-b-2 px-4 pb-3 text-sm font-medium transition ${
                  tab === tabItem.id
                    ? 'border-violet-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tabItem.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* ── Overview ── */}
            {tab === 'overview' && (
              <div className="space-y-8">
                <section>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">{t.jamDetail.about}</h2>
                  <p className="leading-relaxed whitespace-pre-line text-gray-600 dark:text-gray-300">{jam.description}</p>
                </section>

                {jam.rules && (
                  <section>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">{t.jamDetail.rules}</h2>
                    <div className="border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
                      <p className="text-sm leading-relaxed whitespace-pre-line text-gray-600 dark:text-gray-300">{jam.rules}</p>
                    </div>
                  </section>
                )}

                {jam.themeRevealed && jam.theme && (
                  <section>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">{t.jamDetail.theme}</h2>
                    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-6 py-5 text-center">
                      <p className="text-2xl font-bold text-violet-300">{jam.theme}</p>
                    </div>
                  </section>
                )}

                {!jam.themeRevealed && isOrganizer && jam.theme && (
                  <section>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">{t.jamDetail.themeOrganizer}</h2>
                    <div className="rounded-xl border border-gray-700 bg-gray-900/50 px-6 py-5">
                      <p className="text-lg font-semibold text-gray-300">{jam.theme}</p>
                      <p className="text-xs text-gray-600 mt-1">{t.jamDetail.themeHidden}</p>
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* ── Teams ── */}
            {tab === 'teams' && (
              <div className="space-y-5">
                {!isOrganizer && !participating && (
                  <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.07] p-4">
                    {!user ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-300">{t.jamDetail.signInTeam}</p>
                        <Link href="/login" className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition">
                          {t.jamDetail.signIn}
                        </Link>
                      </div>
                    ) : canJoin ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-300">{t.jamDetail.joinFirst}</p>
                        <button onClick={handleJoin} disabled={actionLoading}
                          className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition">
                          {actionLoading ? '…' : t.jamDetail.joinJam}
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">{t.jamDetail.registrationClosed}</p>
                    )}
                  </div>
                )}

                {participating && !myTeamId && teamsLoaded && teams.length > 0 && (
                  <p className="text-sm text-gray-400">{t.jamDetail.youAreIn}</p>
                )}

                {participating && !myTeamId && (
                  <form onSubmit={handleCreateTeam} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">{t.jamDetail.createTeam}</h3>
                    <div className="flex gap-2">
                      <input
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                        placeholder={t.jamDetail.teamName}
                        maxLength={50}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
                      />
                      <button type="submit" disabled={creatingTeam || !newTeamName.trim()}
                        className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition">
                        {creatingTeam ? '…' : t.jamDetail.create}
                      </button>
                    </div>
                  </form>
                )}

                {!teamsLoaded ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-800/60" />
                    ))}
                  </div>
                ) : teams.length === 0 ? (
                  <div className="py-16 text-center text-gray-500">{t.jamDetail.noTeams}</div>
                ) : (
                  teams.map(team => {
                    const isMine = team.id === myTeamId
                    const isFull = jam.maxTeamSize ? team._count.members >= jam.maxTeamSize : false
                    const canJoinTeam = participating && !myTeamId && !isFull
                    return (
                      <div key={team.id} className={`rounded-xl border p-4 transition ${isMine ? 'border-violet-500/40 bg-violet-500/5' : 'border-gray-800 bg-gray-900'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">{team.name}</p>
                              {isMine && <span className="rounded-full bg-violet-500/20 text-violet-400 text-xs px-2 py-0.5">{t.jamDetail.yourTeam}</span>}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {team._count.members}{jam.maxTeamSize ? ` / ${jam.maxTeamSize}` : ''} member{team._count.members !== 1 ? 's' : ''}
                            </p>
                          </div>
                          {isMine ? (
                            <button onClick={handleLeaveTeam} disabled={teamActionLoading === team.id}
                              className="rounded-lg border border-gray-700 text-gray-400 hover:border-red-500/50 hover:text-red-400 px-3 py-1 text-xs transition disabled:opacity-50">
                              {teamActionLoading === team.id ? '…' : 'Leave'}
                            </button>
                          ) : canJoinTeam ? (
                            <button onClick={() => handleJoinTeam(team.id)} disabled={teamActionLoading === team.id}
                              className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-3 py-1 text-xs font-medium transition">
                              {teamActionLoading === team.id ? '…' : 'Join'}
                            </button>
                          ) : isFull ? (
                            <span className="text-xs text-gray-600">{t.jamDetail.full}</span>
                          ) : null}
                        </div>
                        {team.members.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {team.members.map(m => (
                              <Link key={m.user.id} href={`/users/${m.user.username}`}
                                className="flex items-center gap-1.5 rounded-full bg-gray-800 py-1 pl-1 pr-2.5 text-xs text-gray-400 hover:text-white transition">
                                <Avatar name={m.user.displayName} src={m.user.avatarUrl} size="xs" className="!h-5 !w-5 !text-[10px]" />
                                {m.user.displayName}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* ── Submissions ── */}
            {tab === 'submissions' && (
              <div className="space-y-5">
                {jam.status === 'IN_PROGRESS' && participating && !mySubmission && (
                  <>
                    {!showSubmitForm ? (
                      <button onClick={() => setShowSubmitForm(true)}
                        className="w-full rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5 py-6 text-sm font-medium text-violet-400 hover:border-violet-500/60 hover:bg-violet-500/10 transition">
                        {t.jamDetail.submitGame}
                      </button>
                    ) : (
                      <form onSubmit={handleCreateSubmission} className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-300">{t.jamDetail.submitGameTitle}</h3>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">{t.jamDetail.gameTitleField} <span className="text-red-500">*</span></label>
                          <input value={submitTitle} onChange={e => setSubmitTitle(e.target.value)} maxLength={100} required
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
                            placeholder={t.jamDetail.gameTitlePlaceholder} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">{t.jamDetail.gameDescField} <span className="text-red-500">*</span></label>
                          <textarea value={submitDesc} onChange={e => setSubmitDesc(e.target.value)} maxLength={2000} required rows={4}
                            className="w-full resize-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
                            placeholder={t.jamDetail.gameDescPlaceholder} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">{t.jamDetail.gameLinkField} <span className="text-gray-600">{t.jamDetail.gameLinkHint}</span></label>
                          <input type="url" value={submitUrl} onChange={e => setSubmitUrl(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
                            placeholder={t.jamDetail.gameLinkPlaceholder} />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={submitting || !submitTitle.trim() || !submitDesc.trim()}
                            className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-5 py-2 text-sm font-medium text-white transition">
                            {submitting ? t.jamDetail.submitting : t.jamDetail.submitButton}
                          </button>
                          <button type="button" onClick={() => setShowSubmitForm(false)}
                            className="rounded-lg border border-gray-700 px-5 py-2 text-sm text-gray-400 hover:text-white transition">
                            {t.jamDetail.cancel}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}

                {mySubmission && !['VOTING', 'CLOSED'].includes(jam.status) && (
                  <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">{t.jamDetail.yourSubmission}</span>
                      {jam.status === 'IN_PROGRESS' && mySubmission.user.id === user?.id && !showEditSub && (
                        <div className="flex gap-2">
                          <button onClick={openEditSub}
                            className="rounded-lg border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:border-violet-500 hover:text-white transition">
                            {t.common.edit}
                          </button>
                          <button onClick={handleDeleteSub} disabled={deletingSub}
                            className="rounded-lg border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:border-red-500/50 hover:text-red-400 transition disabled:opacity-50">
                            {deletingSub ? '…' : t.common.delete}
                          </button>
                        </div>
                      )}
                    </div>

                    {showEditSub ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">{t.jamDetail.gameTitleField}</label>
                          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={100}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">{t.jamDetail.gameDescField}</label>
                          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={2000} rows={4}
                            className="w-full resize-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">{t.jamDetail.gameLinkField}</label>
                          <input type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition"
                            placeholder="https://…" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveSub} disabled={savingSub || !editTitle.trim() || !editDesc.trim()}
                            className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-1.5 text-sm font-medium text-white transition">
                            {savingSub ? t.common.saving : t.common.save}
                          </button>
                          <button onClick={() => setShowEditSub(false)}
                            className="rounded-lg border border-gray-700 px-4 py-1.5 text-sm text-gray-400 hover:text-white transition">
                            {t.jamDetail.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <SubmissionCard submission={mySubmission} isOwn={true} myVote={null} showVoting={false} onVote={() => {}} t={t} />
                    )}

                    {jam.status === 'IN_PROGRESS' && mySubmission.user.id === user?.id && !showEditSub && (
                      <div className="mt-4 space-y-3 border-t border-violet-500/20 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-300">{t.jamDetail.gameFile}</p>
                            {mySubmission.fileUrl ? (
                              <p className="text-xs text-emerald-400 truncate">
                                {t.jamDetail.fileUploaded}{mySubmission.fileSizeBytes ? ` · ${formatBytes(mySubmission.fileSizeBytes)}` : ''}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-600">{t.jamDetail.noFile}</p>
                            )}
                          </div>
                          <label className="shrink-0 cursor-pointer rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:border-violet-500 hover:text-white transition">
                            {uploadingFile ? t.jamDetail.uploading : mySubmission.fileUrl ? t.jamDetail.replace : t.jamDetail.upload}
                            <input type="file" className="hidden" onChange={handleUploadGameFile} disabled={uploadingFile} />
                          </label>
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-xs font-medium text-gray-300">{t.jamDetail.screenshots} <span className="text-gray-600">({mySubmission.screenshots.length}/5)</span></p>
                            {mySubmission.screenshots.length < 5 && (
                              <label className="shrink-0 cursor-pointer rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:border-violet-500 hover:text-white transition">
                                {uploadingShot ? t.jamDetail.uploading : t.jamDetail.addScreenshots}
                                <input type="file" accept="image/*" className="hidden" onChange={handleUploadScreenshot} disabled={uploadingShot} />
                              </label>
                            )}
                          </div>
                          {mySubmission.screenshots.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5">
                              {mySubmission.screenshots.map(s => (
                                <img key={s.id} src={s.url} alt="" className="h-20 w-full rounded-lg object-cover" />
                              ))}
                            </div>
                          )}
                        </div>
                        {subError && <p className="text-xs text-red-400">{subError}</p>}
                      </div>
                    )}
                  </div>
                )}

                {['VOTING', 'CLOSED'].includes(jam.status) && (
                  <>
                    {!submissionsLoaded ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-800/60" />
                        ))}
                      </div>
                    ) : submissions.length === 0 ? (
                      <div className="py-16 text-center text-gray-500">{t.jamDetail.noSubmissions}</div>
                    ) : (
                      <div className="space-y-4">
                        {submissions.map(sub => {
                          const isOwnSub = sub.user.id === user?.id
                          const isVoted = myVote?.submissionId === sub.id
                          return (
                            <div key={sub.id}>
                              <SubmissionCard submission={sub} isOwn={isOwnSub} myVote={isVoted ? myVote : null} showVoting={jam.status === 'VOTING' && !!user && !isOwnSub} onVote={() => openVoteForm(sub)} t={t} />

                              {showVoteForm === sub.id && (
                                <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-medium text-amber-300">
                                      {isVoted ? t.jamDetail.updateVote : t.jamDetail.castVote}
                                    </p>
                                    <button onClick={() => setShowVoteForm(null)} className="text-gray-500 hover:text-gray-300 text-sm">×</button>
                                  </div>
                                  <div className="mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs text-gray-400">{t.jamDetail.score}</label>
                                      <span className="text-sm font-bold text-white">{voteScore} / 10</span>
                                    </div>
                                    <input type="range" min={1} max={10} value={voteScore} onChange={e => setVoteScore(Number(e.target.value))} className="w-full accent-violet-500" />
                                    <div className="flex justify-between text-xs text-gray-600 mt-0.5"><span>1</span><span>10</span></div>
                                  </div>
                                  <div className="mb-3">
                                    <label className="block text-xs text-gray-400 mb-1">{t.jamDetail.comment} <span className="text-gray-600">{t.jamDetail.optional}</span></label>
                                    <textarea value={voteComment} onChange={e => setVoteComment(e.target.value)} maxLength={750} rows={2}
                                      className="w-full resize-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition"
                                      placeholder={t.jamDetail.commentPlaceholder} />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => isVoted ? handleUpdateVote() : handleCastVote(sub.id)} disabled={voteLoading}
                                      className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-medium px-4 py-1.5 text-sm transition">
                                      {voteLoading ? '…' : isVoted ? t.jamDetail.update : t.jamDetail.vote}
                                    </button>
                                    {isVoted && (
                                      <button onClick={handleRetractVote} disabled={voteLoading}
                                        className="rounded-lg border border-gray-700 text-gray-400 hover:text-red-400 px-4 py-1.5 text-sm transition disabled:opacity-50">
                                        {t.jamDetail.retract}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                {jam.status === 'IN_PROGRESS' && !participating && !isOrganizer && (
                  <div className="py-12 text-center text-gray-500">
                    <p>{t.jamDetail.submissionsInProgress}</p>
                    {user ? null : <p className="mt-1 text-sm"><Link href="/login" className="text-violet-400 hover:text-violet-300">{t.jamDetail.signIn}</Link> and join to submit.</p>}
                  </div>
                )}
              </div>
            )}

            {/* ── Results ── */}
            {tab === 'results' && (
              <div className="space-y-3">
                {!resultsLoaded ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-800/60" />
                    ))}
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-16 text-center text-gray-500">{t.jamDetail.noResults}</div>
                ) : (
                  results.map(r => (
                    <div key={r.submission.id} className={`flex items-start gap-4 rounded-xl border p-4 ${
                      r.rank === 1 ? 'border-amber-500/30 bg-amber-500/5' :
                      r.rank === 2 ? 'border-gray-400/20 bg-gray-400/5' :
                      r.rank === 3 ? 'border-orange-700/30 bg-orange-900/5' :
                      'border-gray-800 bg-gray-900'
                    }`}>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        r.rank === 1 ? 'bg-amber-500 text-black' :
                        r.rank === 2 ? 'bg-gray-400 text-black' :
                        r.rank === 3 ? 'bg-orange-700 text-white' :
                        'bg-gray-800 text-gray-400'
                      }`}>#{r.rank}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{r.submission.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t.jamDetail.by} {r.submission.user.displayName}
                          {r.submission.team && <> · {r.submission.team.name}</>}
                        </p>
                        {r.submission.description && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{r.submission.description}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold text-white">{r.avgScore.toFixed(1)}</p>
                        <p className="text-xs text-gray-500">{r.voteCount} vote{r.voteCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="space-y-4 border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
              <StatRow label={t.jamDetail.participants} value={jam.maxParticipants ? `${jam._count.participants} / ${jam.maxParticipants}` : String(jam._count.participants)} />
              <StatRow label={t.jamDetail.teamMode} value={teamModeLabels[jam.teamMode]} />
              {jam.maxTeamSize && <StatRow label={t.jamDetail.maxTeamSize} value={String(jam.maxTeamSize)} />}
              {jam._count.submissions > 0 && <StatRow label={t.jamDetail.submissionsCount} value={String(jam._count.submissions)} />}
              {participating && myTeamId && (
                <div className="border-t border-gray-200 pt-1 dark:border-gray-800">
                  <p className="text-xs text-gray-500">{t.jamDetail.yourTeam}</p>
                  <p className="mt-0.5 text-sm font-medium text-violet-600 dark:text-violet-300">
                    {teams.find(tm => tm.id === myTeamId)?.name ?? 'Team'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4 border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.jamNew.timeline}</h3>
              <TimelineItem label={t.jamDetail.jamStarts} date={jam.startAt} />
              <TimelineItem label={t.jamDetail.submissionsClose} date={jam.submissionsEndAt} />
              <TimelineItem label={t.jamDetail.votingEnds} date={jam.votingEndAt} />
            </div>

            {jam.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {jam.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">{tag}</span>
                ))}
              </div>
            )}

            <Link href="/" className="block text-center text-sm text-gray-500 transition hover:text-gray-700 dark:hover:text-gray-400">{t.jamDetail.allJams}</Link>
          </aside>
        </div>
        <div className="h-16" />
      </div>

      {/* Delete draft confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">{t.jamDetail.deleteDialog}</h3>
            <p className="text-gray-400 text-sm mb-6">{t.jamDetail.deleteDialogDesc}</p>
            <div className="flex gap-3">
              <button onClick={handleDeleteJam} disabled={deletingJam}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-2 transition">
                {deletingJam ? t.common.deleting : t.jamDetail.deleteJam}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-gray-700 text-gray-300 hover:text-white py-2 transition">
                {t.jamDetail.keepIt}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel jam confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">{t.jamDetail.cancelDialog}</h3>
            <p className="text-gray-400 text-sm mb-6">{t.jamDetail.cancelDialogDesc}</p>
            <div className="flex gap-3">
              <button onClick={handleCancelJam} disabled={cancelling}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-2 transition">
                {cancelling ? '…' : t.jamDetail.cancelJam}
              </button>
              <button onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-lg border border-gray-700 text-gray-300 hover:text-white py-2 transition">
                {t.jamDetail.keepIt}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function SubmissionCard({
  submission, isOwn, myVote, showVoting, onVote, t
}: {
  submission: Submission
  isOwn: boolean
  myVote: { score: number; comment: string } | null
  showVoting: boolean
  onVote: () => void
  t: Translations
}) {
  return (
    <div className="border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 dark:text-white">{submission.title}</p>
            {isOwn && <span className="bg-violet-100 px-2 py-0.5 text-xs text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">{t.jamDetail.yours}</span>}
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {t.jamDetail.by} <Link href={`/users/${submission.user.username}`} className="transition hover:text-gray-700 dark:hover:text-gray-300">{submission.user.displayName}</Link>
            {submission.team && <> · {submission.team.name}</>}
          </p>
          {submission.description && (
            <p className="mt-2 line-clamp-3 text-sm text-gray-500 dark:text-gray-400">{submission.description}</p>
          )}
          {submission.externalUrl && (
            <a href={submission.externalUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-violet-400 hover:text-violet-300 transition">
              {t.jamDetail.playGame}
            </a>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          {myVote && (
            <div className="text-center">
              <p className="text-lg font-bold text-amber-400">{myVote.score}</p>
              <p className="text-[10px] text-gray-600">{t.jamDetail.yourVote}</p>
            </div>
          )}
          {showVoting && (
            <button onClick={onVote}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                myVote ? 'border border-amber-500/40 text-amber-400 hover:bg-amber-500/10' : 'bg-amber-500 hover:bg-amber-400 text-black'
              }`}>
              {myVote ? t.jamDetail.editVote : t.jamDetail.vote}
            </button>
          )}
        </div>
      </div>

      {submission.screenshots.length > 0 && (
        <div className={`mt-3 grid gap-1.5 rounded-xl overflow-hidden ${submission.screenshots.length > 1 ? 'grid-cols-2 sm:grid-cols-3' : ''}`}>
          {submission.screenshots.slice(0, 3).map(s => (
            <img key={s.id} src={s.url} alt="" className="w-full object-cover h-24 rounded-lg" />
          ))}
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function TimelineItem({ label, date }: { label: string; date: string }) {
  const isPast = new Date(date) < new Date()
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${isPast ? 'bg-gray-400 dark:bg-gray-600' : 'bg-violet-500 dark:bg-violet-400'}`} />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-medium ${isPast ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
