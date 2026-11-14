import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ScreeningsService } from './screenings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../generated/prisma/client.js';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screenings: ScreeningsService) { }

  @Get()
  findAll() { return this.screenings.findAll(); }

  // 🌟 修改 1 (Mineur): 规范化 URL，把 'myRsvps' 改成 'my-rsvps'
  @UseGuards(JwtAuthGuard)
  @Get('my-rsvps')
  findAllWithRsvpInfo(@Req() req: AuthenticatedRequest) {
    return this.screenings.findAllWithRsvpInfo(req.user.userId);
  }

  // 🌟 修改 2 (Problème 1): 新增根据 ID 获取单个场次的接口 (供详情页使用)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const screening = await this.screenings.findOne(id, req.user.userId);
    if (!screening) {
      throw new NotFoundException("Séance introuvable");
    }
    return screening;
  }

  // 🌟 修改 3 (Problème 2): 把原来的 Post toggle 删掉，拆分成 PUT 和 DELETE 两个幂等接口

  // 3.1 报名 (PUT 代替 POST)
  @UseGuards(JwtAuthGuard)
  @Put(':id/rsvp')
  addRsvp(@Param('id') screeningId: string, @Req() req: AuthenticatedRequest) {
    // 对应 service 里需要新建一个 addRsvp 方法 (里面用 upsert)
    return this.screenings.addRsvp(req.user.userId, screeningId);
  }

  // 3.2 取消报名 (DELETE)
  @UseGuards(JwtAuthGuard)
  @Delete(':id/rsvp')
  removeRsvp(@Param('id') screeningId: string, @Req() req: AuthenticatedRequest) {
    // 对应 service 里需要新建一个 removeRsvp 方法 (里面用 deleteMany)
    return this.screenings.removeRsvp(req.user.userId, screeningId);
  }

  // 👇 下面的 Admin 方法保持不变
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  pick(@Req() req: AuthenticatedRequest, @Body() b: { cineid: number; showid: string }) {
    return this.screenings.pick(b.cineid, b.showid, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':cineid/:showid')
  unpick(@Req() req: AuthenticatedRequest, @Param('cineid', ParseIntPipe) cineid: number, @Param('showid') showid: string) {
    return this.screenings.unpick(cineid, showid, req.user.userId);
  }
}