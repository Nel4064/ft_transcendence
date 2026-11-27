import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import Heading from "../../components/Heading/Heading"
import { useAuth } from "../../context/AuthContext"

// status page, linked from the Administration page: asks /api/health every 10s and shows the state of each service
// the route stays public so the page still works when the backend (and so the login check) is down
type State = 'checking' | 'up' | 'down' | 'unknown'
type Health = { api: State; database: State; checkedAt: Date | null }

const REFRESH_MS = 10_000

const rowClass = "flex items-center justify-between p-4 bg-surface border border-border rounded-md"
const stateClass = "flex items-center gap-2 text-sm text-text-muted"

const dotClass: Record<State, string> = {
	checking: 'bg-border',
	up: 'bg-success',
	down: 'bg-danger',
	unknown: 'bg-border',
}

function StatusPage() {
	const { t, i18n } = useTranslation()
	const { user } = useAuth()
	const [health, setHealth] = useState<Health>({ api: 'checking', database: 'checking', checkedAt: null })

	useEffect(() => {
		let cancelled = false

		async function check() {
			let next: Pick<Health, 'api' | 'database'>
			try {
				const res = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(5000) })
				if (res.ok) next = { api: 'up', database: 'up' }
				else if (res.status === 503) next = { api: 'up', database: 'down' }
				else next = { api: 'down', database: 'unknown' }
			} catch {
				next = { api: 'down', database: 'unknown' }
			}
			if (!cancelled) setHealth({ ...next, checkedAt: new Date() })
		}

		check()
		const timer = setInterval(check, REFRESH_MS)
		return () => {
			cancelled = true
			clearInterval(timer)
		}
	}, [])

	// if this code runs, the frontend works: its light is always green
	const services: { key: 'frontend' | 'api' | 'database'; state: State }[] = [
		{ key: 'frontend', state: 'up' },
		{ key: 'api', state: health.api },
		{ key: 'database', state: health.database },
	]

	return (
		<main className="max-w-[800px] mx-auto py-12 px-4">
			{user?.role === 'ADMIN' && (
				<Link to="/admin" className="inline-block mb-4 text-sm text-text-muted hover:text-text transition-colors">
					← {t('status.back')}
				</Link>
			)}
			<Heading className="mb-5">{t('status.heading')}</Heading>
			<ul className="space-y-3">
				{services.map((s) => (
					<li key={s.key} className={rowClass}>
						<span className="font-semibold">{t(`status.services.${s.key}`)}</span>
						<span className={stateClass}>
							<span className={`w-3 h-3 rounded-full ${dotClass[s.state]}`} aria-hidden="true" />
							{t(`status.states.${s.state}`)}
						</span>
					</li>
				))}
			</ul>
			{health.checkedAt && (
				<p className="mt-4 text-xs text-text-muted">
					{t('status.lastCheck', {
						time: health.checkedAt.toLocaleTimeString(i18n.language),
						seconds: REFRESH_MS / 1000,
					})}
				</p>
			)}
		</main>
	)
}

export default StatusPage