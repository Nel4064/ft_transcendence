import { Body, Controller, Get, Post, Patch, Req, UseGuards, Query, Res, HttpStatus, NotFoundException, UseInterceptors, UploadedFile, Param } from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto} from './dto/auth.dto';
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
  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  async generateTwoFactorSecret(@Req() req: AuthenticatedRequest) {
    return this.authService.generateTwoFactorAuthenticationSecret(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/turn-on')
  async turnOnTwoFactor(@Req() req: AuthenticatedRequest, @Body() dto: TwoFactorCodeDto) {
    return this.authService.turnOnTwoFactorAuthentication(req.user.userId, dto.code);
  }

  @Post('2fa/authenticate')
  async authenticate2FA(@Body() dto: TwoFactorLoginDto) {
    return this.authService.authenticateWith2FA(dto.userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/turn-off')
  async turnOffTwoFactor(@Req() req: AuthenticatedRequest, @Body() dto: TwoFactorCodeDto) {
    return this.authService.turnOffTwoFactorAuthentication(req.user.userId, dto.code);
  }

  
  // Redirect user to 42 official authorization page
  @Get('oauth/42')
  redirectTo42(@Res() res: Response) {
    try {
      const clientId = fs.readFileSync('/run/secrets/fortytwo_client_id', 'utf8').trim();
      // 💡 统一使用带有 1024 网关端口的绝对 URL
      const redirectUri = process.env.FORTYTWO_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/42/callback';

      const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

      return res.redirect(authUrl);
    } catch (e) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'OAuth configuration error' });
    }
  }

  // Receive 42 callback code, exchange for token, fetch user, issue JWT and redirect to frontend
  @Get('oauth/42/callback')
  async fortyTwoAuthRedirect(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.redirect('http://localhost:1024/?error=NoCodeProvided');
      }

      // 💡 必须与 redirectTo42 中的 redirectUri 保持完全一致！
      const redirectUri = process.env.FORTYTWO_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/42/callback';

      const fortyTwoToken = await this.authService.getFortyTwoToken(code, redirectUri);
      const ftUser = await this.authService.getFortyTwoUser(fortyTwoToken);
      const result = await this.authService.loginOrRegister42User(ftUser);

      const frontendUrl = 'http://localhost:1024/signin';

      if (result.requiresTwoFactor) {
        return res.redirect(`${frontendUrl}/?requiresTwoFactor=true&userId=${result.userId}`);
      }

      return res.redirect(`${frontendUrl}/?token=${result.access_token}`);

    } catch (error) {
      console.error('42 OAuth login failed:', error);
      return res.redirect('http://localhost:1024/?error=OAuthFailed');
    }
  }
}