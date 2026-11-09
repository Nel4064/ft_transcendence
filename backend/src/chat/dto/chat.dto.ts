import { IsString, IsNotEmpty, MaxLength, IsUUID, } from 'class-validator';

export class SendMessageDto
{
	@IsUUID()
	@IsNotEmpty()
	receiverId: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(500)
	content: string;
}