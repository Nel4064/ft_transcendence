
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const inputClass =
  'py-2.5 px-3 border border-border rounded-md text-base'

function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [userId, setUserId] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { login, authenticate2fa } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 处理 42 OAuth 回调：正式 Token 或 2FA challenge
  useEffect(() => {
    const token = searchParams.get('token')
    const requiresTwoFactor =
      searchParams.get('requiresTwoFactor') === 'true'
    const callbackUserId = searchParams.get('userId')
    const oauthError = searchParams.get('error')

    if (token) {
      localStorage.setItem('token', token)
      navigate('/', { replace: true })
      return
    }

    if (requiresTwoFactor && callbackUserId) {
      setUserId(callbackUserId)
      setRequires2FA(true)
      setError('')
      navigate(
        {
          pathname: window.location.pathname,
          search: '',
        },
        { replace: true },
      )
      return
    }

    if (oauthError) {
      setError('42 OAuth login failed. Please try again.')
      navigate(
        {
          pathname: window.location.pathname,
          search: '',
        },
        { replace: true },
      )
    }
  }, [searchParams, navigate])

  // 第一步：账号密码登录
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await login(email, password)

      if ('twoFactorRequired' in result && result.twoFactorRequired) {
        setUserId(result.userId)
        setRequires2FA(true)
        setCode('')
        return
      }

      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  // 第二步：提交 6 位验证码和 userId
  async function handleVerify2FA(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!userId) {
      setError('Missing user ID. Please sign in again.')
      setRequires2FA(false)
      return
    }

    if (!/^\d{6}$/.test(code)) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setSubmitting(true)

    try {
      await authenticate2fa(code, userId)
      navigate('/', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '2FA verification failed',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handle42Login() {
    window.location.href =
      'http://localhost:3000/api/auth/oauth/42'
  }

  function handleBackToLogin() {
    setRequires2FA(false)
    setUserId('')
    setCode('')
    setError('')
  }

  return (
    <main>
      <form
        className="flex flex-col gap-2 max-w-[320px] mx-auto my-[320px]"
        onSubmit={requires2FA ? handleVerify2FA : handleSubmit}
      >
        <h1 className="text-center text-5xl font-serif font-bold">
          {requires2FA ? 'Two-Factor Authentication' : 'Welcome Back !'}
        </h1>

        <div className="relative p-5 bg-surface border border-border rounded-md shadow-card">
          <div className="flex flex-col gap-2">
            {!requires2FA ? (
              <>
                <input
                  id="identifier"
                  type="text"
                  value={email}
                  placeholder="email or username"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="username"
                  className={inputClass}
                />

                <input
                  id="password"
                  type="password"
                  value={password}
                  placeholder="password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className={inputClass}
                />
              </>
            ) : (
              <>
                <p className="text-text-light text-sm">
                  Enter the 6-digit code from your authenticator app.
                </p>

                <input
                  id="twoFactorCode"
                  type="text"
                  value={code}
                  placeholder="6-digit verification code"
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  required
                  minLength={6}
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  className={inputClass}
                />
              </>
            )}

            {error && (
              <p
                role="alert"
                className="py-2 px-3 rounded-md bg-danger/10 text-danger text-base font-bold text-center"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 px-3 rounded-md bg-brand hover:bg-brand-hover text-white text-base cursor-pointer disabled:opacity-50"
            >
              {submitting
                ? 'Please wait...'
                : requires2FA
                  ? 'Verify Code'
                  : 'Sign In'}
            </button>

            {!requires2FA ? (
              <button
                type="button"
                onClick={handle42Login}
                className="py-2.5 px-3 rounded-md border border-border text-center text-base hover:bg-surface cursor-pointer"
              >
                Sign in with 42
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBackToLogin}
                disabled={submitting}
                className="py-2.5 px-3 rounded-md border border-border text-center text-base hover:bg-surface cursor-pointer"
              >
                Back to Sign In
              </button>
            )}
          </div>

          {!requires2FA && (
            <p className="text-text-light mt-2">
              New ?{' '}
              <Link
                to="/signup"
                className="text-brand hover:text-brand-hover"
              >
                Create an account
              </Link>
            </p>
          )}
        </div>
      </form>
    </main>
  )
}

export default SignInPage
