import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // 👈 1. 引入 HttpModule 用于 42 API 请求
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import * as fs from 'fs';

// 安全读取 jwt_secret 挂载文件（Podman Secret）
let jwtSecret = process.env.JWT_SECRET || 'super-secret-key';
try {
  const secretFromFile = fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
  if (secretFromFile) {
    jwtSecret = secretFromFile;
  }
} catch (e) {
  // 如果不在容器内或文件未找到，则走环境变量或默认兜底
}

@Module({
  imports: [
    PrismaModule,
    HttpModule, // 👈 2. 注册进 imports
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}