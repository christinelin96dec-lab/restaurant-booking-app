import { Module } from '@nestjs/common';
import { BulkOrdersService } from './bulk-orders.service';
import { BulkOrdersController } from './bulk-orders.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  providers: [BulkOrdersService],
  controllers: [BulkOrdersController],
})
export class BulkOrdersModule {}
