import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/button/Button'
import Input from '../../components/Input/Input'
import Heading from '../../components/Heading/Heading'
import Logo from '../../components/Logo/Logo' // 如果你的 Logo 路径不同，保持原来的 import 即可

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'zh', label: '中文' },
]

function SignInPage() {
  const { t, i18n } = useTranslation()
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

  const currentLang = i18n.language?.split('-')[0] || 'en'

  function handleLanguageChange(e: ChangeEvent<HTMLSelectElement>) {
    const lang = e.target.value
    i18n.changeLanguage(lang)
    localStorage.setItem('i18nextLng', lang)
  }

  // 1. Core: Perfectly align with the parameter capturing logic of App-test.tsx
  useEffect(() => {
    const token = searchParams.get('token')
    const requiresTwoFactor = searchParams.get('requiresTwoFactor') === 'true'
    const callbackUserId = searchParams.get('userId')
    const oauthError = searchParams.get('error')

    console.log('SignInPage detected URL parameters:', {
      token,
      requiresTwoFactor,
      callbackUserId,
      oauthError,
    })

    if (token) {
      localStorage.setItem('token', token)
      localStorage.setItem('jwt_token', token)
      navigate('/', { replace: true })
      return
    }

    // If 42 OAuth brings in 2FA parameters, forcefully activate the 2FA state machine
    if (requiresTwoFactor && callbackUserId) {
      console.log(
        'Successfully captured 42 OAuth 2FA challenge, preparing to show verification code input, userId:',
        callbackUserId,
      )
      setUserId(callbackUserId)
      setRequires2FA(true)
      setError(t('signIn.errors.twoFactorEnabled'))

      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    if (oauthError) {
      setError(t('signIn.errors.oauthFailed', { error: oauthError }))
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [searchParams, navigate, t])

  useEffect(() => {
    if (user) {
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

      if (
        result &&
        typeof result === 'object' &&
        'twoFactorRequired' in result &&
        result.twoFactorRequired
      ) {
        setUserId(result.userId)
        setRequires2FA(true)
        setCode('')
        setError(t('signIn.errors.enterCode'))
        return
      }

      navigate('/', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('signIn.errors.loginFailed'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Step 2: Submit 6-digit code and userId -> triggers /api/auth/2fa/authenticate
  async function handleVerify2FA(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!userId) {
      setError(t('signIn.errors.missingUserId'))
      setRequires2FA(false)
      return
    }

    if (!/^\d{6}$/.test(code)) {
      setError(t('signIn.errors.invalidCode'))
      return
    }

    setSubmitting(true)

    try {
      await authenticate2fa(code, userId)
      navigate('/', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('signIn.errors.twoFactorFailed'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handle42Login() {
    window.location.href = '/api/auth/oauth/42'
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
          {requires2FA ? t('signIn.twoFactorHeading') : <Logo />}
        </Heading>

        <div className="relative p-5 bg-surface border border-border rounded-md shadow-card">
          <div className="flex flex-col gap-2">
            {!requires2FA ? (
              <>
                <Input
                  id="identifier"
                  type="text"
                  value={email}
                  placeholder={t('signIn.placeholders.identifier')}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="username"
                />

                <Input
                  id="password"
                  type="password"
                  value={password}
                  placeholder={t('signIn.placeholders.password')}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
              </>
            ) : (
              <>
                <p className="text-text-light text-small">
                  {t('signIn.twoFactorPrompt')}
                </p>

                <Input
                  id="twoFactorCode"
                  type="text"
                  value={code}
                  placeholder={t('signIn.placeholders.twoFactorCode')}
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
                ? t('signIn.buttons.pleaseWait')
                : requires2FA
                  ? t('signIn.buttons.verifyCode')
                  : t('signIn.buttons.signIn')}
            </Button>

            {!requires2FA ? (
              <Button variant="secondary" size="lg" onClick={handle42Login}>
                {t('signIn.buttons.signInWith42')}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                onClick={handleBackToLogin}
                disabled={submitting}
              >
                {t('signIn.buttons.backToSignIn')}
              </Button>
            )}
          </div>

          {!requires2FA && (
            <p className="text-text-light mt-2">
              {t('signIn.newUser')}{' '}
              <a
                href="/signup"
                className="text-brand hover:text-brand-hover"
              >
                {t('signIn.createAccount')}
              </a>
            </p>
          )}
        </div>

        <div className="flex justify-end mt-1">
          <select
            aria-label="Language"
            value={currentLang}
            onChange={handleLanguageChange}
            className="px-3 py-1.5 text-small bg-surface text-text border border-border rounded-md shadow-card cursor-pointer focus:outline-none focus:border-brand"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </form>
    </main>
  )
}

export default SignInPage