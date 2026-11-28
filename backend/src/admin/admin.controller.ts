import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    // Delete, // GDPR-TODO: only used by the disabled remove route
    Req,
    UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@generated/prisma/client';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN) // 只有 Admin 才能访问
    @Get('manage-members')
    async getAdminDashboardMembers() {
        return this.adminService.getAllMembersForAdmin();
    }
    
    @Patch(':id/role')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async updateMemberRole(
        @Param('id') targetUserId: string,
        @Body('role') role: 'ADMIN' | 'USER',
        @Req() req: any,
    ) {
        return this.adminService.updateUserRole(req.user.id, targetUserId, role);
    }

    // GDPR-TODO: disabled until the GDPR implementation (ban / remove member)
    /*
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async removeMember(
        @Param('id') targetUserId: string,
        @Req() req: any,
    ) {
        return this.adminService.removeMember(req.user.id, targetUserId);
    }
    */

    @Post(':id/resign')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async resignAdmin(
        @Param('id') targetUserId: string,
        @Req() req: any,
    ) {
        const currentAdminId = req.user.userId ?? req.user.id;
        return this.adminService.resignAdmin(currentAdminId, targetUserId);
    }

    // GDPR-TODO: disabled until the GDPR implementation (ban / remove member)
    /*
    @Post(':id/ban')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async banMember(
        @Param('id') targetUserId: string,
        @Req() req: any,
    ) {
        const currentAdminId = req.user.userId ?? req.user.id;
        return this.adminService.banMember(currentAdminId, targetUserId);
    }

    @Post(':id/unban')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async unbanMember(
        @Param('id') targetUserId: string,
        @Req() req: any,
    ) {
        const currentAdminId = req.user.userId ?? req.user.id;
        return this.adminService.unbanMember(currentAdminId, targetUserId);
    }
    */

}