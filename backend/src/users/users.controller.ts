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
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto, ChangePasswordDto } from '../auth/dto/auth.dto';
import { MulterErrorFilter } from './multer-error.filter'; // 假设你有这个路径

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

  // 💡 新增：获取当前用户所有想去的 Screenings
  @UseGuards(JwtAuthGuard)
  @Get('me/screenings')
  async getMyScreenings(@Req() req: AuthenticatedRequest) {
    return this.usersService.getUserScreenings(req.user.userId);
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
      // 1. Storage configuration
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      // 2. File type filter
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
      // 3. File size limit (e.g., max 2MB)
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB in Bytes
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

  // ⚠️ 动态参数路由最好放在最后，避免匹配冲突
  @Get(':id')
  async getUserPublicProfile(@Param('id') id: string) {
    return this.usersService.getUserPublicProfile(id);
  }
}