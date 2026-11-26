import { useNavigate } from 'react-router-dom';
import type { Message } from './ChatWindow';
import Avatar from '../Avatar/Avatar';
import { formatMessageTime } from '../../utils/formatMessageTime';

interface MessageBubbleProps {
	msg: Message;
	isMe: boolean;
	isGrouped: boolean;
}

export default function MessageBubble({ msg, isMe, isGrouped }: MessageBubbleProps) {
	const navigate = useNavigate();

	return (
		<div className={`flex ${isMe ? 'justify-end' : 'justify-start items-start gap-2.5'}`}>
			{/* sender avatar */}
			{!isMe && (
				!isGrouped ? (
					<button
						type="button"
						onClick={() => navigate(`/users/${msg.sender.id}`)}
						className="h-8 w-8 flex-shrink-0 self-end overflow-hidden rounded-full transition-opacity hover:opacity-80 cursor-pointer"
						aria-label={`View ${msg.sender.displayName || msg.sender.username}'s profile`}
					>
						<Avatar
							src={msg.sender.avatarUrl}
							name={msg.sender.displayName || msg.sender.username}
							size={32}
						/>
					</button>
				) : (
					<div aria-hidden="true" className="w-8 flex-shrink-0" />
				)
			)}

			{/* message container */}
			<div className={`flex max-w-[70%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
				{/* name and time */}
				{!isGrouped && (
					isMe ? (
						<time dateTime={msg.createdAt} className="mb-1 px-1 text-[11px] text-text-muted">
							{formatMessageTime(msg.createdAt)}
						</time>
					) : (
						<div className="mb-1 flex items-baseline gap-2 px-1">
							<span className="text-xs font-semibold text-text">
								{msg.sender.displayName || msg.sender.username}
							</span>
							<time dateTime={msg.createdAt} className="text-[11px] text-text-muted">
								{formatMessageTime(msg.createdAt)}
							</time>
						</div>
					)
				)}

				{/* message bubble */}
				<div
					className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
						isMe
							? 'rounded-l-2xl rounded-br-2xl bg-brand text-white'
							: 'rounded-r-2xl rounded-bl-2xl bg-bg border border-border text-text'
					}`}
				>
					{msg.content}
				</div>
			</div>
		</div>
	);
}