import { 
  SubscribeMessage, 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayInit, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody, 
  WsException 
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';

@WebSocketGateway({ namespace: '/chat' , cors: { origin: true, credentials: true} })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{

  @WebSocketServer() wss: Server;
  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService
  ){}

  private logger: Logger = new Logger('ChatGateway');
  afterInit(server: any){
    this.logger.log('Initialized!');
  }

  async handleConnection(client: Socket){
    let userId;
    try{
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization;
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
    await client.join(`user_${userId}`);
    this.logger.log(`User ${userId} connected`);
  }

  handleDisconnect(client: Socket){
    const userId = client.data.userId;
    if (!userId)
      this.logger.log("Unauthenticated client disconnected");
    else
      this.logger.log(`User ${userId} disconnected`);
  }

  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors)=> new WsException(errors),
    }),
  )

  @SubscribeMessage('sendMessage')
  async handleNewMessage(
    @ConnectedSocket() client: Socket, 
    @MessageBody() dto: SendMessageDto,
  ){
    const senderId = client.data.userId;
    if (!senderId)
      throw new WsException('Unauthorized');
    try{
      const message = await this.chatService.sendMessage(senderId, dto);
      this.wss.to(`user_${dto.receiverId}`).emit('newMessage', message);
      this.wss.to(`user_${senderId}`).emit('newMessage', message);
      return { status: 'ok', data: message };
    }
    catch(error){
      const errorMessage = error instanceof Error ? error.message: 'Failed to send message';
      client.emit('chatError', { message: errorMessage });
      return { status: 'error', message: errorMessage };
    }
  }
}
