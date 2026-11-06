import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const data = await apiFetch(`/api/users/${id}`);
        setProfile(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUserProfile();
    }
  }, [id, apiFetch]);

  // 辅助函数：获取当前 profile 名字的前两个字母并大写
  const getInitials = (user: { displayName?: string; username: string }) => {
    const name = user.displayName || user.username;
    return name ? name.slice(0, 2).toUpperCase() : 'U';
  };

  if (loading) {
    return <div className="text-center py-20 text-text-muted">Loading...</div>;
  }

  if (error || !profile) {
    return (
      <main className="max-w-[500px] mx-auto my-[120px] p-6 bg-surface border border-border rounded-md shadow-card text-center">
        <p className="text-danger font-bold mb-4">{error || 'User not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="py-2 px-4 rounded-md bg-brand text-white text-sm font-bold cursor-pointer"
        >
          Go Back
        </button>
      </main>
    );
  }

  return (
    <main>
      <div className="flex flex-col gap-6 max-w-[600px] mx-auto my-[60px]">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="w-fit py-1.5 px-3 rounded-md border border-border text-text-muted hover:text-text hover:bg-surface text-sm cursor-pointer transition-colors"
        >
          ← Back
        </button>

        {/* User profile display card */}
        <div className="flex flex-col items-center gap-4 p-8 bg-surface border border-border rounded-md shadow-card text-center">
          {/* 自定义头像渲染：有 avatarUrl 显示图片，没有则显示该 profile 的前两个字母 */}
          <div className="w-[100px] h-[100px] bg-brand/20 text-brand rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden shadow-inner">
            {profile.avatarUrl ? (
              <img 
                src={profile.avatarUrl} 
                alt={profile.displayName || profile.username} 
                className="w-full h-full object-cover" 
              />
            ) : (
              getInitials(profile)
            )}
          </div>
          
          <div>
            <h1 className="font-serif text-2xl text-text font-bold">{profile.displayName || profile.username}</h1>
            <p className="text-text-muted text-sm">@{profile.username}</p>
          </div>

          {/* Bio section */}
          <div className="w-full mt-4 p-4 bg-background border border-border rounded-md text-left">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">About Me</h3>
            <p className="text-text text-sm whitespace-pre-wrap">
              {profile.bio || 'This user is lazy and hasn’t written anything yet~'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={() => alert(`Redirecting to chat with ${profile.username}`)}
              className="flex-1 py-2 px-4 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-bold cursor-pointer transition-colors"
            >
              go to chat
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}