import { Controller, Post, Get, Param, Body, Req, UseGuards, Query } from '@nestjs/common';
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
@UseGuards(JwtAuthGuard)
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  // POST /friends/request - 发送好友请求
  @Post('request')
  async sendRequest(@Req() req: AuthenticatedRequest, @Body('receiverId') receiverId: string) {
    const senderId = req.user.userId;
    return this.friendService.sendRequest(senderId, receiverId);
  }

  // POST /friends/accept/:id - 接受好友请求
  @Post('accept/:id')
  async acceptRequest(@Req() req: AuthenticatedRequest, @Param('id') requestId: string) {
    const currentUserId = req.user.userId;
    return this.friendService.acceptRequest(requestId, currentUserId);
  }

  // ==================== 【新增】拒绝好友请求 ====================
  // POST /friends/reject/:id
  @Post('reject/:id')
  async rejectRequest(@Req() req: AuthenticatedRequest, @Param('id') requestId: string) {
    const currentUserId = req.user.userId;
    return this.friendService.rejectRequest(requestId, currentUserId);
  }

  // ==================== 【新增】获取待处理的好友请求列表 ====================
  // GET /friends/requests
  @Get('requests')
  async getPendingRequests(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.friendService.getPendingRequests(userId);
  }

  // GET /friends - 获取我的好友列表
  @Get()
  async getFriends(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.friendService.getFriends(userId);
  }

  // ==================== 【新增】搜索用户接口 ====================
  // GET /friends/search?keyword=xxx
  @Get('search')
  async searchUsers(@Req() req: AuthenticatedRequest, @Query('keyword') keyword: string) {
    const currentUserId = req.user.userId;
    return this.friendService.searchUsers(currentUserId, keyword);
  }
}