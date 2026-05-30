'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/contexts/LanguageContext'
import Avatar from '@/components/Avatar'
import { HeartIcon, CommentIcon } from '@/components/Icons'
import type { Post, Comment } from '@/types/post'

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PostCard({ post: initial }: { post: Post }) {
  const t = useT()
  const { user, accessToken } = useAuth()
  const [post, setPost] = useState(initial)
  const [liking, setLiking] = useState(false)

  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (!commentsOpen || commentsLoaded) return
    api.get(`posts/${post.id}/comments`)
      .json<{ items: Comment[] }>()
      .then(res => { setComments(res.items); setCommentsLoaded(true) })
      .catch(() => { setCommentsLoaded(true) })
  }, [commentsOpen, post.id, commentsLoaded])

  async function toggleLike() {
    if (!accessToken || liking) return
    const wasLiked = post.liked
    setPost(p => ({ ...p, liked: !wasLiked, _count: { ...p._count, likes: p._count.likes + (wasLiked ? -1 : 1) } }))
    setLiking(true)
    try {
      if (wasLiked) {
        await api.delete(`posts/${post.id}/like`, { headers: { Authorization: `Bearer ${accessToken}` } })
      } else {
        await api.post(`posts/${post.id}/like`, { headers: { Authorization: `Bearer ${accessToken}` } })
      }
    } catch {
      setPost(p => ({ ...p, liked: wasLiked, _count: { ...p._count, likes: p._count.likes + (wasLiked ? 1 : -1) } }))
    } finally {
      setLiking(false)
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken || !newComment.trim() || commenting) return
    setCommenting(true)
    try {
      const comment = await api.post(`posts/${post.id}/comments`, {
        json: { content: newComment.trim() },
        headers: { Authorization: `Bearer ${accessToken}` }
      }).json<Comment>()
      setComments(prev => [...prev, comment])
      setPost(p => ({ ...p, _count: { ...p._count, comments: p._count.comments + 1 } }))
      setNewComment('')
    } catch {
      // silently fail
    } finally {
      setCommenting(false)
    }
  }

  async function deleteComment(commentId: string) {
    if (!accessToken) return
    setComments(prev => prev.filter(c => c.id !== commentId))
    setPost(p => ({ ...p, _count: { ...p._count, comments: Math.max(0, p._count.comments - 1) } }))
    api.delete(`posts/${post.id}/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).catch(() => {})
  }

  return (
    <article className="border border-gray-200 bg-white transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <Link href={`/users/${post.user.username}`} className="shrink-0">
            <Avatar name={post.user.displayName} src={post.user.avatarUrl} size="md" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href={`/users/${post.user.username}`} className="text-sm font-medium text-gray-900 transition hover:text-violet-500 dark:text-white dark:hover:text-violet-300">
                {post.user.displayName}
              </Link>
              {post.user.isVerified && <span className="text-violet-500 text-xs">✓</span>}
              <span className="text-gray-300 text-xs dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">@{post.user.username}</span>
              <span className="text-gray-300 text-xs dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(post.createdAt)}</span>
            </div>

            <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line dark:text-gray-300">{post.content}</p>

            {post.images.length > 0 && (
              <div className={`mt-3 grid gap-2 overflow-hidden ${post.images.length > 1 ? 'grid-cols-2' : ''}`}>
                {post.images.slice(0, 4).map(img => (
                  <img key={img.id} src={img.url} alt="" className="w-full object-contain max-h-96 bg-gray-100 dark:bg-gray-800/40" />
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-5">
              <button
                onClick={toggleLike}
                disabled={!accessToken}
                className={`flex items-center gap-1.5 text-sm transition disabled:opacity-40 ${
                  post.liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500 dark:text-gray-500 dark:hover:text-rose-400'
                }`}
              >
                <HeartIcon className="h-4 w-4" filled={post.liked} />
                {post._count.likes > 0 && <span>{post._count.likes}</span>}
              </button>
              <button
                onClick={() => setCommentsOpen(v => !v)}
                className={`flex items-center gap-1.5 text-sm transition ${commentsOpen ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 hover:text-violet-500 dark:text-gray-500 dark:hover:text-violet-400'}`}
              >
                <CommentIcon className="h-4 w-4" />
                {post._count.comments > 0 && <span>{post._count.comments}</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments section */}
      {commentsOpen && (
        <div className="border-t border-gray-100 px-5 pb-4 pt-4 dark:border-gray-800">
          {!commentsLoaded ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse bg-gray-100 dark:bg-gray-800/60" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-600 text-center py-2">{t.post.noComments}</p>
              )}
              {comments.map(c => {
                const isOwn = user?.id === c.user.id
                return (
                  <div key={c.id} className="group flex items-start gap-2.5">
                    <Link href={`/users/${c.user.username}`} className="shrink-0">
                      <Avatar name={c.user.displayName} src={c.user.avatarUrl} size="sm" />
                    </Link>
                    <div className={`relative flex-1 min-w-0 border px-3 py-2 ${
                      isOwn
                        ? 'border-violet-200 bg-violet-50 dark:border-violet-900/50 dark:bg-violet-950/30'
                        : 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800'
                    }`}>
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Link href={`/users/${c.user.username}`} className="truncate text-xs font-medium text-gray-900 transition hover:text-violet-500 dark:text-white dark:hover:text-violet-300">
                            {c.user.displayName}
                          </Link>
                          {isOwn && <span className="shrink-0 label-mono text-[8px] text-violet-500 dark:text-violet-400">{t.post.you}</span>}
                          <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-600">{timeAgo(c.createdAt)}</span>
                        </div>
                        {isOwn && (
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setOpenMenuId(v => v === c.id ? null : c.id)}
                              className="flex h-5 w-5 items-center justify-center text-gray-400 opacity-0 transition hover:text-gray-900 group-hover:opacity-100 dark:hover:text-white"
                              title="Options"
                            >
                              <span className="text-sm leading-none tracking-widest">···</span>
                            </button>
                            {openMenuId === c.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 top-full z-20 mt-0.5 w-28 border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-900">
                                  <button
                                    onClick={() => { deleteComment(c.id); setOpenMenuId(null) }}
                                    className="w-full px-3 py-2 text-left text-xs text-red-500 transition hover:bg-gray-50 dark:hover:bg-gray-800"
                                  >
                                    {t.post.delete}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed dark:text-gray-300">{c.content}</p>
                    </div>
                  </div>
                )
              })}

              {/* Comment form */}
              {accessToken ? (
                <form onSubmit={handleComment} className="flex items-center gap-2.5 pt-1">
                  <Avatar name={user?.displayName ?? '?'} src={user?.avatarUrl} size="sm" />
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder={t.post.addComment}
                    maxLength={300}
                    className="flex-1 border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-600"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || commenting}
                    className="bg-violet-500 hover:bg-violet-600 disabled:opacity-40 px-3 py-1.5 text-xs font-medium text-white transition"
                  >
                    {commenting ? '…' : t.post.postButton}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-600 text-center pt-1">
                  <Link href="/login" className="text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300">{t.post.signInTo}</Link> {t.post.toComment}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
