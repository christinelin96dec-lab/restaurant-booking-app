import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';

// TEMPORARY — see internal.controller.ts. Delete this module and its import
// in app.module.ts once no longer needed.
@Module({
  controllers: [InternalController],
})
export class InternalModule {}
