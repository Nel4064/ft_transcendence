import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { Role } from '../generated/prisma/client.js';
import { ROLES_KEY } from './roles.decorator';
import type { AuthenticatedRequest } from './authenticated-request';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  // Reads the role from the database, so a role change applies at once (not at the next login)
  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles) return true;   // route has no @Roles label: nothing to check

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const found = await this.prisma.user.findUnique({ where: { id: user.userId }, select: { role: true } });
    return !!found && roles.includes(found.role);
  }
}
