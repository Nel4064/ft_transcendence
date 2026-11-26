import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { getDirectHistory } from '../../api/chat'
import type { Socket } from 'socket.io-client'
import Avatar from '../../components/Avatar/Avatar'
import Button from '../../components/button/Button'
import MessageBubble from './MessageBubble'
import { isSameDate, getMessageDateLabel } from '../../utils/formatMessageTime'
import { mergeMessages, shouldGroupMessage } from '../../utils/groupedMessages'

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getErrorStatus(error: unknown): number | undefined {
	if (typeof error === 'object' && error !== null && 'status' in error) {
		const status = (error as { status?: unknown }).status;
		return typeof status === 'number' ? status : undefined;
	}
	return undefined;
}

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

interface ChatWindowProps {
    friendId?: string;
	socket: Socket | null;
}

export default function ChatWindow({ friendId, socket }: ChatWindowProps) {
	const { t } = useTranslation();
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
		setMessages([]);
		setFriendUser(null);
		if (!friendId) return;

		if (!UUID_REGEX.test(friendId)) {
			setError(t('chat.errors.notFound', "This conversation doesn't exist."));
			setLoading(false);
			return;
		}

		let isCancelled = false;
		setLoading(true);
		setError(null);

		const fetchData = async () => {
			const [historyResult, profileResult] = await Promise.allSettled([
				getDirectHistory(apiFetch, friendId),
				apiFetch(`/users/${friendId}`),
			]);
			if (isCancelled) return;

			if (profileResult.status === 'rejected') {
				const status = getErrorStatus(profileResult.reason);
				setError(
					status === 404 || status === 400
						? t('chat.errors.notFound', "This conversation doesn't exist.")
						: t('chat.errors.loadFailed', 'Unable to load this conversation. Please try again.'),
				);
				setLoading(false);
				return;
			}

			setFriendUser(profileResult.value);

			if (historyResult.status === 'fulfilled') {
				setMessages((currentMessages) => mergeMessages(currentMessages, historyResult.value));
			} else {
				const status = getErrorStatus(historyResult.reason);
				if (status === 403) {
					setIsFriend(false);
				} else if (status === 404 || status === 400) {
					setError(t('chat.errors.notFound', "This conversation doesn't exist."));
				} else {
					setError(t('chat.errors.loadFailed', 'Unable to load this conversation. Please try again.'));
				}
			}

			setLoading(false);
		};
		void fetchData();
		return () => { isCancelled = true; };
	}, [friendId, apiFetch, t]);

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
			(timeoutError: Error | null, response?: { status?: string; code?: number; message?: string }) => {
				if (activeFriendIdRef.current !== targetFriendId) return;
				setIsSending(false);
				if (timeoutError) {
					setSendError(t('chat.errors.sendFailed', 'Message could not be sent. Please try again.'));
					return;
				}
				if (response?.status !== 'ok') {
					if (response?.code === 403 || response?.message?.toLowerCase().includes('not friends')) {
						setIsFriend(false);
					}
					setSendError(response?.message || t('chat.errors.sendFailed', 'Message could not be sent. Please try again.'));
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
					className="py-1 px-2 text-sm text-text-muted hover:text-text hover:bg-surface rounded-md transition-colors cursor-pointer"
					title={t('chat.backToFriends', 'Back to Friends')}
				>
					{t('chat.backToFriendsLabel', '← Friends')}
				</button>

				{/* avatar & friend name */}
				<div
					className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
					onClick={() => friendUser && navigate(`/users/${friendUser.id}`)}
					title={t('chat.viewProfile', 'Click to view profile')}
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
								: error ? t('chat.unavailable', 'Conversation unavailable') : t('chat.loading', 'Loading...')}
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
					<p className="text-center text-text-muted text-sm py-8">{t('chat.loading', 'Loading...')}</p>
				)}

				{/* error */}
				{!loading && error && (
					<div className="flex flex-col items-center gap-3 py-8 text-center">
						<p role="alert" className="py-2 px-3 rounded-md bg-danger/10 text-danger text-body font-bold text-center">
							{error}
						</p>
						<Button variant="secondary" onClick={() => navigate('/friends')}>
							{t('chat.backToFriends', 'Back to Friends')}
						</Button>
					</div>
				)}

				{/* empty */}
				{!loading && !error && messages.length === 0 && (
					<p className="text-center text-text-muted text-sm py-8">
						{isFriend
							? t('chat.emptyWithFriend', 'No messages yet. Say hello!')
							: t('chat.emptyNoHistory', 'No conversation history available.')}
					</p>
				)}

				{/* messages */}
				{!loading && !error && messages.map((msg, index) => {
					const isMe = msg.senderId === user?.id;
					const previousMessage = messages[index - 1];
					const nextMessage = messages[index + 1];
					const showDateSeparator = !previousMessage
						|| !isSameDate(
							new Date(previousMessage.createdAt),
							new Date(msg.createdAt));
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
							<MessageBubble
								msg={msg}
								isMe={isMe}
								isGrouped={isGrouped}
							/>
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
			{error ? null : isFriend ? (
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
							placeholder={isFriend
								? t('chat.inputPlaceholder', 'Type a message...')
								: t('chat.messagingDisabled', 'Messaging disabled')}
							className="w-full py-2.5 px-6 bg-bg border border-border rounded-full text-sm focus:outline-none focus:border-brand transition-colors"
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
						{t('chat.sendButton', 'Send')}
					</button>
				</form>
			) : (
				<div className="p-4 border-t border-border bg-bg flex items-center justify-between px-6 text-sm">
					<span className="text-text-muted">
						{t('chat.notFriendsNotice', 'You cannot send messages because you are not friends.')}
					</span>
					<Button
						variant="secondary"
						size="md"
						onClick={() => navigate('/friends')}
						className="text-xs !py-1.5 !px-3"
					>
						{t('chat.goToFriends', 'Go to Friends')}
					</Button>
				</div>
			)}
		</div>
	);
}