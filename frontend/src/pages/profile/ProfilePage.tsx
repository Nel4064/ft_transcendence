import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button, { buttonClass } from '../../components/button/Button'
import ProfileSummary from '../../components/Profile/ProfileSummary'

// Entry points to the private settings pages
const settingsLinks = [
    { to: '/profile/edit', label: 'Edit profile' },
    { to: '/profile/security', label: 'Manage two-factor authentication' },
    { to: '/profile/privacy', label: 'Download or delete my data (GDPR)' },
]

function ProfilePage() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    function handleLogout() {
        logout()
        navigate('/signin')
    }

    if (!user) return null

    return (
        <main>
            <div className="flex flex-col gap-6 max-w-[600px] mx-auto my-[60px]">
                <ProfileSummary profile={user}>
                    <div className="flex flex-col gap-3">
                        {settingsLinks.map((link) => (
                            <Link key={link.to} to={link.to} className={buttonClass('primary', 'lg', 'w-full')}>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <Button variant="danger" className="self-end" onClick={handleLogout}>
                        Logout
                    </Button>
                </ProfileSummary>
            </div>
        </main>
    )
}

export default ProfilePage
