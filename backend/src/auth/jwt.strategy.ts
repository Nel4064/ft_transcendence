import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // 1. Extract the JWT from the Authorization Bearer header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 2. Whether to ignore expiration (usually false, reject if expired)
      ignoreExpiration: false,
      // 3. Secret key, must match the one used for signing in AuthModule (recommended to use .env)
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key', 
    });
  }

  // 4. After successful verification, Passport automatically passes the decoded payload here
  async validate(payload: { sub: string; username: string }) {
    // The data returned here will be attached to req.user
    return { userId: payload.sub, username: payload.username };
  }
}