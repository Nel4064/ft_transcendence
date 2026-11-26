import { useState } from 'react'
import ActionRow from '../../components/ActionRow/ActionRow'
import BackButton from '../../components/BackButton/BackButton'
import Button from '../../components/button/Button'
import Card from '../../components/Card/Card'
import Heading from '../../components/Heading/Heading'
import Message from '../../components/Message/Message'

function PrivacyGDPRPage() {
    const [error, setError] = useState('')

    // TODO: call GET /api/users/me/export once the backend endpoint exists
    function handleExport() {
        setError('Data export is not available yet.')
    }

    // TODO: call DELETE /api/users/me once the backend endpoint exists, then logout
    function handleDelete() {
        if (!window.confirm('Delete your account permanently? This cannot be undone.')) return
        setError('Account deletion is not available yet.')
    }

    return (
        <main>
            <div className="flex flex-col gap-6 max-w-[600px] mx-auto my-[60px]">
                <BackButton />
                <Heading level="title">Download or delete my data</Heading>

                <p className="text-body text-text-muted">
                    You can download everything CineClub holds about your account,
                    or permanently delete it, at any time.
                </p>

                {error && <Message tone="danger">{error}</Message>}

                <Card>
                    <ActionRow title="Export my data" description="Profile, RSVPs, friends and messages, as a file.">
                        <Button variant="primary" onClick={handleExport}>Export</Button>
                    </ActionRow>
                </Card>

                <Card tone="danger">
                    <ActionRow danger title="Delete my account" description="Permanent. This cannot be undone.">
                        <Button variant="danger" onClick={handleDelete}>Delete</Button>
                    </ActionRow>
                </Card>
            </div>
        </main>
    )
}

export default PrivacyGDPRPage
