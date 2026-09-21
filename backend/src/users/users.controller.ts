import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@Req() req: any) {
    return this.usersService.findByIdOrThrow(req.user.userId);
  }

  @Patch('me')
  updateMe(
    @Req() req: any,
    @Body() body: { fullName?: string; phone?: string; city?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @Post('me/push-token')
  registerPushToken(@Req() req: any, @Body() body: { token: string }) {
    return this.usersService.setPushToken(req.user.userId, body.token);
  }
}
