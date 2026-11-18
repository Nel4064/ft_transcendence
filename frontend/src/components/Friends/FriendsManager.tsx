import Button from '../button/Button';
import Input from '../Input/Input';
import EmptyState from '../EmptyState/EmptyState';
import Loader from '../Loader/Loader';
import FriendsCard from './FriendsCard';
import React, { useState, useEffect } from 'react';
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
			setFriendsError('Could not load your friends. Please try again later.');
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const data = await getPendingRequests(apiFetch);
            setPendingRequests(data);
			setRequestsError(null);
        } catch (err) {
            console.error('Failed to fetch friend requests', err);
			setRequestsError('Could not load your friend requests. Please try again later.');
        }
    };

    // 初始拉取数据
    useEffect(() => {
		Promise.all([fetchFriends(), fetchPendingRequests()])
			.finally(() => setLoading(false));
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
			showNotification('Search failed, please try again', 'error');
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
                    {loading ? (
						<Loader text="Loading friends..." />
					) : friendsError ? (
						<p className="text-danger text-center py-8">{friendsError}</p>
					) : friends.length === 0 ? (
                        <EmptyState message="No friends yet, go add some!" />
                    ) : (
                        friends.map((friend) => (
							<FriendsCard key={friend.id} user={friend} subtitle={`@${friend.username}`}>
								<Button onClick={() => alert(`Redirecting to chat with ${friend.username}`)}>
									Chat
								</Button>
								<Button
									variant="danger"
									onClick={() => handleRemoveFriend(friend.id, friend.displayName || friend.username)}
								>
									Remove
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
						<Loader text="Loading request..." />
					) : requestsError ? (
						<p className="text-danger text-center py-8">{requestsError}</p>
					) : pendingRequests.length === 0 ? (
						<EmptyState message="No new friend request" />
                    ) : (
						pendingRequests.map((req) => (
							<FriendsCard key={req.id} user={req.sender} subtitle="Wants to add you as a friend">
								<Button onClick={() => handleRequestAction(req.id, 'accept')}>
									Accept
								</Button>
								<Button variant="secondary" onClick={() => handleRequestAction(req.id, 'reject')}>
									Reject
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
                            placeholder="Enter username or display name..."
                            className="flex-1"
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
								<FriendsCard key={user.id} user={user} subtitle={`@${user.username}`}>
									<Button onClick={() => sendRequest(user.id)}>Add Friend</Button>
									<button
										type="button"
										onClick={() => setSearchResults(searchResults.filter((u) => u.id !== user.id))}
										className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
										title="Hide this result"
									>
										x
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