import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service'; // 指向你的 Prisma 服务
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        // 1. 检查用户名或邮箱是否已被占用
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [{ email: dto.email }, { username: dto.username }],
            },
        });
        if (existingUser) {
            throw new BadRequestException('用户名或邮箱已被注册');
        }

        // 2. 对密码进行哈希加密
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // 3. 写入数据库
        const user = await this.prisma.user.create({
            data: {
                username: dto.username,
                email: dto.email,
                passwordHash: hashedPassword,
                displayName: dto.username, // 👈 加上这一行，把 displayName 补上
            },
        });

        // 4. 返回时剔除密码哈希
        const { passwordHash, ...result } = user;
        return { message: '注册成功', user: result };
    }

    async login(dto: LoginDto) {
        // 1. 查找用户（支持用户名或邮箱登录）
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.usernameOrEmail },
                    { username: dto.usernameOrEmail },
                ],
            },
        });
        if (!user) {
            throw new UnauthorizedException('用户不存在或密码错误');
        }
        if (!user.passwordHash) {
            throw new UnauthorizedException('该账号未设置密码，请使用其他方式登录');
        }

        // 2. 比对密码
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('用户不存在或密码错误');
        }

        // 3. 签发 JWT Token
        const payload = { sub: user.id, username: user.username };
        const accessToken = this.jwtService.sign(payload);

        return {
            message: '登录成功',
            access_token: accessToken,
        };
    }
}
