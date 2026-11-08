import { Controller, Post, Get, Delete, Param, Body, Req, UseGuards, Query } from '@nestjs/common';
import type { Request } from 'express';
import { FriendService } from './friend.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Adjust the path based on your project's authentication Guard

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

  // POST /friends/request - Send friend request
  @Post('request')
  async sendRequest(@Req() req: AuthenticatedRequest, @Body('receiverId') receiverId: string) {
    const senderId = req.user.userId;
    return this.friendService.sendRequest(senderId, receiverId);
  }

  // POST /friends/accept/:id - Accept friend request
  @Post('accept/:id')
  async acceptRequest(@Req() req: AuthenticatedRequest, @Param('id') requestId: string) {
    const currentUserId = req.user.userId;
    return this.friendService.acceptRequest(requestId, currentUserId);
  }

  // POST /friends/reject/:id - Reject friend request
  @Post('reject/:id')
  async rejectRequest(@Req() req: AuthenticatedRequest, @Param('id') requestId: string) {
    const currentUserId = req.user.userId;
    return this.friendService.rejectRequest(requestId, currentUserId);
  }

  // GET /friends/requests - Get pending friend requests list
  @Get('requests')
  async getPendingRequests(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.friendService.getPendingRequests(userId);
  }

  // GET /friends - Get current user's friends list
  @Get()
  async getFriends(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.friendService.getFriends(userId);
  }

  // GET /friends/search?keyword=xxx - Search users interface
  @Get('search')
  async searchUsers(@Req() req: AuthenticatedRequest, @Query('keyword') keyword: string) {
    const currentUserId = req.user.userId;
    return this.friendService.searchUsers(currentUserId, keyword);
  }

  // DELETE /friends/:friendId - Remove a friend
  @Delete(':friendId')
  async removeFriend(@Req() req: AuthenticatedRequest, @Param('friendId') friendId: string) {
    const currentUserId = req.user.userId;
    return this.friendService.removeFriend(currentUserId, friendId);
  }
}

