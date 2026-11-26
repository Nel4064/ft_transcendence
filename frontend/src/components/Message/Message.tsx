import type { ReactNode } from 'react'

type Tone = 'danger' | 'success'

const base = "py-2 px-3 rounded-md text-small font-bold text-center"

const tones: Record<Tone, string> = {
    danger: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
}

type MessageProps = {
    tone: Tone
    children: ReactNode
}

// Feedback line for forms: error or success
function Message({ tone, children }: MessageProps) {
    return (
        <p role={tone === 'danger' ? 'alert' : 'status'} className={`${base} ${tones[tone]}`}>
            {children}
        </p>
    )
}

export default Message
