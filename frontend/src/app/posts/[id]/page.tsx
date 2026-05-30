'use client'
import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/contexts/LanguageContext'
import PostCard from '@/components/PostCard'
import { DocumentIcon } from '@/components/Icons'
import type { Post } from '@/types/post'

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useT()
  const { user } = useAuth()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get(`posts/${id}`)
      .json<Post>()
      .then(setPost)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!post) return
    setDeleting(true)
    try {
      await api.delete(`posts/${post.id}`)
      router.push('/feed')
    } catch {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="h-48 animate-pulse bg-gray-200 dark:bg-gray-800/60" />
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <DocumentIcon className="h-12 w-12 text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t.post.notFound}</h1>
        <Link href="/feed" className="text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 transition">{t.post.backToFeed}</Link>
      </div>
    )
  }

  const isOwner = user?.id === post.user.id

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">{t.post.back}</button>
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition disabled:opacity-50"
          >
            {deleting ? t.post.deleting : t.post.deletePost}
          </button>
        )}
      </div>

      <PostCard post={post} />
    </div>
  )
}
