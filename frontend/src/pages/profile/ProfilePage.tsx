import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/Avatar/Avatar'
import { useState, useRef, useEffect } from 'react'

function ProfilePage() {
    const { user, logout, apiFetch, disable2fa } = useAuth()
    const navigate = useNavigate()

    // 2FA related states
    const [is2faEnabled, setIs2faEnabled] = useState(user?.twoFactorEnabled || false)
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    const [totpCode, setTotpCode] = useState('')
    const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'disable'>('idle')
    const [disableCode, setDisableCode] = useState('')

    // Profile editing related states (initialized to current user content or empty string)
    const [displayName, setDisplayName] = useState(user?.displayName || '')
    const [bio, setBio] = useState(user?.bio || '')
    const [language, setLanguage] = useState(user?.language || 'EN')

    // Avatar upload related states
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    // Synchronize local edit box states when the global user object updates
    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '')
            setBio(user.bio || '')
            setLanguage(user.language || 'EN')
            setIs2faEnabled(user.twoFactorEnabled || false)
        }
    }, [user])

    function handleLogout() {
        logout()
        navigate('/signin')
    }

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

    // 4. Handle updating profile (DisplayName, Bio, Language)
    async function handleUpdateProfile(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setSuccessMsg('')
        try {
            await apiFetch('/api/users/me', {
                method: 'PATCH',
                body: JSON.stringify({ displayName, bio, language }),
            })
            setSuccessMsg('Profile updated successfully!')
            setTimeout(() => {
                window.location.reload()
            }, 500)
        } catch (err: any) {
            setError(err.message || 'Failed to update profile')
        }
    }

    // 5. Handle avatar upload
    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setError('')
        setSuccessMsg('')
        setUploading(true)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const token = localStorage.getItem('jwt_token')
            const res = await fetch('/api/users/me/avatar', {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: formData,
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to upload avatar')

            setSuccessMsg('Avatar uploaded successfully! Refreshing...')

            setTimeout(() => {
                window.location.reload()
            }, 500)
        } catch (err: any) {
            setError(err.message || 'Failed to upload avatar')
        } finally {
            setUploading(false)
        }
    }

    return (
        <main>
            <div className="flex flex-col gap-6 max-w-[800px] mx-auto my-[60px]">
                {/* Global alert messages */}
                {error && <p className="py-2 px-3 rounded-md bg-danger/10 text-danger text-sm font-bold text-center">{error}</p>}
                {successMsg && <p className="py-2 px-3 rounded-md bg-green-500/10 text-green-600 text-sm font-bold text-center">{successMsg}</p>}

                {/* User info card (includes avatar and basic display) */}
                <div className="flex items-center gap-5 p-5 bg-surface border border-border rounded-md shadow-card">
                    <div
                        className="relative cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                        title="Click to change avatar"
                    >
                        <Avatar
                            src={user?.avatarUrl ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : user.avatarUrl) : undefined}
                            size={120}
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                            {uploading ? 'Uploading...' : 'Change'}
                        </div>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />

                    <div>
                        <h1 className="mb-1 font-serif text-2xl text-text">{user?.username}</h1>
                        <p className="text-text-muted">{user?.email}</p>
                    </div>
                </div>

                {/* ✏️ Profile edit card (Display Name, Bio, Language) */}
                <div className="p-5 bg-surface border border-border rounded-md shadow-card flex flex-col gap-4">
                    <h2 className="text-xl font-serif font-bold text-text">Edit Profile</h2>

                    <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-text">Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Enter your display name"
                                className="py-2 px-3 border border-border rounded-md text-base bg-surface text-text focus:outline-none focus:border-brand"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-text">Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Write something about yourself..."
                                className="py-2 px-3 border border-border rounded-md text-base bg-surface text-text h-[80px] resize-y focus:outline-none focus:border-brand"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-text">Language</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="py-2 px-3 border border-border rounded-md text-base bg-surface text-text focus:outline-none focus:border-brand"
                            >
                                <option value="EN">English (EN)</option>
                                <option value="FR">Français (FR)</option>
                                <option value="ES">Español (ES)</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="py-2 px-4 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-bold cursor-pointer transition-colors w-fit">
                            Save Profile Changes
                        </button>
                    </form>
                </div>

                {/* 2FA management card */}
                <div className="p-5 bg-surface border border-border rounded-md shadow-card flex flex-col gap-4">
                    <h2 className="text-xl font-serif font-bold text-text">Two-Factor Authentication (2FA)</h2>

                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-text font-medium">
                                Status: <span className={is2faEnabled ? "text-green-600 font-bold" : "text-text-muted"}>
                                    {is2faEnabled ? "Enabled" : "Disabled"}
                                </span>
                            </p>
                            <p className="text-sm text-text-muted">Secure your account using an authenticator app.</p>
                        </div>

                        {!is2faEnabled && setupStep === 'idle' && (
                            <button
                                onClick={handleStart2faSetup}
                                className="py-2 px-4 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-bold cursor-pointer transition-colors">
                                Enable 2FA
                            </button>
                        )}

                        {is2faEnabled && setupStep === 'idle' && (
                            <button
                                onClick={() => setSetupStep('disable')}
                                className="py-2 px-4 rounded-md bg-danger hover:bg-danger/90 text-white text-sm font-bold cursor-pointer transition-colors">
                                Disable 2FA
                            </button>
                        )}
                    </div>

                    {/* QR code setup area for enabling 2FA */}
                    {setupStep === 'qr' && (
                        <form onSubmit={handleVerify2fa} className="flex flex-col gap-3 mt-2 pt-4 border-t border-border">
                            <p className="text-sm text-text-muted">1. Scan this QR code with Google Authenticator or Authy:</p>
                            {qrCodeUrl && (
                                <div className="flex justify-center bg-white p-3 rounded-md w-fit mx-auto border border-border">
                                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-[160px] h-[160px]" />
                                </div>
                            )}
                            <p className="text-sm text-text-muted">2. Enter the 6-digit code from your app to verify and activate:</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="123456"
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value)}
                                    className="py-2 px-3 border border-border rounded-md text-base tracking-widest font-mono bg-surface text-text"
                                    required
                                />
                                <button
                                    type="submit"
                                    className="py-2 px-4 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-bold cursor-pointer transition-colors">
                                    Verify & Turn On
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSetupStep('idle')}
                                    className="py-2 px-4 rounded-md border border-border hover:bg-surface text-text text-sm cursor-pointer">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Form requiring code input to disable 2FA */}
                    {setupStep === 'disable' && (
                        <form onSubmit={handleDisable2fa} className="flex flex-col gap-3 mt-2 pt-4 border-t border-border">
                            <p className="text-sm text-text-muted">Enter the 6-digit code from your authenticator app to disable 2FA:</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="123456"
                                    value={disableCode}
                                    onChange={(e) => setDisableCode(e.target.value)}
                                    className="py-2 px-3 border border-border rounded-md text-base tracking-widest font-mono bg-surface text-text"
                                    required
                                />
                                <button
                                    type="submit"
                                    className="py-2 px-4 rounded-md bg-danger hover:bg-danger/90 text-white text-sm font-bold cursor-pointer transition-colors">
                                    Confirm & Disable
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSetupStep('idle')}
                                    className="py-2 px-4 rounded-md border border-border hover:bg-surface text-text text-sm cursor-pointer">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Logout button */}
                <button className="self-end py-2 px-4 rounded-md bg-danger hover:bg-danger/90 text-white text-base font-bold cursor-pointer transition-colors" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </main>
    )
}

export default ProfilePage