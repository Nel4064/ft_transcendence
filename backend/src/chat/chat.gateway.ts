import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({ namespace: '/chat' })

export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{

  @WebSocketServer() wss: Server;
  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService
  ){}

  private logger: Logger = new Logger('ChatGateway');
  afterInit(server: any)
  {
    this.logger.log('Initialized!');
  }

  async handleConnection(client: Socket)
  {
    let userId;
    try{
      const token = client.handshake.auth.token;
      const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const payload = this.jwtService.verify(rawToken);
      userId = payload.sub;
      if (!userId)
        throw new Error();
    }
    catch{
      this.logger.warn(`Connection rejected`);
      client.disconnect(true);
      return ;
    }
    client.data.userId = userId;
    await client.join(userId);
    this.logger.log(`User ${userId} connected`);
  }

  handleDisconnect(client: Socket)
  {
    const userId = client.data.userId;
    if (!userId)
      this.logger.log("Unauthenticated client disconnected");
    else
      this.logger.log(`User ${userId} disconnected`);
  }

  @SubscribeMessage('chatToServer')
  handleMessage(client: Socket, message: { sender: string, message: string }) {
    this.wss.emit('chatToClient', message);
  }
}
