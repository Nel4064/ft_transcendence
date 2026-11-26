import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/Avatar/Avatar'
import BackButton from '../../components/BackButton/BackButton'
import Button from '../../components/button/Button'
import Card from '../../components/Card/Card'
import Heading from '../../components/Heading/Heading'
import Input from '../../components/Input/Input'
import Message from '../../components/Message/Message'
import Select from '../../components/Select/Select'

function EditProfilePage() {
  const { t, i18n } = useTranslation()
  const { user, setUser, apiFetch } = useAuth()

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [language, setLanguage] = useState(user?.language || 'EN')

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Refill the form when the logged-in user is loaded or updated
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '')
      setBio(user.bio || '')
      setLanguage(user.language || 'EN')
    }
  }, [user])

  function handleLanguageSelect(nextLanguage: string) {
    setLanguage(nextLanguage)
    const nextLang = nextLanguage.toLowerCase()
    localStorage.setItem('i18nextLng', nextLang)
    void i18n.changeLanguage(nextLang)
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    try {
      const data = await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, bio, language }),
      })
      setUser(data.user) // updates the navbar, profile... everywhere, no reload

      const nextLang = language.toLowerCase()
      localStorage.setItem('i18nextLng', nextLang)
      await i18n.changeLanguage(nextLang)

      setSuccessMsg(t('profile.messages.updateSuccess', 'Profile updated.'))
    } catch (err: any) {
      setError(err.message || t('profile.messages.updateFailed', 'Failed to update profile'))
    }
  }

  // apiFetch forces a JSON Content-Type, which breaks file uploads: plain fetch here
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccessMsg('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('token') || localStorage.getItem('jwt_token')
      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || t('profile.messages.uploadFailed', 'Failed to upload photo'))

      setUser(data.user)
      setSuccessMsg(t('profile.messages.uploadPhotoSuccess', 'Photo updated.'))
    } catch (err: any) {
      setError(err.message || t('profile.messages.uploadFailed', 'Failed to upload photo'))
    } finally {
      setUploading(false)
      e.target.value = '' // allows picking the same file again
    }
  }

  if (!user) return null

  return (
    <main>
      <div className="flex flex-col gap-6 max-w-[600px] mx-auto my-[60px]">
        <BackButton />
        <Heading level="title">{t('profile.edit.heading', 'Edit profile')}</Heading>

        {error && <Message tone="danger">{error}</Message>}
        {successMsg && <Message tone="success">{successMsg}</Message>}

        <Card padding="lg" className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar size={130} />
            <Button variant="primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading
                ? t('profile.avatar.uploading', 'Uploading...')
                : t('profile.avatar.changePhoto', 'Change photo')}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
            <Input
              id="displayName"
              size="md"
              label={t('profile.edit.displayNameLabel', 'Display name')}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('profile.edit.displayNamePlaceholder', 'Enter your display name')}
            />

            <Input
              id="bio"
              size="md"
              label={t('profile.edit.bioLabel', 'About Me')}
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('profile.edit.bioPlaceholder', 'Write something about yourself...')}
            />

            <Select
              id="language"
              size="md"
              label={t('profile.edit.languageLabel', 'Preferred language')}
              value={language}
              onChange={(e) => handleLanguageSelect(e.target.value)}
            >
              <option value="EN">English</option>
              <option value="FR">Français</option>
              <option value="ZH">中文</option>
            </Select>

            <Button type="submit" size="lg" className="w-full">
              {t('profile.edit.saveButton', 'Save changes')}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}

export default EditProfilePage