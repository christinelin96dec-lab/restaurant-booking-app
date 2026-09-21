import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestaurantsService } from './restaurants.service';
import { SearchRestaurantsDto } from './dto/search-restaurants.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

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
}
