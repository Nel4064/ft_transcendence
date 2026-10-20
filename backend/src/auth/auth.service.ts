import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

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
        // 1. Find user by identifier (supports both username or email)
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
        
        // Check if the user has a password set (e.g. 42-only users might not have one)
        if (!user.passwordHash) {
            throw new UnauthorizedException('This account has no password set, please use another login method');
        }

        // 2. Compare password
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // 3. Issue JWT Token
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);

        return {
            message: 'Login successful',
            access_token: accessToken,
        };
    }
}
