import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from '../auth/dto/auth.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers() {
    return this.usersService.getAllPublicUsers();
  }

  // 🔑 当前登录用户的个人资料接口 -> /api/users/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const user = await this.usersService.getProfile(req.user.userId);
    return {
      message: 'Successfully retrieved full profile',
      user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() updateDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  async uploadAvatar(@Req() req: AuthenticatedRequest, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    const avatarUrl = `/uploads/${file.filename}`;
    return this.usersService.updateAvatar(req.user.userId, avatarUrl);
  }

  @Get(':id')
  async getUserPublicProfile(@Param('id') id: string) {
    return this.usersService.getUserPublicProfile(id);
  }
}