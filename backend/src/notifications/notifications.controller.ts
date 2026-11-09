import { Controller, Get, Post, Patch, HttpCode, Body, Param, Req, UseGuards, ParseUUIDPipe, NotFoundException } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Controller('notifications')
export class NotificationsController {

    constructor(
        private notificationsGateway: NotificationsGateway,
        private notificationsService: NotificationsService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    getMyNotifications(@Req() req: AuthenticatedRequest) {
        return this.notificationsService.findForUser(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('read-all')
    markAllRead(@Req() req: AuthenticatedRequest) {
        return this.notificationsService.markAllRead(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/read')
    @HttpCode(204)
    async markRead(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
        if (!(await this.notificationsService.markRead(req.user.userId, id)))
            throw new NotFoundException('Notification not found');
    }

}