import Button from '../button/Button';
import Input from '../Input/Input';
import EmptyState from '../EmptyState/EmptyState';
import Loader from '../Loader/Loader';
import FriendsCard from './FriendsCard';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import {
    getFriends,
    getPendingRequests,
    searchUsers as apiSearchUsers,
    sendRequest as apiSendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
} from '../../api/friends';

interface User {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    email?: string;
}

interface FriendRequest {
    id: string;
    senderId: string;
    sender: User;
    createdAt: string;
}

export default function FriendsManager() {
    const { t } = useTranslation();
    const { apiFetch, user } = useAuth();

    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>(() => {
        return (sessionStorage.getItem('friends_activeTab') as any) || 'friends';
    });

    const [friends, setFriends] = useState<User[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);

    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const [loading, setLoading] = useState(true);
    const [friendsError, setFriendsError] = useState<string | null>(null);
    const [requestsError, setRequestsError] = useState<string | null>(null);

    useEffect(() => {
        sessionStorage.setItem('friends_activeTab', activeTab);
    }, [activeTab]);

    const fetchFriends = async () => {
        try {
            const data = await getFriends(apiFetch);
            setFriends(data);
            setFriendsError(null);
        } catch (err) {
            console.error('Failed to fetch friends list', err);
            setFriendsError(t('friends.errors.loadFriends'));
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const data = await getPendingRequests(apiFetch);
            setPendingRequests(data);
            setRequestsError(null);
        } catch (err) {
            console.error('Failed to fetch friend requests', err);
            setRequestsError(t('friends.errors.loadRequests'));
        }
    };

    useEffect(() => {
        Promise.all([fetchFriends(), fetchPendingRequests()])
            .finally(() => setLoading(false));
    }, [apiFetch]);

    const showNotification = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    useEffect(() => {
        if (!user) return;

        const socket = io('/notifications', { transports: ['websocket'] });

        socket.on('notification', (n: { type: string; payload: Record<string, string>; createdAt: string }) => {
            if (n.type === 'FRIEND_REQUEST' && n.payload.receiverId === user.id) {
                fetchPendingRequests();
            }

            if (n.type === 'FRIEND_ACCEPTED' && n.payload.receiverId === user.id) {
                fetchFriends();
                showNotification(t('friends.notifications.requestAcceptedByOther'), 'success');
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user, t]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchKeyword.trim()) return;
        try {
            const data = await apiSearchUsers(apiFetch, searchKeyword);
            setSearchResults(data);
        } catch (err) {
            console.error('Failed to search users', err);
            showNotification(t('friends.errors.searchFailed'), 'error');
        }
    };

    const sendRequest = async (receiverId: string) => {
        try {
            await apiSendRequest(apiFetch, receiverId);
            showNotification(t('friends.notifications.requestSent'), 'success');
        } catch (err: any) {
            showNotification(err.message || t('friends.errors.sendFailed'), 'error');
        }
    };

    const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
        try {
            if (action === 'accept') {
                await acceptRequest(apiFetch, requestId);
            } else {
                await rejectRequest(apiFetch, requestId);
            }
            showNotification(
                action === 'accept'
                    ? t('friends.notifications.requestAccepted')
                    : t('friends.notifications.requestRejected'),
                'success'
            );

            fetchPendingRequests();
            fetchFriends();

            window.dispatchEvent(new CustomEvent('update_navbar'));
        } catch (err: any) {
            showNotification(err.message || t('friends.errors.operationFailed'), 'error');
        }
    };

    const handleRemoveFriend = async (friendId: string, friendName: string) => {
        if (!confirm(t('friends.confirmRemove', { name: friendName }))) return;
        try {
            await removeFriend(apiFetch, friendId);
            showNotification(t('friends.notifications.friendRemoved'), 'success');
            fetchFriends();
        } catch (err: any) {
            showNotification(err.message || t('friends.errors.removeFailed'), 'error');
        }
    };

    return (
        <div className="text-text">
            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-success' : 'bg-danger'}`}>
                    {message.text}
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-border mb-6">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === 'friends' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
                        }`}
                >
                    {t('friends.tabs.myFriends')} ({friends.length})
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-3 px-4 font-medium transition-colors border-b-2 relative ${activeTab === 'requests' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
                        }`}
                >
                    {t('friends.tabs.requests')}
                    {pendingRequests.length > 0 && (
                        <span className="ml-2 bg-danger text-xs px-2 py-0.5 rounded-full">
                            {pendingRequests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === 'search' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
                        }`}
                >
                    {t('friends.tabs.addFriends')}
                </button>
            </div>

            {/* Tab 1: Friends List */}
            {activeTab === 'friends' && (
                <div className="space-y-3">
                    {loading ? (
                        <Loader text={t('friends.loading.friends')} />
                    ) : friendsError ? (
                        <p className="text-danger text-center py-8">{friendsError}</p>
                    ) : friends.length === 0 ? (
                        <EmptyState message={t('friends.empty.friends')} />
                    ) : (
                        friends.map((friend) => (
                            <FriendsCard key={friend.id} user={friend} subtitle={`@${friend.username}`}>
                                <Button onClick={() => alert(t('friends.notifications.redirectChat', { username: friend.username }))}>
                                    {t('friends.actions.chat')}
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => handleRemoveFriend(friend.id, friend.displayName || friend.username)}
                                >
                                    {t('friends.actions.remove')}
                                </Button>
                            </FriendsCard>
                        ))
                    )}
                </div>
            )}

            {/* Tab 2: Friend Requests */}
            {activeTab === 'requests' && (
                <div className="space-y-3">
                    {loading ? (
                        <Loader text={t('friends.loading.requests')} />
                    ) : requestsError ? (
                        <p className="text-danger text-center py-8">{requestsError}</p>
                    ) : pendingRequests.length === 0 ? (
                        <EmptyState message={t('friends.empty.requests')} />
                    ) : (
                        pendingRequests.map((req) => (
                            <FriendsCard key={req.id} user={req.sender} subtitle={t('friends.requestSubtitle')}>
                                <Button onClick={() => handleRequestAction(req.id, 'accept')}>
                                    {t('friends.actions.accept')}
                                </Button>
                                <Button variant="secondary" onClick={() => handleRequestAction(req.id, 'reject')}>
                                    {t('friends.actions.reject')}
                                </Button>
                            </FriendsCard>
                        ))
                    )}
                </div>
            )}

            {/* Tab 3: Search & Add Users */}
            {activeTab === 'search' && (
                <div>
                    <form onSubmit={handleSearch} className="flex space-x-2 mb-6">
                        <Input
                            size="md"
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearchKeyword(val);
                                if (!val.trim()) {
                                    setSearchResults([]);
                                }
                            }}
                            placeholder={t('friends.search.placeholder')}
                            className="flex-1"
                        />
                        <Button type="submit" size="lg">{t('friends.search.button')}</Button>
                    </form>

                    <div className="space-y-3">
                        {searchResults.length === 0 ? (
                            <p className="text-text-muted text-center py-4 text-sm">
                                {searchKeyword.trim() ? t('friends.search.noResults') : t('friends.search.enterKeywords')}
                            </p>
                        ) : (
                            searchResults.map((user) => (
                                <FriendsCard key={user.id} user={user} subtitle={`@${user.username}`}>
                                    <Button onClick={() => sendRequest(user.id)}>
                                        {t('friends.actions.addFriend')}
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => setSearchResults(searchResults.filter((u) => u.id !== user.id))}
                                        className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
                                        title={t('friends.actions.hideResult')}
                                    >
                                        ✕
                                    </button>
                                </FriendsCard>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}