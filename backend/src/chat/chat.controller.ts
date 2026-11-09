import { Controller, Post, Get, Param, Body, UseGuards, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController 
{
	constructor(private readonly chatService: ChatService) {}

	@Post('send')
	@UsePipes(new ValidationPipe()) // check send message data
	async sendMessage(@Request() req: any, @Body() dto: SendMessageDto) 
	{
    	return this.chatService.sendMessage(req.user.userId, dto);
	}
	@Get('direct/:friendId')
	async getDirectHistory
	(
		@Request() req: any,
		@Param('friendId') friendId: string,
	) 
	{
		return this.chatService.getDirectHistory(req.user.userId, friendId);
	}
}