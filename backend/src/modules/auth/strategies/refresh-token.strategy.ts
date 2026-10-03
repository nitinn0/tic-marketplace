import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: (req: Request) => {
        const authHeader = req.headers.authorization;
        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
          return authHeader.replace('Bearer ', '').trim();
        }
        return null;
      },
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'development-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: string; type?: string }) {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token type');
    }
    return { sub: payload.sub };
  }
}
