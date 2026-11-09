import { SetMetadata } from '@nestjs/common';
import { Role } from '../generated/prisma/client.js';

export const ROLES_KEY = 'roles';

// Labels a route with the roles allowed to call it; RolesGuard reads the label
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);