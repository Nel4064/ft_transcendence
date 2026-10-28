import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/activity' })
export class ActivityGateway {

  @WebSocketServer() wss: Server;
  
  sendToAll(msg: string) {
    this.wss.emit('activityToClient', { type: 'Activity', message: msg });
  }

  sendNotification(notification: { type: string; payload: Record<string, string>; createdAt: string }) {
    this.wss.emit('notification', notification);
  }
}
