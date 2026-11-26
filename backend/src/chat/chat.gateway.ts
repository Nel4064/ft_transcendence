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
import { ForbiddenException, Logger, UnauthorizedException, UsePipes, ValidationPipe, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto, SendGroupMessageDto } from './dto/chat.dto';

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
    let userId: string;
    try{
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization;
      if (typeof token !== 'string')
        throw new Error('Missing token');
      const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const payload = this.jwtService.verify(rawToken);
      if (typeof payload.sub !== 'string' || !payload.sub)
        throw new Error('Missing user id');
      userId = payload.sub;
    }
    catch{
      this.logger.warn(`Connection rejected`);
      client.disconnect(true);
      return ;
    }

    try {
      await this.chatService.assertUserCanChat(userId);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        this.logger.warn(`Connection rejected for user ${userId}: ${error.message}`);
      } else {
        this.logger.error(
          `Failed to verify chat access for user ${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    await client.join(`user_${userId}`);
    this.logger.log(`User ${userId} connected`);
    
    const groupRooms = await this.chatService.getUserGroupRoomIds(userId);
    for (const room of groupRooms) {
      await client.join(room)
    }
    this.logger.log(`User ${userId} joined ${groupRooms.length} group room(s)`);
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
      const statusCode = error instanceof HttpException ? error.getStatus() : 500;

      client.emit('chatError', { message: errorMessage });
      return { status: 'error', code: statusCode, message: errorMessage };
    }
  }

  @UsePipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors)=> new WsException(errors),
      }),
  )
  @SubscribeMessage('sendGroupMessage')
  async handleGroupNewMessage(
      @ConnectedSocket() client: Socket,
      @MessageBody() dto: SendGroupMessageDto
  ){
      const senderId = client.data.userId;
      if (!senderId)
          throw new WsException('Unauthorized');
      try{
          const groupMessage = await this.chatService.sendGroupMessage(senderId, dto)
          this.wss.to(`event_${dto.screeningId}`).emit('newGroupMessage', groupMessage)
          return { status: 'ok', data: groupMessage };
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
          const statusCode = error instanceof HttpException ? error.getStatus() : 500;
          client.emit('chatError', { message: errorMessage });
          return { status: 'error', code: statusCode, message: errorMessage };
      }
  }
}