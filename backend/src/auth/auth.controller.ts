import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { TwoFactorCodeDto, TwoFactorLoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --- 原有的注册和登录路由保持不变 ---
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ==================== 2FA 相关路由 ====================

  /**
   * 1. 生成 2FA 密钥与二维码（个人中心调用，需要携带 JWT Token）
   */
   @UseGuards(JwtAuthGuard)
   @Post('2fa/generate')
   async generateTwoFactorSecret(@Req() req: AuthenticatedRequest) {
     return this.authService.generateTwoFactorAuthenticationSecret(req.user.userId);
   }

  /**
   * 2. 验证并正式开启 2FA（个人中心扫码后输入验证码确认，需要 JWT Token）
   */
   @UseGuards(JwtAuthGuard)
   @Post('2fa/turn-on')
   async turnOnTwoFactor(@Req() req: AuthenticatedRequest, @Body() dto: TwoFactorCodeDto) {
     return this.authService.turnOnTwoFactorAuthentication(req.user.userId, dto.code);
  }

  /**
   * 3. 登录时的 2FA 二次验证（不需要 Token，用登录返回的 userId + 6位验证码换取正式 Token）
   */
  @Post('2fa/authenticate')
  async authenticate2FA(@Body() dto: TwoFactorLoginDto) {
    return this.authService.authenticateWith2FA(dto.userId, dto.code);
  }

  // 👈 把这个受保护的测试接口加上
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: AuthenticatedRequest) {
    return {
      message: '获取个人信息成功',
      user: req.user,
    };
  }
}