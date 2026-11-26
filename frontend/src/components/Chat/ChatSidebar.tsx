import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFriends } from '../../api/friends';
import { getMyRsvpScreenings, type Screening } from '../../api/screenings';
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
    activeScreeningId?: string;
    unreadCounts: Record<string, number>;
}

export default function ChatSidebar({ activeTab, setActiveTab, activeFriendId, activeScreeningId, unreadCounts }: ChatSidebarProps) {
    const { apiFetch } = useAuth();
    const navigate = useNavigate();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(true);
    const [friendsError, setFriendsError] = useState<string | null>(null);
    
    const [eventGroups, setEventGroups] = useState<Screening[]>([]);
    const [groupLoading, setGroupLoading] = useState(true);
    const [groupError, setGroupError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function loadFriends() {
            setFriendsLoading(true);
            setFriendsError(null);
            try { 
                const friendsData = await getFriends(apiFetch);
                if (!cancelled)  setFriends(friendsData);
            } catch (error) {
                if (!cancelled) setFriendsError(error instanceof Error? error.message: 'Failed to load friends.');
            } finally {
                if (!cancelled) setFriendsLoading(false);
            }
        }
        void loadFriends();
        return () => { cancelled = true; };
    }, [apiFetch]);

    useEffect(() => {
        let cancelled = false;
        async function loadEventGroups(){
            setGroupLoading(true);
            setGroupError(null);
            try{
                const eventData = await getMyRsvpScreenings(apiFetch);
                if (!cancelled) setEventGroups(eventData);
            } catch(error) {
                if (!cancelled)
                    setGroupError(error instanceof Error? error.message : 'Failed to load event groups.');
            } finally {
                if (!cancelled) setGroupLoading(false);
            }
        }
        void loadEventGroups();
        return () => { cancelled = true; };
    }, [apiFetch]);

    return (
        <aside className="flex h-64 w-full shrink-0 flex-col border-b border-border bg-surface md:h-full md:w-72 md:border-b-0 md:border-r">
            <div className="border-b border-border p-4">
                <h2 className="text-lg font-semibold text-text">Chat</h2>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3">
                <ChatTabButton
                    label="Event Groups"
                    isActive={activeTab === 'groups'}
                    onClick={() => setActiveTab('groups')}
                />
                <ChatTabButton
                    label="Friends DM"
                    isActive={activeTab === 'friends'}
                    onClick={() => setActiveTab('friends')}
                />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div>
                    {activeTab === 'groups' && (
                        // <p className="text-center text-sm text-text-muted">Event group conversations will appear here.</p>
                        groupLoading ? (
                            <p className="text-center text-sm text-text-muted">Loading groups...</p>
                        ): groupError ? (
                             <p className="text-center text-sm text-text-muted">Error: {groupError}</p>
                        ) : eventGroups.length === 0 ? (
                                 <p className="text-center text-sm text-text-muted">You have no event groups yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {eventGroups.map((group) => {
                                        // const unreadCount = unreadCounts[group.id] ?? 0;
                                    return (
                                        <button
                                            key={group.id}
                                            type="button"
                                            onClick={() => navigate(`/chat/group/${group.id}`)}
                                            className={`w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors 
                                                    ${
                                                    activeScreeningId === group.id? 'bg-bg text-text': 'text-text-muted hover:bg-bg hover:text-text'
                                                    }
                                                `}
                                        >
                                        <Avatar
                                            src={group.posterUrl}
                                            name={group.filmTitle}
                                            size={30}
                                        />
                                        <span className="min-w-0 flex-1 truncate font-medium">
                                            {group.filmTitle}
                                        </span>
                                        {/* {unreadCount > 0 && (
                                            <span
                                                aria-label={`${unreadCount} unread messages`}
                                                className="min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-xs font-semibold text-white"
                                            >
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )} */}
                                    </button>
                                );
                            })}
                            </div>
                            )
                            )}
                    {activeTab === 'friends' && (
                        friendsLoading ? ( 
                            <p className="text-center text-sm text-text-muted">Loading friends...</p>
                    ) : friendsError ? ( 
                            <p className="text-center text-sm text-text-muted">Error: {friendsError}</p>
                    ) : friends.length === 0 ? (
                            <p className="text-center text-sm text-text-muted">You have no friends yet.</p>
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
                                                activeFriendId === f.id? 'bg-bg text-text': 'text-text-muted hover:bg-bg hover:text-text'
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
                                                aria-label={`${unreadCount} unread messages`}
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
