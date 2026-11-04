import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
    // 从 sessionStorage 恢复状态，如果没有则使用默认值
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>(() => {
        return (sessionStorage.getItem('friends_activeTab') as any) || 'friends';
    });

    const [friends, setFriends] = useState<User[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

    const [searchKeyword, setSearchKeyword] = useState(() => {
        return sessionStorage.getItem('friends_searchKeyword') || '';
    });

    const [searchResults, setSearchResults] = useState<User[]>(() => {
        const cached = sessionStorage.getItem('friends_searchResults');
        return cached ? JSON.parse(cached) : [];
    });

    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const getToken = () => localStorage.getItem('jwt_token') || localStorage.getItem('token') || '';
    const API_URL = 'http://localhost:3000/api';

    const navigate = useNavigate();

    // 每次状态改变时，实时存入 sessionStorage
    useEffect(() => {
        sessionStorage.setItem('friends_activeTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        sessionStorage.setItem('friends_searchKeyword', searchKeyword);
    }, [searchKeyword]);

    useEffect(() => {
        sessionStorage.setItem('friends_searchResults', JSON.stringify(searchResults));
    }, [searchResults]);

    const fetchFriends = async () => {
        try {
            const res = await axios.get(`${API_URL}/friends`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            setFriends(res.data);
        } catch (err) {
            console.error('Failed to fetch friends list', err);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const res = await axios.get(`${API_URL}/friends/requests`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            setPendingRequests(res.data);
        } catch (err) {
            console.error('Failed to fetch friend requests', err);
        }
    };

    useEffect(() => {
        fetchFriends();
        fetchPendingRequests();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchKeyword.trim()) return;
        try {
            const res = await axios.get(`${API_URL}/friends/search?keyword=${searchKeyword}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            setSearchResults(res.data);
        } catch (err) {
            console.error('Failed to search users', err);
        }
    };

    const sendRequest = async (receiverId: string) => {
        try {
            await axios.post(
                `${API_URL}/friends/request`,
                { receiverId },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            showNotification('Friend request sent successfully!', 'success');
        } catch (err: any) {
            showNotification(err.response?.data?.message || 'Failed to send request', 'error');
        }
    };

    const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
        try {
            await axios.post(`${API_URL}/friends/${action}/${requestId}`, {}, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            showNotification(action === 'accept' ? 'Friend request accepted' : 'Friend request rejected', 'success');
            fetchPendingRequests();
            fetchFriends();
        } catch (err) {
            showNotification('Operation failed', 'error');
        }
    };

    const showNotification = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
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
                        // 离开或关闭时清空缓存，可根据需要保留或清除
                        sessionStorage.removeItem('friends_activeTab');
                        sessionStorage.removeItem('friends_searchKeyword');
                        sessionStorage.removeItem('friends_searchResults');
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
                                        className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center font-bold cursor-pointer hover:opacity-80 transition-opacity"
                                        title="Click to view profile"
                                    >
                                        {friend.displayName?.[0] || friend.username[0]}
                                    </div>
                                    <div>
                                        <div className="font-semibold">{friend.displayName || friend.username}</div>
                                        <div className="text-xs text-slate-400">@{friend.username}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => alert(`Redirecting to chat with ${friend.username}`)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-sm rounded-lg transition-colors"
                                >
                                    Chat
                                </button>
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
                                        className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold cursor-pointer hover:opacity-80 transition-opacity"
                                        title="Click to view profile"
                                    >
                                        {req.sender.displayName?.[0] || req.sender.username[0]}
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
                                // 如果用户把输入框清空了，自动清空搜索结果列表
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
                        {/* 只有当输入框有内容，且搜索结果为空时，才显示 No matching users found */}
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
                                            className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold cursor-pointer hover:opacity-80 transition-opacity"
                                            title="Click to view profile"
                                        >
                                            {user.displayName?.[0] || user.username[0]}
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