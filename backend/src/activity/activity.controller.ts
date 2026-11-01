import { Controller, Post, HttpCode, Body } from '@nestjs/common';
import { ActivityGateway } from './activity.gateway';

@Controller('activity')
export class ActivityController {

    constructor(private activityGateway: ActivityGateway) {}

    @Post()
    @HttpCode(200)
    sendActivityToAll(@Body() dto: { message: string }) {
        this.activityGateway.sendToAll(dto.message);
        return dto;
    }
}