import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import * as fs from 'fs';

// Safely read jwt_secret mounted file (Podman Secret)
let jwtSecret = process.env.JWT_SECRET || 'super-secret-key';
try {
  const secretFromFile = fs.readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
  if (secretFromFile) {
    jwtSecret = secretFromFile;
  }
} catch (e) {
  // Fallback to environment variable or default if not in container or file not found
}

@Module({
  imports: [
    PrismaModule,
    HttpModule, 
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