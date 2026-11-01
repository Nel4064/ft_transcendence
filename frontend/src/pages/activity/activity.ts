import { io } from 'socket.io-client';

const feed = document.querySelector<HTMLUListElement>('#feed')!;
const socket = io('/activity');   // same origin: nginx sends /socket.io/ to the backend

socket.on('notification', (n: { type: string; payload: Record<string, string> }) => {
  const li = document.createElement('li');
  const label = n.type === 'CLUB_PICK' ? 'New club pick' : 'Pick removed';
  li.textContent = `${label}: ${n.payload.filmTitle} at ${n.payload.cinemaName}`;
  feed.prepend(li);
});