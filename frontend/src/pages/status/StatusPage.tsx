import { useEffect, useState } from "react"
import Heading from "../../components/Heading/Heading"

//public page: asks /api/health every 10s and shows the state of each service
type State = 'checking' | 'up' | 'down' | 'unknown'
type Health = { api: State; database: State; checkedAt: Date | null}

const REFRESH_MS = 10_000

const rowClass = "flex items-center justify-between p-4 bg-surface border border-border rounded-md"
const stateClass = "flex items-center gap-2 text-sm text-text-muted"

const dotClass: Record<State, string> = {
	checking: 'bg-border',
	up: 'bg-success',
	down: 'bg-danger',
	unknown: 'bg-border',
}

const label: Record<State, string> = {
	checking: 'Checking...',
	up: 'Operational',
	down: 'Down',
	unknown: 'Unknown',
}

function StatusPage() {
	const [health, setHealth] = useState<Health>({ api: 'checking', database: 'checking', checkedAt: null })

	useEffect(() => {
		let cancelled = false

		async function check() {
			let next: Pick<Health, 'api' | 'database'>
			try {
				const res = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(5000) })
				if (res.ok) next = { api: 'up', database: 'up'}
				else if (res.status === 503) next = { api: 'up', database: 'down'}
				else next = { api: 'down', database: 'unknown'}
			} catch {
				next = { api: 'down', database: 'unknown'}
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

	//if this code runs, the frontend works: its light is always green
	const services: { name: string; state: State }[] = [
		{ name: 'Frontend', state: 'up'},
		{ name: 'API', state: health.api },
		{ name: 'Database', state: health.database },
	]

	return (
		<main className="max-w-[800px] mx-auto py-12 px-4">
			<Heading className="mb-5">Service status</Heading>
			<ul className="space-y-3">
			{services.map((s) => (
					<li key={s.name} className={rowClass}>
						<span className="font-semibold">{s.name}</span>
						<span className={stateClass}>
							<span className={`w-3 h-3 rounded-full ${dotClass[s.state]}`} aria-hidden="true" />
							{label[s.state]}
						</span>
					</li>
				))}
			</ul>
			{health.checkedAt && (
				<p className="mt-4 text-xs text-text-muted">
					Last check: {health.checkedAt.toLocaleTimeString('en-GB')} · refreshed every {REFRESH_MS / 1000} s
				</p>
			)}
		</main>
	)
}

export default StatusPage