import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as fs from 'fs';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios'; // 👈 1. Import HttpService

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private readonly httpService: HttpService, // 👈 Inject HttpService here
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
        // 1. Find user by email or username
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

        // 2. Compare password
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // 3. Key point: Check if 2FA is enabled for this user
        if (user.twoFactorEnabled) {
            // If enabled, do not issue a token directly; instead, return a temporary flag telling the frontend 2FA is required
            return {
                requiresTwoFactor: true,
                userId: user.id,
                message: 'Please provide your 2FA code',
            };
        }

        // 4. 2FA not enabled, issue Token directly (normal login)
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);

        return {
            message: 'Login successful',
            access_token: accessToken,
        };
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
                avatarUrl: true,
                bio: true,
                language: true,
                role: true,
                twoFactorEnabled: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            message: 'Successfully retrieved full profile',
            user,
        };
    }

    // ==================== 2FA (Two-Factor Authentication) Methods ====================

    // 1. Generate 2FA secret and QR code
    async generateTwoFactorAuthenticationSecret(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `Ft_Transcendence (${user.email})`,
        });
        if (!secret.otpauth_url) {
            throw new InternalServerErrorException('Unable to generate 2FA provisioning URL');
        }

        // Temporarily save secret to database (twoFactorEnabled remains false until verification succeeds)
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: secret.base32 },
        });

        // Return QR code Data URL to frontend
        return {
            qrCodeUrl: await qrcode.toDataURL(secret.otpauth_url),
            secret: secret.base32, // Optional: show text secret to user
        };
    }

    // 2. Verify the 6-digit code entered by the user and officially turn on 2FA
    async turnOnTwoFactorAuthentication(userId: string, code: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorSecret) {
            throw new BadRequestException('2FA secret not found');
        }

        // Verify the code using speakeasy
        const isVerified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
        });

        if (!isVerified) {
            throw new BadRequestException('Invalid 2FA code');
        }

        // Verification successful, officially enable 2FA switch
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });

        return { message: '2FA enabled successfully' };
    }

    // 3. Verify 2FA code during login
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

        // 2FA verification passed, officially issue JWT Token
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);

        return {
            message: 'Login successful',
            access_token: accessToken,
        };
    }

    // 4. Disable/remove 2FA
    async turnOffTwoFactorAuthentication(userId: string, code: string) {
        // 1. Find user by userId
        // (Note: If your id is of type number, write it as id: Number(userId))
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        // Check if 2FA was actually enabled in the first place
        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new BadRequestException('2FA is not enabled');
        }

        // 2. Verify that the 6-digit dynamic code entered by the user is correct (prevents unauthorized disabling if token leaks)
        const isCodeValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 1, // Allow a time drift window of +/- 30 seconds
        });

        if (!isCodeValid) {
            throw new BadRequestException('Invalid 2FA verification code');
        }

        // 3. Verification passed: update database, disable 2FA and clear secret
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                isTwoFactorEnabled: false,
                twoFactorSecret: null, // Adjust according to your schema.prisma field names
            },
        });

        return {
            message: '2FA disabled successfully',
        };
    }

    // ==================== 42 OAuth Related Methods ====================

    // 1. Exchange Authorization Code for 42 Access Token
    async getFortyTwoToken(code: string, redirectUri: string): Promise<string> {
        try {
            const clientId = fs.readFileSync('/run/secrets/fortytwo_client_id', 'utf8').trim();
            const clientSecret = fs.readFileSync('/run/secrets/fortytwo_client_secret', 'utf8').trim();

            const response = await firstValueFrom(
                this.httpService.post('https://api.intra.42.fr/oauth/token', {
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code,
                    redirect_uri: redirectUri,
                }),
            );

            return response.data.access_token;
        } catch (error: any) {
            console.error('Failed to get 42 token:', error.response?.data || error.message);
            throw new UnauthorizedException('Failed to authenticate with 42');
        }
    }

    // 2. Fetch 42 user profile using Access Token
    async getFortyTwoUser(accessToken: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get('https://api.intra.42.fr/v2/me', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }),
            );
            return response.data;
        } catch (error: any) {
            console.error('Failed to get 42 user profile:', error.response?.data || error.message);
            throw new UnauthorizedException('Failed to fetch 42 user profile');
        }
    }

    // 3. 42 user login or automatic registration
    async loginOrRegister42User(ftUser: any) {
        const login = ftUser.login; // 42 login username (e.g., yzhang)
        const email = ftUser.email; // 42 email

        // Check if user already exists in database (matching by email or username first)
        let user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: login },
                ],
            },
        });

        if (!user) {
            // If not found, create a new user.
            // 42 registered users have no local password (passwordHash is null), which fits your register logic completely!
            user = await this.prisma.user.create({
                data: {
                    username: login,
                    email: email,
                    passwordHash: null, // No local password for 42 login
                    displayName: ftUser.usual_full_name || login,
                },
            });
        }

        // Check if the 42 user has also enabled 2FA (if you want 42 login to support 2FA verification as well)
        if (user.twoFactorEnabled) {
            return {
                requiresTwoFactor: true,
                userId: user.id,
                message: 'Please provide your 2FA code',
            };
        }

        // 2FA not enabled, issue internal system JWT token directly
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);

        return {
            message: '42 Login successful',
            access_token: accessToken,
        };
    }
}
