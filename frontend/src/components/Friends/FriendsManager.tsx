import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
    const { apiFetch } = useAuth();

    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>(() => {
        return (sessionStorage.getItem('friends_activeTab') as any) || 'friends';
    });

    const [friends, setFriends] = useState<User[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

    // 修改点 1：直接初始化为空字符串和空数组，不再读取 sessionStorage
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);

    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        sessionStorage.setItem('friends_activeTab', activeTab);
    }, [activeTab]);

    // 修改点 2：删除了监听 searchKeyword 和 searchResults 写入 sessionStorage 的 useEffect

    const fetchFriends = async () => {
        try {
            const data = await getFriends(apiFetch);
            setFriends(data);
        } catch (err) {
            console.error('Failed to fetch friends list', err);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const data = await getPendingRequests(apiFetch);
            setPendingRequests(data);
        } catch (err) {
            console.error('Failed to fetch friend requests', err);
        }
    };

    useEffect(() => {
        fetchFriends();
        fetchPendingRequests();
    }, [apiFetch]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchKeyword.trim()) return;
        try {
            const data = await apiSearchUsers(apiFetch, searchKeyword);
            setSearchResults(data);
        } catch (err) {
            console.error('Failed to search users', err);
        }
    };

    const sendRequest = async (receiverId: string) => {
        try {
            await apiSendRequest(apiFetch, receiverId);
            showNotification('Friend request sent successfully!', 'success');
        } catch (err: any) {
            showNotification(err.message || 'Failed to send request', 'error');
        }
    };

    const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
        try {
            if (action === 'accept') {
                await acceptRequest(apiFetch, requestId);
            } else {
                await rejectRequest(apiFetch, requestId);
            }
            showNotification(action === 'accept' ? 'Friend request accepted' : 'Friend request rejected', 'success');
            fetchPendingRequests();
            fetchFriends();
            window.dispatchEvent(new CustomEvent('update_friend_requests'));
        } catch (err: any) {
            showNotification(err.message || 'Operation failed', 'error');
        }
    };

    const showNotification = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const getInitials = (user: { displayName?: string; username: string }) => {
        const name = user.displayName || user.username;
        if (!name) return 'U';

        const words = name.trim().split(/\s+/);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        } else {
            return name.slice(0, 2).toUpperCase();
        }
    };

    const handleRemoveFriend = async (friendId: string, friendName: string) => {
        if (!confirm(`Are you sure you want to remove ${friendName} from your friends?`)) return;
        try {
            await removeFriend(apiFetch, friendId);
            showNotification('Friend removed successfully', 'success');
            fetchFriends();
        } catch (err: any) {
            showNotification(err.message || 'Failed to remove friend', 'error');
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-slate-900 text-white rounded-xl shadow-xl relative">
            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    {message.text}
                </div>
            )}

            {/* Top Header & Close Button */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-indigo-400">Friends Center</h2>
                <button
                    onClick={() => {
                        sessionStorage.removeItem('friends_activeTab');
                        // 修改点 3：不再需要清理搜索相关的 sessionStorage
                        navigate('/');
                    }}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Close / Back to Home"
                >
                    ✕
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-700 mb-6">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === 'friends' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                >
                    My Friends ({friends.length})
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-3 px-4 font-medium transition-colors border-b-2 relative ${activeTab === 'requests' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                >
                    Friend Requests
                    {pendingRequests.length > 0 && (
                        <span className="ml-2 bg-rose-500 text-xs px-2 py-0.5 rounded-full">
                            {pendingRequests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === 'search' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                >
                    Add Friends
                </button>
            </div>

            {/* Tab 1: Friends List */}
            {activeTab === 'friends' && (
                <div className="space-y-3">
                    {friends.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No friends yet, go add some!</p>
                    ) : (
                        friends.map((friend) => (
                            <div key={friend.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div
                                        onClick={() => navigate(`/users/${friend.id}`)}
                                        className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                                        title="Click to view profile"
                                    >
                                        {friend.avatarUrl ? (
                                            <img src={friend.avatarUrl} alt={friend.displayName || friend.username} className="w-full h-full object-cover" />
                                        ) : (
                                            getInitials(friend)
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-semibold">{friend.displayName || friend.username}</div>
                                        <div className="text-xs text-slate-400">@{friend.username}</div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => alert(`Redirecting to chat with ${friend.username}`)}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-sm rounded-lg transition-colors"
                                    >
                                        Chat
                                    </button>
                                    <button
                                        onClick={() => handleRemoveFriend(friend.id, friend.displayName || friend.username)}
                                        className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-sm rounded-lg transition-colors text-white font-medium"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Tab 2: Friend Requests */}
            {activeTab === 'requests' && (
                <div className="space-y-3">
                    {pendingRequests.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No new friend requests</p>
                    ) : (
                        pendingRequests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div
                                        onClick={() => navigate(`/users/${req.sender.id}`)}
                                        className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                                        title="Click to view profile"
                                    >
                                        {req.sender.avatarUrl ? (
                                            <img src={req.sender.avatarUrl} alt={req.sender.displayName || req.sender.username} className="w-full h-full object-cover" />
                                        ) : (
                                            getInitials(req.sender)
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-semibold">{req.sender.displayName || req.sender.username}</div>
                                        <div className="text-xs text-slate-400">Wants to add you as a friend</div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleRequestAction(req.id, 'accept')}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-sm rounded-lg transition-colors"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleRequestAction(req.id, 'reject')}
                                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-sm rounded-lg transition-colors"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Tab 3: Search & Add Users */}
            {activeTab === 'search' && (
                <div>
                    <form onSubmit={handleSearch} className="flex space-x-2 mb-6">
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearchKeyword(val);
                                if (!val.trim()) {
                                    setSearchResults([]);
                                }
                            }}
                            placeholder="Enter username or display name..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors font-medium"
                        >
                            Search
                        </button>
                    </form>

                    <div className="space-y-3">
                        {searchResults.length === 0 ? (
                            <p className="text-slate-500 text-center py-4 text-sm">
                                {searchKeyword.trim() ? 'No matching users found' : 'Enter keywords to start searching'}
                            </p>
                        ) : (
                            searchResults.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div
                                            onClick={() => navigate(`/users/${user.id}`)}
                                            className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                                            title="Click to view profile"
                                        >
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt={user.displayName || user.username} className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(user)
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold">{user.displayName || user.username}</div>
                                            <div className="text-xs text-slate-400">@{user.username}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => sendRequest(user.id)}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-sm rounded-lg transition-colors"
                                        >
                                            Add Friend
                                        </button>
                                        <button
                                            onClick={() => setSearchResults(searchResults.filter((u) => u.id !== user.id))}
                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                            title="Close"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}