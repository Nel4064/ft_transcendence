import { IsString, IsNotEmpty, MaxLength, IsUUID, } from 'class-validator';
import { Transform } from 'class-transformer';

class baseMessageDto
{
	@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
	@IsString()
	@IsNotEmpty()
	@MaxLength(500)
	content: string;
}

export class SendMessageDto extends baseMessageDto
{
	@IsUUID()
	@IsNotEmpty()
	receiverId: string;
}

export class SendGroupMessageDto extends baseMessageDto
{
	@IsUUID()
	@IsNotEmpty()
	screeningId: string;
}