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

export default function RegisterPage() {
  const t = useT()
  const { register: registerUser } = useAuth()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = z.object({
    username: z
      .string()
      .min(3, t.validation.min3Chars)
      .max(30, t.validation.max30Chars)
      .regex(/^[a-zA-Z0-9_]+$/, t.validation.onlyAlphanumeric),
    displayName: z.string().min(1, t.validation.required).max(50),
    email: z.string().email(t.validation.invalidEmail),
    password: z.string().min(8, t.validation.min8Chars)
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
      await registerUser(data)
      router.push('/login?registered=1')
    } catch (err: unknown) {
      setServerError(await parseApiError(err))
    }
  }

  return (
    <div className="border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{t.auth.register.title}</h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">{t.auth.register.subtitle}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.auth.register.username}</label>
            <input
              {...register('username')}
              className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              placeholder="cooldev_99"
            />
            {errors.username && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.username.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.auth.register.displayName}</label>
            <input
              {...register('displayName')}
              className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              placeholder="Cool Dev"
            />
            {errors.displayName && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.displayName.message}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.auth.register.email}</label>
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
          <label className="mb-1.5 block text-sm text-gray-700 dark:text-gray-300">{t.auth.register.password}</label>
          <input
            {...register('password')}
            type="password"
            autoComplete="new-password"
            className="w-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 placeholder-gray-400 transition focus:border-violet-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            placeholder="At least 8 characters"
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
          {isSubmitting ? t.auth.register.submitting : t.auth.register.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-500">
        {t.auth.register.hasAccount}{' '}
        <Link href="/login" className="text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300">
          {t.auth.register.signIn}
        </Link>
      </p>
    </div>
  )
}
