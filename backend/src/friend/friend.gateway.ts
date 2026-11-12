import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/friends', cors: { origin: '*' } })
export class FriendGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() 
  wss: Server;

  // Handle client connection
  handleConnection(client: Socket) {
    // 假设前端在连接时通过 query 传递了 userId，例如: io('/friends', { query: { userId: 'xxx' } })
    const userId = client.handshake.query.userId as string;
    
    if (userId) {
      // 让该 socket 加入以 userId 命名的房间
      client.join(`user_${userId}`);
      console.log(`User ${userId} joined their personal room: user_${userId}`);
    }
  }

  // Handle client disconnection
  handleDisconnect(client: Socket) {
    // Socket.IO automatically cleans up disconnected rooms; logs can be added here
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Send a friend request notification to a specific user
   * @param targetUserId receiverID from the query parameter during connection
   * @param notification content of notification, including type and payload
   */
  sendNotificationToUser(targetUserId: string, notification: { type: string; payload: Record<string, any>; createdAt: string }) {
    // use .to('room_name') to send notification to the specific user room
    this.wss.to(`user_${targetUserId}`).emit('friendRequest', notification);
  }
}