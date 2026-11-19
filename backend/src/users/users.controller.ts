import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Req,
  UseGuards,
  UseFilters,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto, ChangePasswordDto } from '../auth/dto/auth.dto';
import { MulterErrorFilter } from './multer-error.filter';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@generated/prisma/client';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN) // 只有 Admin 才能访问
  @Get('admin/manage-members')
  async getAdminDashboardMembers() {
    return this.usersService.getAllMembersForAdmin();
  }
  @Patch('admin/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateMemberRole(
    @Param('id') targetUserId: string,
    @Body('role') role: 'ADMIN' | 'USER',
    @Req() req: any,
  ) {
    return this.usersService.updateUserRole(req.user.id, targetUserId, role);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async removeMember(
    @Param('id') targetUserId: string,
    @Req() req: any,
  ) {
    return this.usersService.removeMember(req.user.id, targetUserId);
  }

  @Post('admin/:id/resign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async resignAdmin(
    @Param('id') targetUserId: string,
    @Req() req: any,
  ) {
    const currentAdminId = req.user.userId ?? req.user.id;
    return this.usersService.resignAdmin(currentAdminId, targetUserId);
  }

  @Post('admin/:id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async banMember(
    @Param('id') targetUserId: string,
    @Req() req: any,
  ) {
    const currentAdminId = req.user.userId ?? req.user.id;
    return this.usersService.banMember(currentAdminId, targetUserId);
  }

  @Post('admin/:id/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async unbanMember(
    @Param('id') targetUserId: string,
    @Req() req: any,
  ) {
    const currentAdminId = req.user.userId ?? req.user.id;
    return this.usersService.unbanMember(currentAdminId, targetUserId);
  }

}