import { useState, type ChangeEvent } from 'react'
import Button, { buttonClass } from '../button/Button'
import { useAuth } from '../../context/AuthContext'
import type { Screening } from '../../api/screenings'
import { uploadScreeningFiles, deleteScreeningFile } from '../../api/screenings'

type Kind = 'poster' | 'attachment'

const MAX_SIZE = 5 * 1024 * 1024 // 5 Mo, comme le backend
const RULES: Record<Kind, { types: string[]; label: string; button: string }> = {
	poster: { types: ['image/png', 'image/jpeg', 'image/webp'], label: 'Poster (PNG, JPG, WebP · 5 MB max)', button: 'Change poster' },
	attachment: { types: ['application/pdf'], label: 'Flyer (PDF · 5 MB max)', button: 'Add a flyer or information' },
}

type Props = {
	screening: Screening
	onUpdated: (updated: Screening) => void
}

function ScreeningFilesManager({ screening, onUpdated }: Props) {
	const { apiFetch } = useAuth()
	const [files, setFiles] = useState<Partial<Record<Kind, File>>>({})
	const [previews, setPreviews] = useState<Partial<Record<Kind, string>>>({})
	const [progress, setProgress] = useState<number | null>(null)
	const [error, setError] = useState('')

	// Validation côté client : type + taille, avant tout envoi
	function handleSelect(kind: Kind, e: ChangeEvent<HTMLInputElement>) {
		setError('')
		const file = e.target.files?.[0]
		e.target.value = '' // permet de re-choisir le même fichier
		if (!file) return
		if (!RULES[kind].types.includes(file.type)) return setError(`${file.name}: wrong file type`)
		if (file.size > MAX_SIZE) return setError(`${file.name}: file is larger than 5 MB`)

		if (previews[kind]) URL.revokeObjectURL(previews[kind]!) // libère l'ancien aperçu
		setFiles({ ...files, [kind]: file })
		setPreviews({ ...previews, [kind]: URL.createObjectURL(file) })
	}

	async function handleUpload() {
		if (!files.poster && !files.attachment) return
		const formData = new FormData()
		if (files.poster) formData.append('poster', files.poster)
		if (files.attachment) formData.append('attachment', files.attachment)

		setError('')
		setProgress(0)
		try {
			onUpdated(await uploadScreeningFiles(screening.id, formData, setProgress))
			setFiles({})
			setPreviews({})
		} catch (err: any) {
			setError(err.message)
		} finally {
			setProgress(null)
		}
	}

	async function handleDelete(kind: Kind) {
		if (!confirm('Delete this file?')) return
		try {
			onUpdated(await deleteScreeningFile(apiFetch, screening.id, kind))
		} catch (err: any) {
			setError(err.message)
		}
	}

	const isUploaded = (url?: string | null) => !!url?.startsWith('/uploads/screenings/')

	return (
		<section className="mt-8 p-4 bg-surface border border-border rounded-lg shadow-card flex flex-col gap-6">
			<h2 className="font-bold text-text">Files (admin)</h2>

			{(['poster', 'attachment'] as Kind[]).map((kind) => {
				const current = kind === 'poster' ? screening.posterUrl : screening.attachmentUrl
				return (
					<div key={kind} className="flex flex-col gap-2">
						<label className="text-small font-medium text-text">{RULES[kind].label}</label>
						<div className="flex items-center gap-3">
							<label className={buttonClass('admin', 'md', 'w-fit')}>
								{RULES[kind].button}
								<input
									type="file"
									className="hidden"
									accept={RULES[kind].types.join(',')}
									onChange={(e) => handleSelect(kind, e)}
								/>
							</label>
							<span className="text-small text-text-muted">
								{files[kind]?.name ?? 'No file selected'}
							</span>
						</div>

						{/* Aperçu avant l'envoi */}
						{previews[kind] && (kind === 'poster'
							? <img src={previews[kind]} alt="Poster preview" className="w-40 rounded-md" />
							: <iframe src={previews[kind]} title="Flyer preview" className="w-full h-64 border border-border rounded-md" />
						)}

						{/* Fichier déjà en ligne : lien + suppression */}
						{isUploaded(current) && (
							<div className="flex items-center gap-3 text-small">
								<a href={current!} target="_blank" rel="noreferrer" className="underline">Current file</a>
								<Button variant="danger" type="button" onClick={() => handleDelete(kind)}>Delete</Button>
							</div>
						)}
					</div>
				)
			})}

			{progress !== null && <progress value={progress} max={100} className="w-full" />}
			{error && <p className="py-2 px-3 rounded-md bg-danger/10 text-danger text-small font-bold text-center">{error}</p>}

			<Button
				variant="admin"
				size="lg"
				type="button"
				onClick={handleUpload}
				disabled={(!files.poster && !files.attachment) || progress !== null}
			>
				{progress !== null ? `Uploading… ${progress}%` : 'Upload'}
			</Button>
		</section>
	)
}

export default ScreeningFilesManager
