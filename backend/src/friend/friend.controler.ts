import { Controller, Post, Get, Param, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { FriendService } from './friend.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // 请根据你的项目鉴权 Guard 调整路径

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
  };
}

@Controller('friends')
@UseGuards(JwtAuthGuard) // 建议加上你的登录鉴权 Guard
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  // POST /friends/request - 发送好友请求
  @Post('request')
  async sendRequest(@Req() req: AuthenticatedRequest, @Body('receiverId') receiverId: string) {
    const senderId = req.user.userId; // 假设你的 Guard 会把用户信息挂载到 req.user
    return this.friendService.sendRequest(senderId, receiverId);
  }

  // POST /friends/accept/:id - 接受好友请求
  @Post('accept/:id')
  async acceptRequest(@Req() req: AuthenticatedRequest, @Param('id') requestId: string) {
    const currentUserId = req.user.userId;
    return this.friendService.acceptRequest(requestId, currentUserId);
  }

  // GET /friends - 获取我的好友列表
  @Get()
  async getFriends(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.friendService.getFriends(userId);
  }
}