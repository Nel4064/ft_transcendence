import { useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Button, { buttonClass } from '../button/Button'
import { useAuth } from '../../context/AuthContext'
import type { Screening } from '../../api/screenings'
import { uploadScreeningFiles, deleteScreeningFile } from '../../api/screenings'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_ATTACHMENTS = 10
const POSTER_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']

type Props = {
	screening: Screening
	onUpdated: (updated: Screening) => void
}

function ScreeningFilesManager({ screening, onUpdated }: Props) {
	const { t } = useTranslation()
	const { apiFetch } = useAuth()

	const [posterFile, setPosterFile] = useState<File | null>(null)
	const [posterPreview, setPosterPreview] = useState<string | null>(null)
	const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
	const [progress, setProgress] = useState<number | null>(null)
	const [error, setError] = useState('')

	function handleSelectPoster(e: ChangeEvent<HTMLInputElement>) {
		setError('')
		const file = e.target.files?.[0]
		e.target.value = ''
		if (!file) return
		if (!POSTER_TYPES.includes(file.type)) {
			return setError(t('screeningDetails.files.errors.wrongType', { name: file.name }))
		}
		if (file.size > MAX_SIZE) {
			return setError(t('screeningDetails.files.errors.tooLarge', { name: file.name }))
		}

		if (posterPreview) URL.revokeObjectURL(posterPreview)
		setPosterFile(file)
		setPosterPreview(URL.createObjectURL(file))
	}

	function handleSelectAttachments(e: ChangeEvent<HTMLInputElement>) {
		setError('')
		const selected = Array.from(e.target.files ?? [])
		e.target.value = ''
		if (selected.length === 0) return

		if (attachmentFiles.length + selected.length > MAX_ATTACHMENTS) {
			return setError(t('screeningDetails.files.errors.tooManyFiles', { max: MAX_ATTACHMENTS }))
		}

		for (const file of selected) {
			if (!ATTACHMENT_TYPES.includes(file.type)) {
				return setError(t('screeningDetails.files.errors.wrongType', { name: file.name }))
			}
			if (file.size > MAX_SIZE) {
				return setError(t('screeningDetails.files.errors.tooLarge', { name: file.name }))
			}
		}
		setAttachmentFiles((prev) => [...prev, ...selected])
	}

	function removePendingAttachment(index: number) {
		setAttachmentFiles((prev) => prev.filter((_, i) => i !== index))
	}

	async function handleUpload() {
		if (!posterFile && attachmentFiles.length === 0) return
		const formData = new FormData()
		if (posterFile) formData.append('poster', posterFile)
		for (const file of attachmentFiles) {
			formData.append('attachment', file)
		}

		setError('')
		setProgress(0)
		try {
			onUpdated(await uploadScreeningFiles(screening.id, formData, setProgress))
			if (posterPreview) URL.revokeObjectURL(posterPreview)
			setPosterFile(null)
			setPosterPreview(null)
			setAttachmentFiles([])
		} catch (err: any) {
			setError(err.message)
		} finally {
			setProgress(null)
		}
	}

	async function handleDelete(kind: 'poster' | 'attachment', url?: string) {
		const confirmMessage = kind === 'poster'
			? t('screeningDetails.files.confirmRestorePoster')
			: t('screeningDetails.files.confirmDeleteFile')
		if (!confirm(confirmMessage)) return
		try {
			onUpdated(await deleteScreeningFile(apiFetch, screening.id, kind, url))
		} catch (err: any) {
			setError(err.message)
		}
	}

	const isUploadedPoster = !!screening.posterUrl?.startsWith('/uploads/screenings/')
	const uploadedAttachments = screening.attachments ?? []

	return (
		<section className="mt-8 p-4 bg-surface border border-border rounded-lg shadow-card flex flex-col gap-6">
			<h2 className="font-bold text-text">{t('screeningDetails.files.heading')}</h2>

			{/* 1. Poster（单文件） */}
			<div className="flex flex-col gap-2">
				<label className="text-small font-medium text-text">
					{t('screeningDetails.files.posterLabel')}
				</label>
				<div className="flex items-center gap-3">
					<label className={buttonClass('admin', 'md', 'w-fit')}>
						{t('screeningDetails.files.changePoster')}
						<input
							type="file"
							className="hidden"
							accept={POSTER_TYPES.join(',')}
							onChange={handleSelectPoster}
						/>
					</label>
					<span className="text-small text-text-muted">
						{posterFile?.name ?? t('screeningDetails.files.noFileSelected')}
					</span>
				</div>

				{posterPreview && (
					<img
						src={posterPreview}
						alt={t('screeningDetails.files.posterPreviewAlt')}
						className="w-40 rounded-md"
					/>
				)}

				{isUploadedPoster && (
					<div className="flex items-center gap-3 text-small">
						<Button variant="danger" type="button" onClick={() => handleDelete('poster')}>
							{t('screeningDetails.files.restorePoster')}
						</Button>
					</div>
				)}
			</div>

			{/* 2. Flyers / Attachments（多文件：PDF + 图片） */}
			<div className="flex flex-col gap-2">
				<label className="text-small font-medium text-text">
					{t('screeningDetails.files.attachmentsLabel')}
				</label>
				<div className="flex items-center gap-3">
					<label className={buttonClass('admin', 'md', 'w-fit')}>
						{t('screeningDetails.files.addAttachments')}
						<input
							type="file"
							multiple
							className="hidden"
							accept={ATTACHMENT_TYPES.join(',')}
							onChange={handleSelectAttachments}
						/>
					</label>
					<span className="text-small text-text-muted">
						{attachmentFiles.length > 0
							? t('screeningDetails.files.filesSelected', { count: attachmentFiles.length })
							: t('screeningDetails.files.noFileSelected')}
					</span>
				</div>

				{/* 待上传的文件列表 */}
				{attachmentFiles.length > 0 && (
					<ul className="flex flex-col gap-1 text-small text-text-muted">
						{attachmentFiles.map((file, idx) => (
							<li key={`${file.name}-${idx}`} className="flex items-center justify-between gap-2">
								<span className="truncate">{file.name}</span>
								<button
									type="button"
									onClick={() => removePendingAttachment(idx)}
									className="text-danger underline shrink-0"
								>
									{t('screeningDetails.files.remove')}
								</button>
							</li>
						))}
					</ul>
				)}

				{/* 已上传的文件列表：显示原始文件名，点击打开 + 单独删除 */}
				{uploadedAttachments.length > 0 && (
					<ul className="flex flex-col gap-2 mt-2">
						{uploadedAttachments.map((item) => (
							<li key={item.url} className="flex items-center justify-between gap-3 text-small p-2 border border-border rounded-md">
								<a
									href={item.url}
									target="_blank"
									rel="noreferrer"
									className="underline text-brand truncate"
								>
									{item.name}
								</a>
								<Button
									variant="danger"
									type="button"
									onClick={() => handleDelete('attachment', item.url)}
								>
									{t('screeningDetails.files.delete')}
								</Button>
							</li>
						))}
					</ul>
				)}
			</div>

			{progress !== null && <progress value={progress} max={100} className="w-full" />}
			{error && (
				<p className="py-2 px-3 rounded-md bg-danger/10 text-danger text-small font-bold text-center">
					{error}
				</p>
			)}

			<Button
				variant="admin"
				size="lg"
				type="button"
				onClick={handleUpload}
				disabled={(!posterFile && attachmentFiles.length === 0) || progress !== null}
			>
				{progress !== null
					? t('screeningDetails.files.uploading', { progress })
					: t('screeningDetails.files.upload')}
			</Button>
		</section>
	)
}

export default ScreeningFilesManager