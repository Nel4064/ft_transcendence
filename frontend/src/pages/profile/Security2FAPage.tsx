import { useAuth } from '../../context/AuthContext'
import Button from '../../components/button/Button'
import Input from '../../components/Input/Input'
import Heading from '../../components/Heading/Heading'
import BackButton from '../../components/BackButton/BackButton'
import { useState, useEffect } from 'react'

function Security2FAPage() {
    const { user, apiFetch, disable2fa } = useAuth()

    // 2FA related states
    const [is2faEnabled, setIs2faEnabled] = useState(user?.twoFactorEnabled || false)
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    const [totpCode, setTotpCode] = useState('')
    const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'disable'>('idle')
    const [disableCode, setDisableCode] = useState('')

    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    // Synchronize local state when the global user object updates
    useEffect(() => {
        if (user) {
            setIs2faEnabled(user.twoFactorEnabled || false)
        }
    }, [user])

    // 1. Request backend to generate 2FA QR code
    async function handleStart2faSetup() {
        setError('')
        setSuccessMsg('')
        try {
            const data = await apiFetch('/api/auth/2fa/generate', { method: 'POST' })
            setQrCodeUrl(data.qrCodeUrl || data)
            setSetupStep('qr')
        } catch (err: any) {
            setError(err.message || 'Failed to initialize 2FA')
        }
    }

    // 2. Verify 6-digit code and officially enable 2FA
    async function handleVerify2fa(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setSuccessMsg('')
        try {
            await apiFetch('/api/auth/2fa/turn-on', {
                method: 'POST',
                body: JSON.stringify({ code: totpCode }),
            })
            setIs2faEnabled(true)
            setSetupStep('idle')
            setTotpCode('')
            setSuccessMsg('2FA successfully enabled!')
        } catch (err: any) {
            setError(err.message || 'Invalid verification code')
        }
    }

    // 3. Verify code and officially disable 2FA
    async function handleDisable2fa(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setSuccessMsg('')
        try {
            // Call global disable2fa, passing the 6-digit verification code entered by the user
            await disable2fa('', disableCode)
            setIs2faEnabled(false)
            setSetupStep('idle')
            setDisableCode('')
            setSuccessMsg('2FA has been disabled.')
        } catch (err: any) {
            setError(err.message || 'Failed to disable 2FA')
        }
    }

    return (
        <main>
            <div className="flex flex-col gap-6 max-w-[800px] mx-auto my-[60px]">
                <BackButton />

                {/* Global alert messages */}
                {error && <p className="py-2 px-3 rounded-md bg-danger/10 text-danger text-small font-bold text-center">{error}</p>}
                {successMsg && <p className="py-2 px-3 rounded-md bg-green-500/10 text-green-600 text-small font-bold text-center">{successMsg}</p>}

                {/* 2FA management card */}
                <div className="p-5 bg-surface border border-border rounded-md shadow-card flex flex-col gap-4">
                    <Heading level="card" as="h2">Two-Factor Authentication (2FA)</Heading>

                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-text font-medium">
                                Status: <span className={is2faEnabled ? "text-green-600 font-bold" : "text-text-muted"}>
                                    {is2faEnabled ? "Enabled" : "Disabled"}
                                </span>
                            </p>
                            <p className="text-small text-text-muted">Secure your account using an authenticator app.</p>
                        </div>

                        {!is2faEnabled && setupStep === 'idle' && (
                            <Button onClick={handleStart2faSetup}>
                                Enable 2FA
                            </Button>
                        )}

                        {is2faEnabled && setupStep === 'idle' && (
                            <Button variant="danger" onClick={() => setSetupStep('disable')}>
                                Disable 2FA
                            </Button>
                        )}
                    </div>

                    {/* QR code setup area for enabling 2FA */}
                    {setupStep === 'qr' && (
                        <form onSubmit={handleVerify2fa} className="flex flex-col gap-3 mt-2 pt-4 border-t border-border">
                            <p className="text-small text-text-muted">1. Scan this QR code with Google Authenticator or Authy:</p>
                            {qrCodeUrl && (
                                <div className="flex justify-center bg-white p-3 rounded-md w-fit mx-auto border border-border">
                                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-[160px] h-[160px]" />
                                </div>
                            )}
                            <p className="text-small text-text-muted">2. Enter the 6-digit code from your app to verify and activate:</p>
                            <div className="flex gap-2">
                                <Input
                                    size="md"
                                    type="text"
                                    maxLength={6}
                                    placeholder="123456"
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value)}
                                    className="tracking-widest font-mono"
                                    required
                                />
                                <Button type="submit">
                                    Verify & Turn On
                                </Button>
                                <Button variant="secondary" onClick={() => setSetupStep('idle')}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Form requiring code input to disable 2FA */}
                    {setupStep === 'disable' && (
                        <form onSubmit={handleDisable2fa} className="flex flex-col gap-3 mt-2 pt-4 border-t border-border">
                            <p className="text-small text-text-muted">Enter the 6-digit code from your authenticator app to disable 2FA:</p>
                            <div className="flex gap-2">
                                <Input
                                    size="md"
                                    type="text"
                                    maxLength={6}
                                    placeholder="123456"
                                    value={disableCode}
                                    onChange={(e) => setDisableCode(e.target.value)}
                                    className="tracking-widest font-mono"
                                    required
                                />
                                <Button type="submit" variant="danger">
                                    Confirm & Disable
                                </Button>
                                <Button variant="secondary" onClick={() => setSetupStep('idle')}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </main>
    )
}

export default Security2FAPage
