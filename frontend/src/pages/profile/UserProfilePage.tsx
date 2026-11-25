import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Loader/Loader';
import Icon from '../../components/Icon/Icon';
import Button from '../../components/button/Button';
import Card from '../../components/Card/Card';
import BackButton from '../../components/BackButton/BackButton';
import ProfileSummary, { type PublicProfile } from '../../components/Profile/ProfileSummary';

type UserProfile = PublicProfile & { isFriend?: boolean };

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { apiFetch, user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const data: UserProfile = await apiFetch(`/api/users/${id}`);
        setProfile(data);

        if (typeof data.isFriend === 'boolean') {
          setIsFriend(data.isFriend);
        } else if (user?.id !== id) {
          try {
            const friendsList = await apiFetch('/api/friends');
            if (Array.isArray(friendsList)) {
              setIsFriend(friendsList.some((f: any) => f.id === id));
            }
          } catch {
            setIsFriend(false);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUserProfile();
    }
  }, [id, apiFetch, user?.id]);

  const handleGoToChat = async () => {
    if (!profile) return;

    if (isFriend) {
      navigate(`/chat/${profile.id}`);
      return;
    }

    const shouldSendRequest = window.confirm(
      `You need to be friends with ${profile.displayName || profile.username} before chatting. Send a friend request now?`
    );
    if (!shouldSendRequest) return;

    setSendingRequest(true);
    try {
      await apiFetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: profile.id }),
      });
      setRequestSent(true);
      alert('Friend request sent!');
    } catch (err: any) {
      alert(err.message || 'Failed to send friend request');
    } finally {
      setSendingRequest(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error || !profile) {
    return (
      <main className="max-w-[500px] mx-auto my-[120px]">
        <Card padding="lg" className="text-center">
          <p className="text-danger font-bold mb-4">{error || 'User not found'}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </Card>
      </main>
    );
  }

  return (
    <main>
      <div className="flex flex-col gap-6 max-w-[600px] mx-auto my-[60px]">
        <BackButton />

        <ProfileSummary profile={profile}>
          {user?.id !== profile.id && (
            <Button
              onClick={handleGoToChat}
              disabled={sendingRequest || requestSent}
              className="w-full mt-2 flex items-center justify-center gap-2"
            >
                {requestSent ? (
                  <>
                    <Icon name="check" size={16} />
                    Friend Request Sent
                  </>
                ) : (
                  <>
                    <Icon name="message-circle" size={16} />
                    {sendingRequest ? 'Sending Request...' : 'Go to Chat'}
                  </>
                )}
              </Button>
          )}
        </ProfileSummary>
      </div>
    </main>
  );
}
