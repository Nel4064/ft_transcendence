import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { apiFetch, useAuth } from '../../context/AuthContext'
import Button, { buttonClass } from '../../components/button/Button'
import Input from '../../components/Input/Input'
import Heading from '../../components/Heading/Heading'

const linkClass = 'text-brand hover:text-brand-hover'

const LANGUAGES = [
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'Français' },
	{ code: 'zh', label: '中文' },
]

function SignUpPage() {
	const { t, i18n } = useTranslation()
	const [username, setUsername] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [acceptTerms, setAcceptTerms] = useState(false)
	const { login, user } = useAuth()
	const navigate = useNavigate()

	const currentLang = i18n.language?.split('-')[0] || 'en'

	function handleLanguageChange(e: ChangeEvent<HTMLSelectElement>) {
		const lang = e.target.value
		i18n.changeLanguage(lang)
		localStorage.setItem('i18nextLng', lang)
	}

	useEffect(() => {
		if (user) {
			navigate('/', { replace: true })
		}
	}, [user, navigate])

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (password !== confirmPassword) {
			setError(t('signUp.errors.passwordMismatch'))
			return
		}
		if (!acceptTerms) {
			setError(t('signUp.errors.mustAcceptTerms'))
			return
		}
		setError('')
		try {
			await apiFetch('/auth/register', {
				method: 'POST',
				body: JSON.stringify({ username, email, password }),
			})
			await login(username, password)
			navigate('/')
		}
		catch (err) {
			setError(err instanceof Error ? err.message : t('signUp.errors.registrationFailed'))
		}
	}

	return (
		<main>
			<form className="flex flex-col gap-2 max-w-[320px] mx-auto my-[320px]" onSubmit={handleSubmit}>
				<Heading className="text-center">{t('signUp.heading')}</Heading>
				<div className="relative p-5 bg-surface border border-border rounded-md shadow-card">
					<div className="flex flex-col gap-2">
						<Input
							id="username"
							type="text"
							value={username}
							placeholder={t('signUp.placeholders.username')}
							onChange={(e) => setUsername(e.target.value)}
							minLength={2}
							required
						/>

						<Input
							id="email"
							type="email"
							value={email}
							placeholder={t('signUp.placeholders.email')}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>

						<Input
							id="password"
							type="password"
							value={password}
							placeholder={t('signUp.placeholders.password')}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={6}
						/>

						<Input
							id="confirm-password"
							type="password"
							value={confirmPassword}
							placeholder={t('signUp.placeholders.confirmPassword')}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							minLength={6}
						/>

						<label className="mt-3 pb-2 text-body text-text-light flex items-start gap-2">
							<input
								type="checkbox"
								checked={acceptTerms}
								onChange={(e) => setAcceptTerms(e.target.checked)}
								className="mt-1"
							/>
							<span>
								<Trans
									i18nKey="signUp.acceptTerms"
									components={{
										terms: <Link to="/termsofservice" target="_blank" className={linkClass} />,
										privacy: <Link to="/privacypolicy" target="_blank" className={linkClass} />,
									}}
								/>
							</span>
						</label>

						{error && <p className="py-2 px-3 rounded-md bg-danger/10 text-danger text-body font-bold text-center">{error}</p>}

						<Button type="submit" size="lg">{t('signUp.buttons.signUp')}</Button>
						<a
							href="/api/auth/oauth/42"
							className={buttonClass('secondary', 'lg')}
						>
							{t('signUp.buttons.signInWith42')}
						</a>

						<p className="text-text-light">
							{t('signUp.alreadyHaveAccount')}{' '}
							<a href="/signin" className={linkClass}>{t('signUp.signIn')}</a>
						</p>
					</div>
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

export default SignUpPage