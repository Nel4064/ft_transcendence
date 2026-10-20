import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        // 1. Check if username or email is already taken
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email: dto.email }, { username: dto.username }],
            },
        });
        if (existingUser) {
            throw new BadRequestException('Username or email already exists');
        }

        // 2. Handle optional password (support 42 OAuth registration without password)
        let hashedPassword: string | null = null;
        if (dto.password) {
            hashedPassword = await bcrypt.hash(dto.password, 10);
        }

        // 3. Save to database (ensure your Prisma schema allows passwordHash to be nullable: passwordHash String?)
        const user = await this.prisma.user.create({
            data: {
                username: dto.username,
                email: dto.email,
                passwordHash: hashedPassword,
                displayName: dto.username,
            },
        });

        // 4. Exclude passwordHash from the response
        const { passwordHash, ...result } = user;
        return { message: 'Registration successful', user: result };
    }

    async login(dto: LoginDto) {
        // 1. 查找用户
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.identifier },
                    { username: dto.identifier },
                ],
            },
        });
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.passwordHash) {
            throw new UnauthorizedException('This account has no password set, please use another login method');
        }

        // 2. 比对密码
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // 3. 关键点：检查该用户是否开启了 2FA
        if (user.twoFactorEnabled) {
            // 如果开启了，不直接给 token，而是返回一个临时标识，告诉前端需要输入 2FA
            return {
                requiresTwoFactor: true,
                userId: user.id,
                message: 'Please provide your 2FA code',
            };
        }

        // 4. 没开启 2FA，直接签发 Token（正常登录）
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);

        return {
            message: 'Login successful',
            access_token: accessToken,
        };
    }
    // 2 factors Authentication (2FA) 相关方法
    // 1. 生成 2FA 密钥与二维码
    async generateTwoFactorAuthenticationSecret(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // 生成秘钥
        const secret = speakeasy.generateSecret({
            name: `Ft_Transcendence (${user.email})`,
        });
        if (!secret.otpauth_url) {
            throw new InternalServerErrorException('Unable to generate 2FA provisioning URL');
        }

        // 将 secret 暂存到数据库中（此时 twoFactorEnabled 依然是 false，等验证成功才变 true）
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: secret.base32 },
        });

        // 生成二维码的 Data URL 传给前端
        return {
            qrCodeUrl: await qrcode.toDataURL(secret.otpauth_url),
            secret: secret.base32, // 可选：给用户展示文本密钥
        };
    }

    // 2. 验证用户输入的 6 位码，并正式开启 2FA
    async turnOnTwoFactorAuthentication(userId: string, code: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorSecret) {
            throw new BadRequestException('2FA secret not found');
        }

        // 使用 speakeasy 校验验证码
        const isVerified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
        });

        if (!isVerified) {
            throw new BadRequestException('Invalid 2FA code');
        }

        // 校验成功，正式开启开关
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });

        return { message: '2FA enabled successfully' };
    }

    // 3. 登录时校验 2FA 验证码
    async authenticateWith2FA(userId: string, code: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorSecret) {
            throw new UnauthorizedException('2FA not enabled for this user');
        }

        const isVerified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
        });

        if (!isVerified) {
            throw new UnauthorizedException('Invalid 2FA code');
        }

        // 2FA 校验通过，正式签发 JWT Token
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);

        return {
            message: 'Login successful',
            access_token: accessToken,
        };
    }

}
