import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BulkOrdersService } from './bulk-orders.service';
import { CreateBulkOrderDto } from './dto/create-bulk-order.dto';

@Controller('bulk-orders')
@UseGuards(JwtAuthGuard)
export class BulkOrdersController {
  constructor(private readonly bulkOrdersService: BulkOrdersService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateBulkOrderDto) {
    return this.bulkOrdersService.create(req.user.userId, dto);
  }

  @Get('mine')
  mine(@Req() req: any) {
    return this.bulkOrdersService.findMine(req.user.userId);
  }

  @Get('restaurant/:restaurantId')
  forRestaurant(@Param('restaurantId') restaurantId: string, @Req() req: any) {
    return this.bulkOrdersService.findForRestaurant(restaurantId, req.user.userId);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @Req() req: any) {
    return this.bulkOrdersService.accept(id, req.user.userId);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Req() req: any) {
    return this.bulkOrdersService.reject(id, req.user.userId);
  }
}
