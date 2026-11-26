import { Controller, Post, Get, Param, Body, UseGuards, Request, ParseUUIDPipe, UsePipes, ValidationPipe, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, SendGroupMessageDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController
{
	constructor(private readonly chatService: ChatService) {}

	@Post('send')
	@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
	async sendMessage(@Request() req: any, @Body() dto: SendMessageDto){
    	return this.chatService.sendMessage(req.user.userId, dto);
	}

	@Get('direct/:friendId')
	async getDirectHistory(
		@Request() req: any,
		@Param('friendId', ParseUUIDPipe) friendId: string,
		@Query('limit') limit?: string,
	){
		const parsedLimit = limit ? parseInt(limit, 10): 50;
		return this.chatService.getDirectHistory(req.user.userId, friendId, parsedLimit);
	}

	@Post('group/send')
	@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
	async sendGroupMessage( @Request() req: any, @Body() dto: SendGroupMessageDto){
		return this.chatService.sendGroupMessage(req.user.userId, dto);
	}

	@Get('group/:screeningId')
	async getGroupHistory(
		@Request() req: any,
		@Param('screeningId', ParseUUIDPipe) screeningId: string,
		@Query('limit') limit?: string,
	){
		const parsedLimit = limit ? parseInt(limit, 10): 50;
		return this.chatService.getGroupHistory(req.user.userId, screeningId, parsedLimit);
	}
}