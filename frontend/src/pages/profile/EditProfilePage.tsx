import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/Avatar/Avatar'
import Button from '../../components/button/Button'
import Input from '../../components/Input/Input'
import Heading from '../../components/Heading/Heading'
import BackButton from '../../components/BackButton/BackButton'
import { useState, useRef, useEffect } from 'react'

function EditProfilePage() {
    const { user, apiFetch } = useAuth()

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
        }
    }, [user])

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
                <BackButton />

                {/* Global alert messages */}
                {error && <p className="py-2 px-3 rounded-md bg-danger/10 text-danger text-small font-bold text-center">{error}</p>}
                {successMsg && <p className="py-2 px-3 rounded-md bg-green-500/10 text-green-600 text-small font-bold text-center">{successMsg}</p>}

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
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-small font-bold">
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
                        <h1 className="mb-1 font-serif text-section text-text">{user?.username}</h1>
                        <p className="text-text-muted">{user?.email}</p>
                    </div>
                </div>

                {/* ✏️ Profile edit card (Display Name, Bio, Language) */}
                <div className="p-5 bg-surface border border-border rounded-md shadow-card flex flex-col gap-4">
                    <Heading level="card" as="h2">Edit Profile</Heading>

                    <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                        <Input
                            id="displayName"
                            size="md"
                            label="Display Name"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your display name"
                        />

                        <div className="flex flex-col gap-1">
                            <label className="text-small font-medium text-text">Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Write something about yourself..."
                                className="py-2 px-3 border border-border rounded-md text-control bg-surface text-text h-[80px] resize-y focus:outline-none focus:border-brand"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-small font-medium text-text">Language</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="py-2 px-3 border border-border rounded-md text-control bg-surface text-text focus:outline-none focus:border-brand"
                            >
                                <option value="EN">English (EN)</option>
                                <option value="FR">Français (FR)</option>
                                <option value="ZH">中文 (ZH)</option>
                            </select>
                        </div>

                        <Button type="submit" className="w-fit">
                            Save Profile Changes
                        </Button>
                    </form>
                </div>
            </div>
        </main>
    )
}

export default EditProfilePage
