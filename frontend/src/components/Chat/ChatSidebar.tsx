import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getFriends } from '../../api/friends';
import Avatar from '../Avatar/Avatar';
import ChatTabButton from './ChatTabButton';

type Friend = {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
}

export type ChatTab = 'groups' | 'friends';

interface ChatSidebarProps {
    activeTab: ChatTab;
    setActiveTab: (tab: ChatTab) => void;
    activeFriendId?: string;
    unreadCounts: Record<string, number>;
}

export default function ChatSidebar({ activeTab, setActiveTab, activeFriendId, unreadCounts }: ChatSidebarProps) {
    const { t } = useTranslation();
    const { apiFetch } = useAuth();
    const navigate = useNavigate();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function loadFriends() {
            setLoading(true);
            setError(null);
            try {
                const friendsData = await getFriends(apiFetch);
                if (!cancelled) setFriends(friendsData);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : t('chat.sidebar.loadFailed', 'Failed to load friends.')
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void loadFriends();
        return () => { cancelled = true; };
    }, [apiFetch, t]);

    return (
        <aside className="flex h-64 w-full shrink-0 flex-col border-b border-border bg-surface md:h-full md:w-72 md:border-b-0 md:border-r">
            <div className="border-b border-border p-4">
                <h2 className="text-lg font-semibold text-text">
                    {t('chat.sidebar.title', 'Chat')}
                </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3">
                <ChatTabButton
                    label={t('chat.sidebar.tabs.groups', 'Event Groups')}
                    isActive={activeTab === 'groups'}
                    onClick={() => setActiveTab('groups')}
                />
                <ChatTabButton
                    label={t('chat.sidebar.tabs.friends', 'Friends DM')}
                    isActive={activeTab === 'friends'}
                    onClick={() => setActiveTab('friends')}
                />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div>
                    {activeTab === 'groups' && (
                        <p className="text-center text-sm text-text-muted">
                            {t('chat.sidebar.groupsEmpty', 'Event group conversations will appear here.')}
                        </p>
                    )}
                    {activeTab === 'friends' && (
                        loading ? (
                            <p className="text-center text-sm text-text-muted">
                                {t('chat.sidebar.loading', 'Loading friends...')}
                            </p>
                        ) : error ? (
                            <p className="text-center text-sm text-text-muted">
                                {t('chat.sidebar.errorPrefix', 'Error:')} {error}
                            </p>
                        ) : friends.length === 0 ? (
                            <p className="text-center text-sm text-text-muted">
                                {t('chat.sidebar.noFriends', 'You have no friends yet.')}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {friends.map((f) => {
                                    const unreadCount = unreadCounts[f.id] ?? 0;
                                    return (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => navigate(`/chat/${f.id}`)}
                                            className={`w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors 
                                                ${
                                                activeFriendId === f.id ? 'bg-bg text-text' : 'text-text-muted hover:bg-bg hover:text-text'
                                                }
                                            `}
                                        >
                                            <Avatar
                                                src={f?.avatarUrl}
                                                name={f.displayName || f.username}
                                                size={30}
                                            />
                                            <span className="min-w-0 flex-1 truncate font-medium">
                                                {f.displayName || f.username}
                                            </span>
                                            {unreadCount > 0 && (
                                                <span
                                                    aria-label={t('chat.sidebar.unreadCount', {
                                                        count: unreadCount,
                                                        defaultValue: '{{count}} unread messages',
                                                    })}
                                                    className="min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-xs font-semibold text-white"
                                                >
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>
            </div>
        </aside>
    );
}