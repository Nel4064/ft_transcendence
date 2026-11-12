import { IsString, IsNotEmpty, MaxLength, IsUUID, } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto
{
	@IsUUID()
	@IsNotEmpty()
	receiverId: string;

	@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
	@IsString()
	@IsNotEmpty()
	@MaxLength(500)
	content: string;

}