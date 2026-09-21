import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestaurantsService } from './restaurants.service';
import { SearchRestaurantsDto } from './dto/search-restaurants.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu-item.dto';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';
import { CreateBulkPackageDto, UpdateBulkPackageDto } from './dto/bulk-package.dto';
import { StripeOnboardingLinkDto } from './dto/stripe-onboarding.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  search(@Query() query: SearchRestaurantsDto) {
    return this.restaurantsService.search(query);
  }

  @Get('top')
  top(@Query('city') city?: string) {
    return this.restaurantsService.top(city);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: any) {
    return this.restaurantsService.myRestaurants(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findByIdOrThrow(id);
  }

  @Get(':id/availability')
  availability(@Param('id') id: string, @Query('date') date: string) {
    return this.restaurantsService.getAvailability(id, date);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateRestaurantDto) {
    return this.restaurantsService.update(id, req.user.userId, dto);
  }

  // --- Menu items ---------------------------------------------------------

  @Post(':id/menu-items')
  @UseGuards(JwtAuthGuard)
  createMenuItem(@Param('id') id: string, @Req() req: any, @Body() dto: CreateMenuItemDto) {
    return this.restaurantsService.createMenuItem(id, req.user.userId, dto);
  }

  @Patch(':id/menu-items/:itemId')
  @UseGuards(JwtAuthGuard)
  updateMenuItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() req: any,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.restaurantsService.updateMenuItem(id, itemId, req.user.userId, dto);
  }

  @Delete(':id/menu-items/:itemId')
  @UseGuards(JwtAuthGuard)
  deleteMenuItem(@Param('id') id: string, @Param('itemId') itemId: string, @Req() req: any) {
    return this.restaurantsService.deleteMenuItem(id, itemId, req.user.userId);
  }

  // --- Tables / rooms ------------------------------------------------------

  @Post(':id/tables')
  @UseGuards(JwtAuthGuard)
  createTable(@Param('id') id: string, @Req() req: any, @Body() dto: CreateTableDto) {
    return this.restaurantsService.createTable(id, req.user.userId, dto);
  }

  @Patch(':id/tables/:tableId')
  @UseGuards(JwtAuthGuard)
  updateTable(
    @Param('id') id: string,
    @Param('tableId') tableId: string,
    @Req() req: any,
    @Body() dto: UpdateTableDto,
  ) {
    return this.restaurantsService.updateTable(id, tableId, req.user.userId, dto);
  }

  @Delete(':id/tables/:tableId')
  @UseGuards(JwtAuthGuard)
  deleteTable(@Param('id') id: string, @Param('tableId') tableId: string, @Req() req: any) {
    return this.restaurantsService.deleteTable(id, tableId, req.user.userId);
  }

  // --- Bulk-order packages --------------------------------------------------

  @Post(':id/bulk-packages')
  @UseGuards(JwtAuthGuard)
  createBulkPackage(@Param('id') id: string, @Req() req: any, @Body() dto: CreateBulkPackageDto) {
    return this.restaurantsService.createBulkPackage(id, req.user.userId, dto);
  }

  @Patch(':id/bulk-packages/:packageId')
  @UseGuards(JwtAuthGuard)
  updateBulkPackage(
    @Param('id') id: string,
    @Param('packageId') packageId: string,
    @Req() req: any,
    @Body() dto: UpdateBulkPackageDto,
  ) {
    return this.restaurantsService.updateBulkPackage(id, packageId, req.user.userId, dto);
  }

  @Delete(':id/bulk-packages/:packageId')
  @UseGuards(JwtAuthGuard)
  deleteBulkPackage(@Param('id') id: string, @Param('packageId') packageId: string, @Req() req: any) {
    return this.restaurantsService.deleteBulkPackage(id, packageId, req.user.userId);
  }

  // --- Stripe Connect onboarding (payouts) -----------------------------------

  @Post(':id/stripe/onboarding-link')
  @UseGuards(JwtAuthGuard)
  createStripeOnboardingLink(@Param('id') id: string, @Req() req: any, @Body() dto: StripeOnboardingLinkDto) {
    const refreshUrl = dto.refreshUrl ?? 'restaurantapp://admin/stripe-connect';
    const returnUrl = dto.returnUrl ?? 'restaurantapp://admin/stripe-connect';
    return this.restaurantsService.createStripeOnboardingLink(id, req.user.userId, refreshUrl, returnUrl);
  }

  @Get(':id/stripe/status')
  @UseGuards(JwtAuthGuard)
  getStripeStatus(@Param('id') id: string, @Req() req: any) {
    return this.restaurantsService.getStripeStatus(id, req.user.userId);
  }
}
