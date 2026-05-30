'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useT, useLocale } from '@/contexts/LanguageContext'
import type { Locale } from '@/contexts/LanguageContext'

interface MeProfile {
  id: string
  username: string
  email: string
  displayName: string
  bio?: string | null
  avatarUrl?: string | null
  bannerUrl?: string | null
  websiteUrl?: string | null
  githubUrl?: string | null
  twitterUrl?: string | null
  itchUrl?: string | null
  isVerified: boolean
}

export default function SettingsPage() {
  const t = useT()
  const { locale, setLocale } = useLocale()
  const { user, accessToken, loading: authLoading, updateUser } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [itchUrl, setItchUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [deletingAvatar, setDeletingAvatar] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!accessToken) return
    api.get('users/me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .json<MeProfile>()
      .then(data => {
        setProfile(data)
        setDisplayName(data.displayName)
        setBio(data.bio ?? '')
        setWebsiteUrl(data.websiteUrl ?? '')
        setGithubUrl(data.githubUrl ?? '')
        setTwitterUrl(data.twitterUrl ?? '')
        setItchUrl(data.itchUrl ?? '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accessToken])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const updated = await api.patch('users/me', {
        json: {
          displayName: displayName.trim(),
          bio: bio.trim() || undefined,
          websiteUrl: websiteUrl.trim() || '',
          githubUrl: githubUrl.trim() || '',
          twitterUrl: twitterUrl.trim() || '',
          itchUrl: itchUrl.trim() || '',
        },
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<MeProfile>()
      setProfile(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError(t.settings.errorSave)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !accessToken) return
    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const updated = await api.post('users/me/avatar', {
        body: formData,
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<MeProfile>()
      setProfile(prev => prev ? { ...prev, avatarUrl: updated.avatarUrl } : prev)
      updateUser({ avatarUrl: updated.avatarUrl })
    } catch {
      // silently fail
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  async function handleDeleteAvatar() {
    if (!accessToken) return
    setDeletingAvatar(true)
    try {
      await api.delete('users/me/avatar', { headers: { Authorization: `Bearer ${accessToken}` } })
      setProfile(prev => prev ? { ...prev, avatarUrl: null } : prev)
      updateUser({ avatarUrl: null })
    } catch {
      // silently fail
    } finally {
      setDeletingAvatar(false)
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !accessToken) return
    setBannerUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const updated = await api.post('users/me/banner', {
        body: formData,
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<MeProfile>()
      setProfile(prev => prev ? { ...prev, bannerUrl: updated.bannerUrl } : prev)
    } catch {
      // silently fail
    } finally {
      setBannerUploading(false)
      if (bannerInputRef.current) bannerInputRef.current.value = ''
    }
  }

  const inputClass = "w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
  const disabledClass = "w-full cursor-not-allowed border border-gray-200 bg-gray-100 px-4 py-2.5 text-gray-400 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-500"
  const labelClass = "mb-1.5 block text-sm text-gray-700 dark:text-gray-300"

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse bg-gray-200 dark:bg-gray-800/60" />
        ))}
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-xl font-semibold text-gray-900 dark:text-white">{t.settings.title}</h1>

      {/* Avatar & Banner */}
      <section className="mb-8 border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500">{t.settings.profileImages}</h2>

        {/* Banner */}
        <div className="mb-6">
          <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">{t.settings.banner}</p>
          <div
            className="group relative h-28 w-full cursor-pointer overflow-hidden border border-gray-200 transition hover:border-violet-500/50 dark:border-gray-700"
            onClick={() => bannerInputRef.current?.click()}
          >
            {profile.bannerUrl
              ? <img src={profile.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
              : <div className="h-full w-full bg-violet-900/40" />
            }
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
              <span className="text-sm font-medium text-white">{bannerUploading ? t.settings.uploading : t.settings.changeBanner}</span>
            </div>
          </div>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={bannerUploading} />
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="relative h-20 w-20 shrink-0">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden border-2 border-gray-200 bg-violet-700 text-2xl font-bold text-white dark:border-gray-700">
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
                : profile.displayName[0]?.toUpperCase()
              }
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="border border-gray-200 px-4 py-1.5 text-sm text-gray-600 transition hover:border-violet-500 hover:text-violet-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              {avatarUploading ? t.settings.uploading : t.settings.changeAvatar}
            </button>
            {profile.avatarUrl && (
              <button
                onClick={handleDeleteAvatar}
                disabled={deletingAvatar}
                className="border border-gray-200 px-4 py-1.5 text-sm text-gray-400 transition hover:border-red-400 hover:text-red-500 disabled:opacity-50 dark:border-gray-800 dark:text-gray-500 dark:hover:border-red-500/50 dark:hover:text-red-400"
              >
                {deletingAvatar ? t.settings.removing : t.settings.removeAvatar}
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="mb-8 border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500">{t.settings.language}</h2>
        <div>
          <label className={labelClass}>{t.settings.languageLabel}</label>
          <div className="flex gap-2">
            {(['en', 'es'] as Locale[]).map(l => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-5 py-2 text-sm font-medium transition ${
                  locale === l
                    ? 'bg-violet-600 text-white'
                    : 'border border-gray-200 text-gray-600 hover:border-violet-500 hover:text-violet-600 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                {l === 'en' ? t.settings.english : t.settings.spanish}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Profile Info */}
      <section className="border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500">{t.settings.profileInfo}</h2>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className={labelClass}>{t.settings.username} <span className="text-gray-400 dark:text-gray-600">{t.settings.usernameHint}</span></label>
            <input value={profile.username} disabled className={disabledClass} />
          </div>

          <div>
            <label className={labelClass}>{t.settings.email} <span className="text-gray-400 dark:text-gray-600">{t.settings.emailHint}</span></label>
            <input value={profile.email} disabled className={disabledClass} />
          </div>

          <div>
            <label className={labelClass}>{t.settings.displayName}</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={50}
              className={inputClass}
              placeholder={t.settings.displayNamePlaceholder}
            />
          </div>

          <div>
            <label className={labelClass}>{t.settings.bio}</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={300}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder={t.settings.bioPlaceholder}
            />
            <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-600">{bio.length}/300</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: t.settings.website, value: websiteUrl, setter: setWebsiteUrl, placeholder: t.settings.websitePlaceholder },
              { label: t.settings.github, value: githubUrl, setter: setGithubUrl, placeholder: t.settings.githubPlaceholder },
              { label: t.settings.twitterX, value: twitterUrl, setter: setTwitterUrl, placeholder: t.settings.twitterPlaceholder },
              { label: t.settings.itch, value: itchUrl, setter: setItchUrl, placeholder: t.settings.itchPlaceholder },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label className={labelClass}>{label}</label>
                <input
                  type="url"
                  value={value}
                  onChange={e => setter(e.target.value)}
                  className={`${inputClass} text-sm`}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>

          {saveError && (
            <p className="border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">{t.settings.saved}</p>
          )}

          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="bg-violet-600 px-6 py-2.5 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? t.settings.saving : t.settings.saveChanges}
          </button>
        </form>
      </section>
    </div>
  )
}
