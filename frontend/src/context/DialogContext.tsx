import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import Dialog, { type DialogKind, type DialogTone } from '../components/Dialog/Dialog'

type ConfirmOptions = { danger?: boolean; confirmLabel?: string }
type AlertOptions = { tone?: DialogTone }

type DialogApi = {
    // resolves to true if the user clicked confirm, false on cancel / Esc
    confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>
    // resolves once the user closed the box
    alert: (message: string, options?: AlertOptions) => Promise<void>
}

type DialogState = { kind: DialogKind; message: string } & ConfirmOptions & AlertOptions

const DialogContext = createContext<DialogApi | null>(null)

// One dialog for the whole app; any page opens it through useDialog()
export function DialogProvider({ children }: { children: ReactNode }) {
    const [dialog, setDialog] = useState<DialogState | null>(null)
    // the pending Promise's resolve function, called when the user answers
    const resolveRef = useRef<((confirmed: boolean) => void) | null>(null)

    const open = useCallback((state: DialogState) =>
        new Promise<boolean>((resolve) => {
            resolveRef.current?.(false)   // a new dialog cancels one still open
            resolveRef.current = resolve
            setDialog(state)
        }), [])

    const confirm = useCallback(
        (message: string, options: ConfirmOptions = {}) => open({ kind: 'confirm', message, ...options }),
        [open])

    const alert = useCallback(
        async (message: string, options: AlertOptions = {}) => { await open({ kind: 'alert', message, ...options }) },
        [open])

    function handleClose(confirmed: boolean) {
        resolveRef.current?.(confirmed)
        resolveRef.current = null
        setDialog(null)
    }

    const api = useMemo(() => ({ confirm, alert }), [confirm, alert])

    return (
        <DialogContext.Provider value={api}>
            {children}
            <Dialog
                open={dialog !== null}
                kind={dialog?.kind ?? 'alert'}
                message={dialog?.message ?? ''}
                tone={dialog?.tone}
                danger={dialog?.danger}
                confirmLabel={dialog?.confirmLabel}
                onClose={handleClose}
            />
        </DialogContext.Provider>
    )
}

export function useDialog() {
    const context = useContext(DialogContext)
    if (!context) throw new Error('useDialog must be used inside <DialogProvider>')
    return context
}
