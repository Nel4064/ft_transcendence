import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Loader/Loader';
import Heading from '../../components/Heading/Heading';
import Icon from '../../components/Icon/Icon';
import Button from '../../components/button/Button';
import BackButton from '../../components/BackButton/BackButton';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  role?: 'ADMIN' | 'USER';
  language?: 'EN' | 'FR' | 'ZH';
  isFriend?: boolean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  EN: 'English',
  FR: 'Français',
  ZH: '中文',
};


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

    // 1. 已经是好友，直接进入聊天
    if (isFriend) {
      navigate(`/chat/${profile.id}`);
      return;
    }

    // 2. 还不是好友，弹窗确认后直接发送好友申请
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

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    } else {
      return name.slice(0, 2).toUpperCase();
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error || !profile) {
    return (
      <main className="max-w-[500px] mx-auto my-[120px] p-6 bg-surface border border-border rounded-md shadow-card text-center">
        <p className="text-danger font-bold mb-4">{error || 'User not found'}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </main>
    );
  }

  return (
    <main>
      <div className="flex flex-col gap-6 max-w-[600px] mx-auto my-[60px]">
        <BackButton />

        {/* User profile display card */}
        <div className="flex flex-col items-center gap-4 p-8 bg-surface border border-border rounded-md shadow-card text-center">
          {/* Custom avatar rendering */}
          <div className="w-[100px] h-[100px] bg-brand/20 text-brand rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden shadow-inner">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName || profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              getInitials(profile.displayName || profile.username)
            )}
          </div>

          <div>
            <Heading level="section" as="h1">{profile.displayName || profile.username}</Heading>
            <p className="text-text-muted text-sm">@{profile.username}</p>

            {/* Role & Language Badges */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {profile.role && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    profile.role === 'ADMIN'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {profile.role === 'ADMIN' && <Icon name="shield" size={14} />}
                  {profile.role === 'ADMIN' ? 'Admin' : 'Member'}
                </span>
              )}

              {profile.language && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                  <Icon name="world" size={14} />
                  {LANGUAGE_LABELS[profile.language] || profile.language}
                </span>
              )}
            </div>
          </div>

          {/* Bio section */}
          <div className="w-full mt-4 p-4 bg-background border border-border rounded-md text-left">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">About Me</h3>
            <p className="text-text text-sm whitespace-pre-wrap">
              {profile.bio || 'This user is lazy and hasn’t written anything yet~'}
            </p>
          </div>

          {/* Action buttons */}
          {user?.id !== profile.id && (
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={handleGoToChat}
                disabled={sendingRequest || requestSent}
                className={`flex-1 py-2 px-4 rounded-md text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  requestSent
                    ? 'bg-stone-400 cursor-not-allowed'
                    : 'bg-brand hover:bg-brand-hover cursor-pointer'
                }`}
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
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}