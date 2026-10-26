import { Body, Controller, Get, Post, Patch, Req, UseGuards, Query, Res, HttpStatus, NotFoundException, UseInterceptors, UploadedFile } from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';
import { TwoFactorCodeDto, TwoFactorLoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as fs from 'fs';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

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

  @UseGuards(JwtAuthGuard) // 确保有鉴权守卫
  @Patch('profile')
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() updateDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.userId, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads', // 保存在项目根目录下的 uploads 文件夹
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname)); // 重命名防止冲突
        },
      }),
    }),
  )
  async uploadAvatar(@Req() req: AuthenticatedRequest, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    const avatarUrl = `/uploads/${file.filename}`;
    return this.authService.updateAvatar(req.user.userId, avatarUrl);
  }

  // 1. Redirect user to 42 official authorization page
  @Get('oauth/42')
  redirectTo42(@Res() res: Response) {
    try {
      const clientId = fs.readFileSync('/run/secrets/fortytwo_client_id', 'utf8').trim();
      const redirectUri = process.env.FORTYTWO_REDIRECT_URI || 'http://127.0.0.1:3000/api/auth/oauth/42/callback';

      const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

      return res.redirect(authUrl);
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'OAuth configuration error' });
    }
  }

  // 2. Receive 42 callback code, exchange for token, fetch user, issue JWT and redirect to frontend
  @Get('oauth/42/callback')
  async fortyTwoAuthRedirect(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.redirect('http://localhost:1024/?error=NoCodeProvided'); // 👈 改为前端端口
      }

      const redirectUri = 'http://127.0.0.1:3000/api/auth/oauth/42/callback';

      const fortyTwoToken = await this.authService.getFortyTwoToken(code, redirectUri);
      const ftUser = await this.authService.getFortyTwoUser(fortyTwoToken);
      const result = await this.authService.loginOrRegister42User(ftUser);

      const frontendUrl = 'http://localhost:1024'; // 👈 必须指向您的前端真实端口（如 1024）

      if (result.requiresTwoFactor) {
        return res.redirect(`${frontendUrl}/?requiresTwoFactor=true&userId=${result.userId}`);
      }

      return res.redirect(`${frontendUrl}/?token=${result.access_token}`);

    } catch (error) {
      console.error('42 OAuth 登录失败:', error);
      return res.redirect('http://localhost:1024/?error=OAuthFailed'); // 👈 改为前端端口
    }
  }
}