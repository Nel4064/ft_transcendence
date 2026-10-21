import { Body, Controller, Get, Post, Req, UseGuards,  Query, Res, HttpStatus  } from '@nestjs/common';
import { Request } from 'express';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { TwoFactorCodeDto, TwoFactorLoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as fs from 'fs';

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

  // 1. 引导用户重定向到 42 官方授权页
  @Get('oauth/42')
  redirectTo42(@Res() res: Response) {
    try {
      const clientId = fs.readFileSync('/run/secrets/fortytwo_client_id', 'utf8').trim();
      const redirectUri = process.env.FORTYTWO_REDIRECT_URI || 'http://127.0.0.1:1024/api/auth/oauth/42/callback';
      
      const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
      
      return res.redirect(authUrl);
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'OAuth configuration error' });
    }
  }

  // 2. 接收 42 回调的 code，换 Token、获取用户、种 JWT 并跳回前端
  @Get('oauth/42/callback')
  @Get('oauth/42/callback')
  async handle42Callback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Authorization code missing' });
    }

    const redirectUri = process.env.FORTYTWO_REDIRECT_URI || 'http://127.0.0.1:1024/api/auth/oauth/42/callback';
    const frontendUri = process.env.FRONTEND_OAUTH_URI || 'http://127.0.0.1:1024/';

    try {
      // 第一步：用 code 换取 42 令牌
      const token = await this.authService.getFortyTwoToken(code, redirectUri);
      
      // 第二步：获取 42 用户资料
      const ftUser = await this.authService.getFortyTwoUser(token);
      
      // 第三步：完成系统内部的查找/注册
      const authResult = await this.authService.loginOrRegister42User(ftUser);

      // 第四步：处理 2FA 分支
      if ('requiresTwoFactor' in authResult && authResult.requiresTwoFactor) {
        // 如果该 42 用户开启了 2FA，重定向到前端的 2FA 验证页面，并带上 userId
        return res.redirect(`${frontendUri}2fa-verify?userId=${authResult.userId}`);
      }

      // 第五步：没开启 2FA，直接拿到 access_token 并重定向回前端
      const accessToken = authResult.access_token;
      return res.redirect(`${frontendUri}?token=${accessToken}`);
      
    } catch (error) {
      console.error('OAuth Callback processing failed:', error);
      return res.redirect(`${frontendUri}?error=oauth_failed`);
    }
  }
}