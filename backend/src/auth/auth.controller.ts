import { Body, Controller, Get, Post, Req, UseGuards, Query, Res, HttpStatus, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { TwoFactorCodeDto, TwoFactorLoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as fs from 'fs';
import { PrismaService } from 'src/prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) { }
  // --- Original register and login routes remain unchanged ---
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ==================== 2FA Related Routes ====================

  /**
   * 1. Generate 2FA secret and QR code (called from profile, requires JWT Token)
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  async generateTwoFactorSecret(@Req() req: AuthenticatedRequest) {
    return this.authService.generateTwoFactorAuthenticationSecret(req.user.userId);
  }

  /**
   * 2. Verify and officially turn on 2FA (confirmed by entering code after scanning, requires JWT Token)
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/turn-on')
  async turnOnTwoFactor(@Req() req: AuthenticatedRequest, @Body() dto: TwoFactorCodeDto) {
    return this.authService.turnOnTwoFactorAuthentication(req.user.userId, dto.code);
  }

  /**
   * 3. 2FA secondary verification during login (no Token needed, exchange userId + 6-digit code for a formal Token)
   */
  @Post('2fa/authenticate')
  async authenticate2FA(@Body() dto: TwoFactorLoginDto) {
    return this.authService.authenticateWith2FA(dto.userId, dto.code);
  }

  /**
   * 4. Disable/remove 2FA (requires JWT Token, and verification of the current 6-digit code)
   */
  @UseGuards(JwtAuthGuard)
  @Post('2fa/turn-off')
  async turnOffTwoFactor(@Req() req: AuthenticatedRequest, @Body() dto: TwoFactorCodeDto) {
    return this.authService.turnOffTwoFactorAuthentication(req.user.userId, dto.code);
  }

  // Protected test endpoint
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: AuthenticatedRequest) {
    // 1. 从 JWT 验证后挂载的 req.user 中拿到用户 ID（假设你的 payload 里的字段叫 userId 或 sub）
    const userId = req.user.userId;

    // 2. 通过 Prisma 去数据库查询该用户的完整信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,          // 头像
        bio: true,                // 个人简介
        language: true,           // 语言偏好
        role: true,               // 用户角色 (USER / ADMIN)
        twoFactorEnabled: true,   // 是否开启 2FA
        createdAt: true,          // 注册时间
        updatedAt: true,          // 最后更新时间


        passwordHash: false,
        twoFactorSecret: false,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 3. 返回包含丰富信息的对象
    return {
      message: 'Successfully retrieved full profile',
      user,
    };
  }

  // 1. Redirect user to 42 official authorization page
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

  // 2. Receive 42 callback code, exchange for token, fetch user, issue JWT and redirect to frontend
  @Get('oauth/42/callback')
  async handle42Callback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Authorization code missing' });
    }

    const redirectUri = process.env.FORTYTWO_REDIRECT_URI || 'http://127.0.0.1:1024/api/auth/oauth/42/callback';
    const frontendUri = process.env.FRONTEND_OAUTH_URI || 'http://127.0.0.1:1024/';

    try {
      // Step 1: Exchange code for 42 token
      const token = await this.authService.getFortyTwoToken(code, redirectUri);

      // Step 2: Fetch 42 user profile
      const ftUser = await this.authService.getFortyTwoUser(token);

      // Step 3: Complete internal lookup/registration
      const authResult = await this.authService.loginOrRegister42User(ftUser);

      // Step 4: Handle 2FA branch
      if ('requiresTwoFactor' in authResult && authResult.requiresTwoFactor) {
        // If 2FA is enabled for this 42 user, redirect to frontend 2FA verification page with userId
        return res.redirect(`${frontendUri}2fa-verify?userId=${authResult.userId}`);
      }

      // Step 5: 2FA is not enabled, obtain access_token and redirect back to frontend
      const accessToken = authResult.access_token;
      return res.redirect(`${frontendUri}?token=${accessToken}`);

    } catch (error) {
      console.error('OAuth Callback processing failed:', error);
      return res.redirect(`${frontendUri}?error=oauth_failed`);
    }
  }
}