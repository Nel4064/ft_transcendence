import Button from '../button/Button';
import Avatar from '../Avatar/Avatar';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client'; // ✨ 引入 socket.io-client
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
    // ✨ 从 useAuth 提取 user
    const { apiFetch, user } = useAuth(); 

    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>(() => {
        return (sessionStorage.getItem('friends_activeTab') as any) || 'friends';
    });

    const [friends, setFriends] = useState<User[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);

    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        sessionStorage.setItem('friends_activeTab', activeTab);
    }, [activeTab]);

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

    // 初始拉取数据
    useEffect(() => {
        fetchFriends();
        fetchPendingRequests();
    }, [apiFetch]);

    const showNotification = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    // ✨✨✨ WebSocket 监听：实时同步收到的请求和被接受的请求 ✨✨✨
    useEffect(() => {
        if (!user) return; 

        const socket = io('/notifications', { transports: ['websocket'] });

        socket.on('notification', (n: { type: string; payload: Record<string, string>; createdAt: string }) => {
            
            // 场景 1: 别人发给我好友请求 -> 刷新待处理列表
            if (n.type === 'FRIEND_REQUEST' && n.payload.receiverId === user.id) {
                console.log('收到新的好友请求，刷新列表...');
                fetchPendingRequests(); 
            }

            // 场景 2: 我发出的请求被别人接受了 -> 刷新我的好友列表 (人数自动 +1)
            if (n.type === 'FRIEND_ACCEPTED' && n.payload.receiverId === user.id) {
                console.log('对方通过了你的好友请求！刷新好友列表...');
                fetchFriends(); 
                showNotification('Someone accepted your friend request!', 'success'); 
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

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
            
            // ✨ 通知 Navbar 刷新红点
            window.dispatchEvent(new CustomEvent('update_navbar'));
            
        } catch (err: any) {
            showNotification(err.message || 'Operation failed', 'error');
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
        <div className="max-w-2xl mx-auto my-12 p-6 bg-surface border border-border text-text rounded-lg shadow-card relative">
            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-admin' : 'bg-danger'}`}>
                    {message.text}
                </div>
            )}

            {/* Top Header & Close Button */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif font-bold text-section text-text">Friends Center</h2>
                <button
                    onClick={() => {
                        sessionStorage.removeItem('friends_activeTab');
                        navigate('/');
                    }}
                    className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
                    title="Close / Back to Home"
                >
                    ✕
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-border mb-6">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === 'friends' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
                        }`}
                >
                    My Friends ({friends.length})
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-3 px-4 font-medium transition-colors border-b-2 relative ${activeTab === 'requests' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'
                        }`}
                >
                    Friend Requests
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
                    Add Friends
                </button>
            </div>

            {/* Tab 1: Friends List */}
            {activeTab === 'friends' && (
                <div className="space-y-3">
                    {friends.length === 0 ? (
                        <p className="text-text-muted text-center py-8">No friends yet, go add some!</p>
                    ) : (
                        friends.map((friend) => (
                            <div key={friend.id} className="flex items-center justify-between p-3 bg-bg border border-border rounded-md">
                                <div className="flex items-center space-x-3">
                                    <div
                                        onClick={() => navigate(`/users/${friend.id}`)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                        title="Click to view profile"
                                    >
										<Avatar src={friend.avatarUrl} name={friend.displayName || friend.username} size={40} />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{friend.displayName || friend.username}</div>
                                        <div className="text-xs text-text-muted">@{friend.username}</div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Button onClick={() => alert(`Redirecting to chat with ${friend.username}`)}>
                                        Chat
                                    </Button>
                                    <Button
										variant="danger"
                                        onClick={() => handleRemoveFriend(friend.id, friend.displayName || friend.username)}
									>
                                        Remove
                                    </Button>
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
                        <p className="text-text-muted text-center py-8">No new friend requests</p>
                    ) : (
                        pendingRequests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between p-3 bg-bg border border-border rounded-md">
                                <div className="flex items-center space-x-3">
                                    <div
                                        onClick={() => navigate(`/users/${req.sender.id}`)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                        title="Click to view profile"
                                    >
										<Avatar src={req.sender.avatarUrl} name={req.sender.displayName || req.sender.username} size={40} />
                                    </div>
                                    <div>
                                        <div className="font-semibold">{req.sender.displayName || req.sender.username}</div>
                                        <div className="text-xs text-text-muted">Wants to add you as a friend</div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <Button
                                        onClick={() => handleRequestAction(req.id, 'accept')}>Accept
                                    </Button>
                                    <Button
										variant="secondary"
                                        onClick={() => handleRequestAction(req.id, 'reject')}>
                                        Reject
                                    </Button>
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
                            className="flex-1 bg-surface border border-border rounded-md px-4 py-2 text-text placeholder-text-light focus:outline-none focus:border-brand"
                        />
                        <Button type="submit" size="lg">Search</Button>
                    </form>

                    <div className="space-y-3">
                        {searchResults.length === 0 ? (
                            <p className="text-text-muted text-center py-4 text-sm">
                                {searchKeyword.trim() ? 'No matching users found' : 'Enter keywords to start searching'}
                            </p>
                        ) : (
                            searchResults.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-bg border border-border rounded-md">
                                    <div className="flex items-center space-x-3">
                                        <div
                                            onClick={() => navigate(`/users/${user.id}`)}
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                            title="Click to view profile"
                                        >
											<Avatar src={user.avatarUrl} name={user.displayName || user.username} size={40} />
                                        </div>
                                        <div>
                                            <div className="font-semibold">{user.displayName || user.username}</div>
                                            <div className="text-xs text-text-muted">@{user.username}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button onClick={() => sendRequest(user.id)}>Add Friend</Button>
                                        <button
                                            onClick={() => setSearchResults(searchResults.filter((u) => u.id !== user.id))}
                                            className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
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