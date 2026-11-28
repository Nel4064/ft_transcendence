import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import Heading from "../../components/Heading/Heading"
import BackButton from "../../components/BackButton/BackButton"
import Badge, { type Tone } from "../../components/Badge/Badge"

// status page, linked from the Administration page: asks /api/health every 10s and shows the state of each service
// the route stays public so the page still works when the backend (and so the login check) is down
type State = 'checking' | 'up' | 'down' | 'unknown'
type Health = { api: State; database: State; checkedAt: Date | null }

const REFRESH_MS = 10_000

const rowClass = "flex items-center justify-between p-4 bg-surface border border-border rounded-md"
// fixed width so every badge has the same size, whatever the state label
const stateBadgeClass = "w-36 justify-center"

const stateTone: Record<State, Tone> = {
	checking: 'neutral',
	up: 'success',
	down: 'danger',
	unknown: 'neutral',
}

function StatusPage() {
	const { t, i18n } = useTranslation()
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
			<div className="mb-4">
				<BackButton />
			</div>
			<Heading className="mb-5">{t('status.heading')}</Heading>
			<ul className="space-y-3">
				{services.map((s) => (
					<li key={s.key} className={rowClass}>
						<span className="font-semibold">{t(`status.services.${s.key}`)}</span>
						<Badge tone={stateTone[s.state]} className={stateBadgeClass}>
							{t(`status.states.${s.state}`)}
						</Badge>
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