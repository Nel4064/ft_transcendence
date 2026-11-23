import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDirectHistory } from '../../api/chat'
import type { Socket } from 'socket.io-client'
import Avatar from '../../components/Avatar/Avatar'
import Button from '../../components/button/Button'
import { formatMessageTime } from '../../utils/formatMessageTime'

export type Message = {
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

export type FriendUser = {
	id: string;
	username: string;
	displayName: string;
	avatarUrl?: string | null;
};

function getMessageDateKey(dateString: string): string {
	return new Date(dateString).toDateString();
}

function getMessageDateLabel(dateString: string): string {
	const date = new Date(dateString);
	const dateKey = getMessageDateKey(dateString);
	const today = new Date();
	if (dateKey === today.toDateString()) return 'Today';

	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (dateKey === yesterday.toDateString()) return 'Yesterday';

	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

function shouldGroupMessage(previousMessage: Message | undefined, message: Message): boolean {
	if (!previousMessage || previousMessage.senderId !== message.senderId) return false;
	if (getMessageDateKey(previousMessage.createdAt) !== getMessageDateKey(message.createdAt)) return false;

	const elapsed = new Date(message.createdAt).getTime() - new Date(previousMessage.createdAt).getTime();
	return elapsed >= 0 && elapsed <= 5 * 60 * 1000;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : '';
}

function isConversationMissing(error: unknown): boolean {
	return /validation failed \(uuid is expected\)|invalid uuid|not found|404/i.test(getErrorMessage(error));
}

function mergeMessages(currentMessages: Message[], incomingMessages: Message[]): Message[] {
	const messagesById = new Map<string, Message>();
	for (const message of currentMessages) {
		messagesById.set(message.id, message);
	}
	for (const message of incomingMessages) {
		messagesById.set(message.id, message);
	}
	return [...messagesById.values()].sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	);
}

interface ChatWindowProps {
    friendId?: string;
	socket: Socket | null;
}

export default function ChatWindow({ friendId, socket }: ChatWindowProps) {
	const { user, apiFetch } = useAuth();
	const navigate = useNavigate();
	const bottomRef = useRef<HTMLDivElement | null>(null);
	const activeFriendIdRef = useRef(friendId);

	const [loading, setLoading] = useState(true);
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sendError, setSendError] = useState<string | null>(null);
	const [friendUser, setFriendUser] = useState<FriendUser | null>(null);
	const [isFriend, setIsFriend] = useState(true);
	// get history + friend info
	useEffect(() => {
		activeFriendIdRef.current = friendId;
		setIsFriend(true);
		setInput('');
		setIsSending(false);
		setSendError(null);
		if (!friendId) return;
		let isCancelled = false;
		setLoading(true);
		setError(null);
		setMessages([]);
		setFriendUser(null);

		const fetchData = async () => {
			const [historyResult, profileResult] = await Promise.allSettled([
				getDirectHistory(apiFetch, friendId),
				apiFetch(`/users/${friendId}`),
			]);
			if (isCancelled) return;

			if (profileResult.status === 'fulfilled') {
				setFriendUser(profileResult.value);
			}

			if (profileResult.status === 'rejected') {
				setError(
					isConversationMissing(profileResult.reason)
						|| (historyResult.status === 'rejected' && isConversationMissing(historyResult.reason))
						? "This conversation doesn't exist."
						: 'Unable to load this conversation. Please try again.',
				);
			} else if (historyResult.status === 'fulfilled') {
				setMessages((currentMessages) => mergeMessages(currentMessages, historyResult.value));
			} else {
				const errorText = getErrorMessage(historyResult.reason);
				if (errorText.toLowerCase().includes('not friends') || errorText.includes('403')) {
					setIsFriend(false);
				} else {
					setError(
						isConversationMissing(historyResult.reason)
							? "This conversation doesn't exist."
							: 'Unable to load this conversation. Please try again.',
					);
				}
			}

			setLoading(false);
		};
		void fetchData();
		return () => { isCancelled = true; };
	}, [friendId, apiFetch]);

	// listen to the page-scoped websocket connection
	useEffect(() => {
		if (!socket) return;

		const handleNewMessage = (msg: Message) => {
			if (msg.senderId === friendId || msg.receiverId === friendId) {
				setMessages((currentMessages) => mergeMessages(currentMessages, [msg]));
			}
		};

		socket.on('newMessage', handleNewMessage);
		return () => {
			socket.off('newMessage', handleNewMessage);
		};
	}, [friendId, socket]);

	// auto scroll to bottom
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	function handleSend() {
		const text = input.trim();
		const targetFriendId = friendId;
		if (!text || !isFriend || isSending || !targetFriendId || !socket) return;

		setIsSending(true);
		setSendError(null);
		socket.timeout(10000).emit(
			'sendMessage',
			{ receiverId: targetFriendId, content: text },
			(timeoutError: Error | null, response?: { status?: string; message?: string }) => {
				if (activeFriendIdRef.current !== targetFriendId) return;
				setIsSending(false);
				if (timeoutError) {
					setSendError('Message could not be sent. Please try again.');
					return;
				}
				if (response?.status !== 'ok') {
					const message = response?.message || 'Message could not be sent. Please try again.';
					if (message.toLowerCase().includes('not friends')) setIsFriend(false);
					setSendError(message);
					return;
				}
				setInput((currentInput) => currentInput === text ? '' : currentInput);
			},
		);
	}

	return (
		<div className="flex-1 flex flex-col h-full">

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
					onClick={() => friendUser && navigate(`/users/${friendUser.id}`)}
					title="Click to view profile"
				>
					{friendUser && (
						<Avatar
							src={friendUser.avatarUrl}
							name={friendUser.displayName || friendUser.username}
							size={42}
						/>
					)}
					<div className="flex flex-col">
						<h2 className="font-bold text-text text-base leading-snug">
							{friendUser
								? friendUser.displayName || friendUser.username
								: error ? 'Conversation unavailable' : 'Loading...'}
						</h2>
						{friendUser?.username && (
							<p className="text-xs text-text-muted">@{friendUser.username}</p>
						)}
					</div>
				</div>
			</div>

			{/* MESSAGE LIST */}
			<div className="flex-1 overflow-y-auto p-6">

				{/* loading */}
				{loading && (
					<p className="text-center text-text-muted text-sm py-8">Loading...</p>
				)}

				{/* error */}
				{!loading && error && (
					<div className="flex flex-col items-center gap-3 py-8 text-center">
						<p role="alert" className="py-2 px-3 rounded-md bg-danger/10 text-danger text-body font-bold text-center">
							{error}
						</p>
						<Button variant="secondary" onClick={() => navigate('/friends')}>
							Back to Friends
						</Button>
					</div>
				)}

				{/* empty */}
				{!loading && !error && messages.length === 0 && (
					<p className="text-center text-text-muted text-sm py-8">
						{isFriend? "No messages yet. Say hello!" : "No conversation history available."}
					</p>
				)}

				{/* messages */}
				{!loading && !error && messages.map((msg, index) => {
					const isMe = msg.senderId === user?.id;
					const previousMessage = messages[index - 1];
					const nextMessage = messages[index + 1];
					const showDateSeparator = !previousMessage
						|| getMessageDateKey(previousMessage.createdAt) !== getMessageDateKey(msg.createdAt);
					const isGrouped = shouldGroupMessage(previousMessage, msg);
					const groupsWithNext = nextMessage !== undefined && shouldGroupMessage(msg, nextMessage);
					return (
						<div key={msg.id} className={groupsWithNext ? 'mb-1' : 'mb-4'}>
							{showDateSeparator && (
								<div className="mb-4 flex items-center gap-3 py-1">
									<div className="h-px flex-1 bg-border" />
									<span className="text-xs font-medium text-text-muted">
										{getMessageDateLabel(msg.createdAt)}
									</span>
									<div className="h-px flex-1 bg-border" />
								</div>
							)}
							{isMe ? (
								<div className="flex justify-end">
									<div className="flex max-w-[70%] flex-col items-end">
										{!isGrouped && (
											<time dateTime={msg.createdAt} className="mb-1 px-1 text-[11px] text-text-muted">
												{formatMessageTime(msg.createdAt)}
											</time>
										)}
										<div className="rounded-l-2xl rounded-br-2xl bg-brand px-4 py-2.5 text-sm leading-relaxed break-words text-white">
											{msg.content}
										</div>
									</div>
								</div>
							) : (
								<div className="flex items-start gap-2">
									{!isGrouped ? (
										<Avatar
											src={msg.sender.avatarUrl}
											name={msg.sender.displayName || msg.sender.username}
											size={32}
										/>
									) : (
										<div aria-hidden="true" className="w-8 flex-shrink-0" />
									)}
									<div className="flex max-w-[70%] flex-col items-start">
										{!isGrouped && (
											<div className="mb-1 flex items-baseline gap-2 px-1">
												<span className="text-xs font-semibold text-text">
													{msg.sender.displayName || msg.sender.username}
												</span>
												<time dateTime={msg.createdAt} className="text-[11px] text-text-muted">
													{formatMessageTime(msg.createdAt)}
												</time>
											</div>
										)}
										<div className="rounded-r-2xl rounded-bl-2xl bg-slate-100 px-4 py-2.5 text-sm leading-relaxed break-words text-text">
											{msg.content}
										</div>
									</div>
								</div>
							)}
						</div>
					);
				})}

				{/* scroll anchor */}
				<div ref={bottomRef} />
			</div>

			{/* INPUT FORM */}
			{sendError && (
				<p role="alert" className="mx-4 mt-3 py-2 px-3 rounded-md bg-danger/10 text-danger text-body font-bold text-center">
					{sendError}
				</p>
			)}
			{error ? null : isFriend? (
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
							disabled={!isFriend || isSending}
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
						disabled={!isFriend || !input.trim() || isSending}
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
		</div>
	);
}
