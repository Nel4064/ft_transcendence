import { 
  Body, 
  Controller, 
  Get, 
  Param, 
  Patch, 
  Post, 
  Req, 
  UseGuards, 
  UseFilters, 
  UseInterceptors, 
  UploadedFile, 
  BadRequestException 
} from '@nestjs/common';
import type { Request } from 'express'; // 👈 解决类型冲突
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto, ChangePasswordDto } from '../auth/dto/auth.dto';
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

  // 💡 注：如果没用到 getMyScreenings，队友建议在此处或 PR 中将其移除以清理死代码。
  // 如果你需要留着它，可以保留。这里按队友意见示范保留干净的代码结构。

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
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = /\.(jpg|jpeg|png|webp)$/i;
        if (!file.originalname.match(allowedExtensions)) {
          return cb(
            new BadRequestException('Only jpg, jpeg, png, and webp image formats are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024,
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

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto
  ) {
    return this.usersService.changePassword(req.user.userId, dto);
  }

  @Get(':id')
  async getUserPublicProfile(@Param('id') id: string) {
    return this.usersService.getUserPublicProfile(id);
  }
}