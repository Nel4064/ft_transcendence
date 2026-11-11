import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatType } from '../generated/prisma/client.js';
import { SendMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService 
{
	constructor(private readonly prisma: PrismaService) {}
	private async checkFriendship(senderId: string, receiverId: string): Promise<boolean>
	{
		const friendship = await this.prisma.friendship.findUnique
		({
			where: 
			{
				userId_friendId:
				{
					userId: senderId,
					friendId: receiverId,
				},
			},
		});
		return (!!friendship);
	}

	async sendMessage (senderId: string, dto: SendMessageDto)
	{
		const { receiverId, content } = dto;
		const cleanContent = content.trim();

		if (receiverId === senderId)
			throw new BadRequestException('Message cannot be sent to yourself');
		
		const isFriend = await this.checkFriendship(senderId, receiverId);
		if (!isFriend)
			throw new ForbiddenException('You are not friends yet');
		
		return this.prisma.message.create
		({
			data:
			{
				content: cleanContent,
				type: ChatType.DIRECT,
				senderId: senderId,
				receiverId: receiverId,
			},
			include: 
			{
				sender: 
				{
					select:
					{
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
					},
				},
			},
		});
	}

	async getDirectHistory(userId: string, friendId: string, limit: number = 50,)
	{
		const isFriend = await this.checkFriendship(userId, friendId);
		if (!isFriend)
			throw new ForbiddenException('You are not friends yet');
		const messages = await this.prisma.message.findMany
		({
			where:
			{
				type: ChatType.DIRECT,
				OR:
				[
					{
						senderId: userId,
						receiverId: friendId,
					},
					{
						senderId: friendId,
						receiverId: userId,
					},
				],
			},
			orderBy:
			{
				createdAt: 'desc',
			},
			take: limit,
			include:
			{
				sender:
				{
					select: 
					{
						id: true,
						username: true,
						displayName: true,
						avatarUrl: true,
					},
				},
			},
		});
		return messages.reverse(); 
	}
}
