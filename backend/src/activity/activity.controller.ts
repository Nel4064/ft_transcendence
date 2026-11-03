import { Controller, Get, Post, Patch, HttpCode, Body, Param, Req, UseGuards, ParseUUIDPipe, NotFoundException } from '@nestjs/common';
import { ActivityGateway } from './activity.gateway';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Controller('activity')
export class ActivityController {

    constructor(
        private activityGateway: ActivityGateway,
        private activityService: ActivityService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    getMyNotifications(@Req() req: AuthenticatedRequest) {
        return this.activityService.findForUser(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('read-all')
    markAllRead(@Req() req: AuthenticatedRequest) {
        return this.activityService.markAllRead(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/read')
    @HttpCode(204)
    async markRead(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
        if (!(await this.activityService.markRead(req.user.userId, id)))
            throw new NotFoundException('Notification not found');
    }

    @Post()
    @HttpCode(200)
    sendActivityToAll(@Body() dto: { message: string }) {
        this.activityGateway.sendToAll(dto.message);
        return dto;
    }
}