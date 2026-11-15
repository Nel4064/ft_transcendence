import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState, useEffect, useRef } from 'react'
import { getDirectHistory } from '../../api/chat'
import { io, Socket } from 'socket.io-client'

export default function ChatPage(){
	const { friendId } = useParams();
	if (!friendId) return null;
	const { user, apiFetch } = useAuth();
	const navigate = useNavigate();
	const bottomRef = useRef<HTMLDivElement | null>(null);
	const socketRef = useRef<Socket | null>(null);

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

	const [ loading, setLoading ] = useState(true);
	const [ messages, setMessages ] = useState<Message[]>([]);
	const [ input, setInput ] = useState('');
	const [ error, setError ] = useState<string | null>(null);

	useEffect (() => {
		// get history
		const fetchDirectHistory = async () => {
			try {
				const directHistory = await getDirectHistory(apiFetch, friendId);
				setMessages(directHistory);
			} catch (err: any) {
				setError(err.message || 'Failed to load history');
				console.error('Failed to load history:', err);
			} finally {
				setLoading(false);
			}
		};
		fetchDirectHistory();
	}, [friendId]);

	// websocket connection
	useEffect (() => {
		const token = localStorage.getItem('token');
		const socket = io('/chat', {
				auth: { token: `Bearer ${token}` },
		});
		socketRef.current = socket;

		socket.on('newMessage', (msg) => {
			if (msg.senderId === friendId || msg.receiverId === friendId)
				setMessages(prev => [...prev, msg]);
		});

		socket.on('chatError', (errormsg) => {
			console.error(errormsg);
		});

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, [friendId]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	function handleSend(){
		const text = input.trim();
		if (!text) return;
		if (!socketRef.current) return;
		socketRef.current.emit('sendMessage', {
			receiverId: friendId,
        	content: text,
		})
		setInput("");
	};
}
