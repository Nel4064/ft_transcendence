import { IsString, IsNotEmpty, MaxLength, MinLength, IsUUID, } from 'class-validator';

export class SendMessageDto
{
	@IsUUID()
	@IsNotEmpty()
	receiverId: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(500)
	@MinLength(1)
	content: string;
}