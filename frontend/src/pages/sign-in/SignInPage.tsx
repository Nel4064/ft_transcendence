import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/button/Button'
import Logo from '../../components/Logo/Logo'
import Input from '../../components/Input/Input'
import Heading from '../../components/Heading/Heading'


function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [userId, setUserId] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { login, authenticate2fa, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 1. Core: Perfectly align with the parameter capturing logic of App-test.tsx
  useEffect(() => {
    const token = searchParams.get('token')
    // Support both string and boolean checks
    const requiresTwoFactor = searchParams.get('requiresTwoFactor') === 'true'
    const callbackUserId = searchParams.get('userId')
    const oauthError = searchParams.get('error')

    console.log('SignInPage detected URL parameters:', { token, requiresTwoFactor, callbackUserId, oauthError })

    if (token) {
      localStorage.setItem('token', token)
      localStorage.setItem('jwt_token', token)
      navigate('/', { replace: true })
      return
    }

    // If 42 OAuth brings in 2FA parameters, forcefully activate the 2FA state machine
    if (requiresTwoFactor && callbackUserId) {
      console.log('Successfully captured 42 OAuth 2FA challenge, preparing to show verification code input, userId:', callbackUserId)
      setUserId(callbackUserId)
      setRequires2FA(true)
      setError('2FA is enabled. Please enter the 6-digit code from your authenticator app.')

      // Clean up plaintext parameters in the URL to prevent repeated triggers on refresh
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    if (oauthError) {
      setError('42 OAuth login failed: ' + oauthError)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [searchParams, navigate])

  useEffect(() => {
    // if the user is already logged in, redirect to home page
    if (user) {
    // force redirect to home page, replace: true will replace the history, preventing the user from clicking the browser's "back" button and going back to the login page
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  // Step 1: Standard email/password login
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await login(email, password)

      if (result && typeof result === 'object' && 'twoFactorRequired' in result && result.twoFactorRequired) {
        setUserId(result.userId)
        setRequires2FA(true)
        setCode('')
        setError('Please enter the 6-digit code')
        return
      }

      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 2: Submit 6-digit code and userId -> Perfectly triggers the /api/auth/2fa/authenticate step
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
      // Core: Call the two-parameter method defined in AuthContext
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
    window.location.href = '/api/auth/oauth/42'   // same origin: nginx sends /api/ to the backend
  }

  function handleBackToLogin() {
    setRequires2FA(false)
    setUserId('')
    setCode('')
    setError('')
    setEmail('')
    setPassword('')
    navigate('/signin', { replace: true })
  }

  return (
    <main>
      <form
        className="flex flex-col gap-2 max-w-[320px] mx-auto my-[320px]"
        onSubmit={requires2FA ? handleVerify2FA : handleSubmit}
      >
        <Heading className="text-center">
          {requires2FA ? 'Two-Factor Authentication' : <Logo />}
        </Heading>

        <div className="relative p-5 bg-surface border border-border rounded-md shadow-card">
          <div className="flex flex-col gap-2">
            {!requires2FA ? (
              <>
                <Input
                  id="identifier"
                  type="text"
                  value={email}
                  placeholder="email or username"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="username"
                />

                <Input
                  id="password"
                  type="password"
                  value={password}
                  placeholder="password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
              </>
            ) : (
              <>
                <p className="text-text-light text-small">
                  Enter the 6-digit code from your authenticator app.
                </p>

                <Input
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
                />
              </>
            )}

            {error && (
              <p
                role="alert"
                className="py-2 px-3 rounded-md bg-danger/10 text-danger text-body font-bold text-center"
              >
                {error}
              </p>
            )}

            <Button type="submit" size="lg" disabled={submitting}>
              {submitting
                ? 'Please wait...'
                : requires2FA
                  ? 'Verify Code'
                  : 'Sign In'}
            </Button>

            {!requires2FA ? (
              <Button variant="secondary" size="lg" onClick={handle42Login}>
                Sign in with 42
              </Button>
            ) : (
              <Button variant="secondary" size="lg" onClick={handleBackToLogin} disabled={submitting}>
                Back to Sign In
              </Button>
            )}
          </div>

          {!requires2FA && (
            <p className="text-text-light mt-2">
              New ?{' '}
              <a
                href="/signup"
                className="text-brand hover:text-brand-hover"
              >
                Create an account
              </a>
            </p>
          )}
        </div>
      </form>
    </main>
  )
}

export default SignInPage