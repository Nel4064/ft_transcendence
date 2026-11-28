import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../button/Button'

export type DialogKind = 'confirm' | 'alert'
export type DialogTone = 'info' | 'error'

type DialogProps = {
    open: boolean
    kind: DialogKind
    message: string
    tone?: DialogTone
    danger?: boolean          // red confirm button, for destructive actions
    confirmLabel?: string     // defaults to "Confirm" (confirm) or "OK" (alert)
    onClose: (confirmed: boolean) => void
}

// Built on the native <dialog>: showModal() gives the backdrop, Esc to close,
// focus kept inside the box and screen-reader support
const dialogClass =
    "m-auto w-[calc(100%-2rem)] max-w-md p-6 rounded-lg border border-border bg-surface text-text shadow-card " +
    "backdrop:bg-black/40"
const toneClass: Record<DialogTone, string> = {
    info: "text-body text-text",
    error: "text-body text-danger font-medium",
}

function Dialog({ open, kind, message, tone = 'info', danger = false, confirmLabel, onClose }: DialogProps) {
    const { t } = useTranslation()
    const ref = useRef<HTMLDialogElement>(null)

    // React decides `open`; this keeps the real <dialog> element in sync with it
    useEffect(() => {
        const dialog = ref.current
        if (!dialog) return
        if (open && !dialog.open) dialog.showModal()
        if (!open && dialog.open) dialog.close()
    }, [open])

    return (
        <dialog
            ref={ref}
            className={dialogClass}
            // Esc: let React close it, so the answer is "cancel" and the state stays in sync
            onCancel={(e) => { e.preventDefault(); onClose(false) }}
        >
            <p className={toneClass[tone]}>{message}</p>
            <div className="flex justify-end gap-2 mt-6">
                {kind === 'confirm' && (
                    <Button variant="secondary" onClick={() => onClose(false)}>
                        {t('common.cancel')}
                    </Button>
                )}
                <Button variant={danger ? 'danger' : 'primary'} onClick={() => onClose(true)} autoFocus>
                    {confirmLabel ?? (kind === 'confirm' ? t('common.confirm') : t('common.ok'))}
                </Button>
            </div>
        </dialog>
    )
}

export default Dialog
