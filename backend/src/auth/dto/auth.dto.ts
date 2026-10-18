import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password cannot be less than 6 characters.' })
  password: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  usernameOrEmail: string; 

  @IsString()
  @IsNotEmpty()
  password: string;
}