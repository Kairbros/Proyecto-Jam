'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { api } from '@/lib/api'
import { MailIcon } from '@/components/Icons'
import { useT } from '@/contexts/LanguageContext'

type FormData = { email: string }

export default function ForgotPasswordPage() {
  const t = useT()
  const [sent, setSent] = useState(false)

  const schema = z.object({
    email: z.string().email(t.validation.invalidEmail)
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    await api.post('auth/forgot-password', { json: { email: data.email } }).catch(() => {})
    setSent(true)
  }

  if (sent) {
    return (
      <div className="border border-gray-200 bg-white p-8 shadow-sm text-center dark:border-gray-800 dark:bg-gray-900">
        <MailIcon className="mx-auto mb-4 h-10 w-10 text-violet-400" />
        <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{t.auth.forgot.sentTitle}</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{t.auth.forgot.sentSubtitle}</p>
        <Link href="/login" className="text-sm text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300">
          {t.auth.forgot.backToSignIn}
        </Link>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t.auth.forgot.title}</h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">{t.auth.forgot.subtitle}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.auth.forgot.email}</label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            placeholder={t.auth.forgot.emailPlaceholder}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-violet-600 py-2.5 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? t.auth.forgot.submitting : t.auth.forgot.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-500">
        <Link href="/login" className="text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300">
          {t.auth.forgot.backToSignIn}
        </Link>
      </p>
    </div>
  )
}
