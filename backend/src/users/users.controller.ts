import { Controller, UseFilters, Get, Post, Patch, Param, Body, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChangePasswordDto, UpdateProfileDto } from '../auth/dto/auth.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request } from 'express';
import { MulterErrorFilter } from './multer-error.filter';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  async getAllUsers() {
    return this.usersService.getAllPublicUsers();
  }

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
  @UseFilters(new MulterErrorFilter())
  @UseInterceptors(
    FileInterceptor('file', {
      // 1. 存储配置
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      // 2. 文件格式过滤
      fileFilter: (req, file, cb) => {
        const allowedExtensions = /\.(jpg|jpeg|png|webp)$/i;
        if (!file.originalname.match(allowedExtensions)) {
          return cb(
            new BadRequestException('只允许上传 jpg、jpeg、png、webp 格式的图片！'),
            false,
          );
        }
        cb(null, true);
      },
      // 3. 文件大小限制（例如：最大 2MB）
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB 单位是字节 (Bytes)
      },
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

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto
  ) {
    return this.usersService.changePassword(req.user.userId, dto);
  }
}