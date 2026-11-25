import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import ChatWindow, { type Message } from '../../components/Chat/ChatWindow';
import ChatSidebar, { type ChatTab } from '../../components/Chat/ChatSidebar';
import { useAuth } from '../../context/AuthContext';

export default function ChatPage() {
    const { friendId } = useParams();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<ChatTab>('friends');
    const [chatSocket, setChatSocket] = useState<Socket | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const activeFriendIdRef = useRef<string | undefined>(
        activeTab === 'friends' ? friendId : undefined,
    );

    useEffect(() => {
        activeFriendIdRef.current = activeTab === 'friends' ? friendId : undefined;
    }, [activeTab, friendId]);

    useEffect(() => {
        if (!user?.id) {
            setChatSocket(null);
            return;
        }

        const token = localStorage.getItem('token');
        const socket = io('/chat', {
            auth: { token: `Bearer ${token}` },
        });

        socket.on('newMessage', (message: Message) => {
            if (message.receiverId !== user.id || message.senderId === activeFriendIdRef.current) {
                return;
            }

            setUnreadCounts((current) => ({
                ...current,
                [message.senderId]: (current[message.senderId] ?? 0) + 1,
            }));
        });
        setChatSocket(socket);

        return () => {
            socket.disconnect();
        };
    }, [user?.id]);

    useEffect(() => {
        if (activeTab !== 'friends' || !friendId) return;

        setUnreadCounts((current) => {
            if (!current[friendId]) return current;
            const updated = { ...current };
            delete updated[friendId];
            return updated;
        });
    }, [activeTab, friendId]);

    return (
        <main className="mx-auto flex h-[calc(100vh-120px)] w-full max-w-[1200px] min-h-0 px-4 py-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface md:flex-row">
                <ChatSidebar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    activeFriendId={friendId}
                    unreadCounts={unreadCounts}
                />

                <section className="min-h-0 min-w-0 flex-1">
                    {activeTab === 'friends' ? (
                        <ChatWindow friendId={friendId} socket={chatSocket} />
                    ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-text-muted">
                            Event group chat will be available here.
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}