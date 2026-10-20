import { IsString, IsNotEmpty, IsEmail, IsOptional, MinLength, Length } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Username should not be empty' })
  @MinLength(2, { message: 'Username must be at least 2 characters long' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Email should not be empty' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @IsOptional() // Optional to support 42 OAuth login
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Username or Email should not be empty' })
  @MinLength(2, { message: 'Username or Email must be at least 2 characters long' })
  identifier: string; 

  @IsString()
  @IsNotEmpty({ message: 'Password should not be empty' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

export class TwoFactorCodeDto {
  @IsString()
  @IsNotEmpty({ message: '2FA code should not be empty' })
  @Length(6, 6, { message: '2FA code must be exactly 6 digits' })
  code: string;
}

export class TwoFactorLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'User ID should not be empty' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: '2FA code should not be empty' })
  @Length(6, 6, { message: '2FA code must be exactly 6 digits' })
  code: string;
}