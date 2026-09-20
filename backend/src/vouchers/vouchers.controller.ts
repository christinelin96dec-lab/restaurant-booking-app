import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';

@Controller('vouchers')
@UseGuards(JwtAuthGuard)
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateVoucherDto) {
    return this.vouchersService.create(req.user.userId, dto);
  }

  @Get('mine')
  mine(@Req() req: any) {
    return this.vouchersService.myVouchers(req.user.userId);
  }

  @Post(':code/redeem')
  redeem(@Param('code') code: string, @Req() req: any, @Body() body: { bookingId?: string; bulkOrderId?: string }) {
    return this.vouchersService.redeem(code, req.user.userId, body);
  }
}
