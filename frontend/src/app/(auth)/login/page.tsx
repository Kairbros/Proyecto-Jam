'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/contexts/LanguageContext'
import { parseApiError } from '@/lib/api'

export default function LoginPage() {
  const t = useT()
  const { login } = useAuth()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    email: z.string().email(t.validation.invalidEmail),
    password: z.string().min(1, t.validation.required)
  })
  type FormData = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      await login(data.email, data.password)
      router.push('/')
    } catch (err: unknown) {
      setServerError(await parseApiError(err, t.auth.login.submit))
    }
  }

  return (
    <div className="border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t.auth.login.title}</h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">{t.auth.login.subtitle}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.auth.login.email}</label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            placeholder="you@example.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex justify-between">
            <label className="block text-sm text-gray-700 dark:text-gray-300">{t.auth.login.password}</label>
            <Link href="/forgot-password" className="text-xs text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300">
              {t.auth.login.forgotPassword}
            </Link>
          </div>
          <input
            {...register('password')}
            type="password"
            autoComplete="current-password"
            className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            placeholder="••••••••"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.password.message}</p>}
        </div>

        {serverError && (
          <p className="border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-violet-600 py-2.5 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? t.auth.login.submitting : t.auth.login.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-500">
        {t.auth.login.noAccount}{' '}
        <Link href="/register" className="text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300">
          {t.auth.login.signUp}
        </Link>
      </p>
    </div>
  )
}
