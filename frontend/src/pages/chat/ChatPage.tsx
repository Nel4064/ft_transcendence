import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState, useEffect, useRef } from 'react'
import { getDirectHistory } from '../../api/chat'
import { io, Socket } from 'socket.io-client'
import Avatar from '../../components/Avatar/Avatar'
import Button from '../../components/button/Button'

type Message = {
	id: string;
	content: string;
	senderId: string;
	receiverId: string;
	createdAt: string;
	sender: {
		id: string;
		username: string;
		displayName: string;
		avatarUrl?: string | null;
	};
};

type FriendUser = {
	id: string;
	username: string;
	displayName: string;
	avatarUrl?: string | null;
};

function isSameDate(date1: Date, date2: Date): boolean {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
}

function formatMessageTime(dateString: string): string {
	const targetDate = new Date(dateString);
	const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false});
	const dateStr = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	
	if (isSameDate(targetDate, today))
		return (timeStr);
	else if (isSameDate(targetDate, yesterday))
		return (`yesterday ${timeStr}`);
	else
		return (`${dateStr} ${timeStr}`);
};

export default function ChatPage() {
	const { friendId } = useParams();
	const { user, apiFetch } = useAuth();
	const navigate = useNavigate();
	const bottomRef = useRef<HTMLDivElement | null>(null);
	const socketRef = useRef<Socket | null>(null);

	const [loading, setLoading] = useState(true);
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [friendUser, setFriendUser] = useState<FriendUser | null>(null);
	const [isFriend, setIsFriend] = useState(true);
	// get history + friend info
	useEffect(() => {
		if (!friendId) return;
		let isCancelled = false;
		setLoading(true);
		setError(null);
		setMessages([]);
		setFriendUser(null);

		const fetchData = async () => {
			try {
				const [historyData, userData] = await Promise.all([
					getDirectHistory(apiFetch, friendId),
					apiFetch(`/users/${friendId}`),
				]);
				if (!isCancelled) {
					setMessages(historyData);
					setFriendUser(userData);
				}
			} catch (err: any) {
				if (!isCancelled)
				{
					const errorText = err.message || 'Failed to load history';
					if (errorText.toLowerCase().includes('not friends') || errorText.includes('403')){
						setIsFriend(false);
					}
					else {
						setError(errorText);
					}
				}
				// console.error('Failed to load history:', err);
			} finally {
				if (!isCancelled) setLoading(false);
			}
		};
		fetchData();
		return () => { isCancelled = true; };
	}, [friendId, apiFetch]);

	// websocket connection
	useEffect(() => {
		const token = localStorage.getItem('token');
		const socket = io('/chat', {
			auth: { token: `Bearer ${token}` },
		});
		socketRef.current = socket;

		socket.on('newMessage', (msg) => {
			if (msg.senderId === friendId || msg.receiverId === friendId) {
				setMessages(prev => {
					if (prev.some(m => m.id === msg.id)) return prev;
					return [...prev, msg];
				});
			}
		});

		socket.on('chatError', (errormsg) => {
			console.error(errormsg);
			    const msg = typeof errormsg === 'string' ? errormsg : errormsg?.message;
    			if (msg && msg.toLowerCase().includes('not friends')) {
    			    setIsFriend(false);
    			}
		});

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, [friendId]);

	// auto scroll to bottom
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	function handleSend() {
		const text = input.trim();
		if (!text || !isFriend) return;
		if (!socketRef.current) return;
		socketRef.current.emit('sendMessage', {
			receiverId: friendId,
			content: text,
		});
		setInput('');
	}

	return (
		<main className="max-w-[800px] mx-auto h-[calc(100vh-120px)] flex flex-col">

			{/* HEADER */}
			<div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-surface">
				{/* back to friends page */}
				<button
					type="button"
					onClick={() => navigate('/friends')}
					className="py-1 px-2 text-sm text-text-muted hover:text-text hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
					title="Back to Friends"
				>
					← Friends
				</button>

				{/* avatar & friend name */}
				<div
					className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
					onClick={() => friendId && navigate(`/users/${friendId}`)}
					title="Click to view profile"
				>
					<Avatar
						src={friendUser?.avatarUrl}
						name={friendUser?.displayName || friendUser?.username}
						size={42}
					/>
					<div className="flex flex-col">
						<h2 className="font-bold text-text text-base leading-snug">
							{friendUser?.displayName || friendUser?.username || 'Loading...'}
						</h2>
						{friendUser?.username && (
							<p className="text-xs text-text-muted">@{friendUser.username}</p>
						)}
					</div>
				</div>
			</div>

			{/* MESSAGE LIST */}
			<div className="flex-1 overflow-y-auto p-6 space-y-4">

				{/* loading */}
				{loading && (
					<p className="text-center text-text-muted text-sm py-8">Loading...</p>
				)}

				{/* error */}
				{!loading && error && (
					<p className="text-center text-rose-500 text-sm py-8">{error}</p>
				)}

				{/* empty */}
				{!loading && !error && messages.length === 0 && (
					<p className="text-center text-text-muted text-sm py-8">
						{isFriend? "No messages yet. Say hello!" : "No conversation history available."}
					</p>
				)}

				{/* messages */}
				{!loading && !error && messages.map((msg) => {
					const isMe = msg.senderId === user?.id;
					return (
						<div
							key={msg.id}
							className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
						>
							{/* opponent avatar */}
							{!isMe && (
								<div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 flex-shrink-0 overflow-hidden">
									{msg.sender.avatarUrl
										? <img src={msg.sender.avatarUrl} alt={msg.sender.displayName} className="w-full h-full object-cover" />
										: (msg.sender.displayName || msg.sender.username).slice(0, 2).toUpperCase()
									}
								</div>
							)}

							{/* bubble */}
							<div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
								<div className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
									isMe
										? 'bg-brand text-white rounded-l-2xl rounded-br-2xl'
										: 'bg-slate-100 text-text rounded-r-2xl rounded-bl-2xl'
								}`}>
									{msg.content}
								</div>
								<span className="text-[11px] text-text-muted mt-1 px-1">
									{formatMessageTime(msg.createdAt)}
								</span>
							</div>
						</div>
					);
				})}

				{/* scroll anchor */}
				<div ref={bottomRef} />
			</div>

			{/* INPUT FORM */}
			{isFriend? (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleSend();
					}}
					className="p-4 border-t border-border bg-surface flex items-center gap-3"
				>
					<div className="relative flex-1">
						<input
							type="text"
							value={input}
							disabled={!isFriend}
							maxLength={500}
							onChange={(e) => setInput(e.target.value)}
							placeholder={isFriend? "Type a message..." : "Messaging disabled"}
							className="w-full py-2.5 px-6 bg-slate-50 border border-border rounded-full text-sm focus:outline-none focus:border-brand transition-colors"
						/>
						{input.length > 400 && (
							<span className="absolute right-3 bottom-3.5 text-xs text-text-muted">
								{500 - input.length}
							</span>
						)}
					</div>
					{/* send button */}
					<button
						type="submit"
						disabled={!isFriend || !input.trim()}
						className="px-5 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full text-sm font-bold transition-colors"
					>
						Send
					</button>
				</form>
			):(
				<div className="p-4 border-t border-border bg-slate-50 flex items-center justify-between px-6 text-sm">
					<span className="text-text-muted">
						You cannot send messages because you are not friends.
					</span>
					<Button
						variant="secondary"
						size="md"
						onClick={() => navigate('/friends')}
						className="text-xs !py-1.5 !px-3"
					>
						Go to Friends
					</Button>
				</div>
			)}
		</main>
	);
}
