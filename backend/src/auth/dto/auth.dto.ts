import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: '密码长度不能少于 6 位' })
  password: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  usernameOrEmail: string; // 允许用户通过用户名或邮箱登录

  @IsString()
  @IsNotEmpty()
  password: string;
}