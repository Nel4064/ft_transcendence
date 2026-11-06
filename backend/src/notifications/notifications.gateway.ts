import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/notifications' })
export class NotificationsGateway {

  @WebSocketServer() wss: Server;
  
  sendToAll(msg: string) {
    this.wss.emit('notificationToClient', { type: 'Notification', message: msg });
  }

  sendNotification(notification: { type: string; payload: Record<string, string>; createdAt: string }) {
    this.wss.emit('notification', notification);
  }
}
