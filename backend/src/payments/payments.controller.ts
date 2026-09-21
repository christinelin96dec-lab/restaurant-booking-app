import { BadRequestException, Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';

@Controller('webhooks/stripe')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async handleWebhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    if (!signature) {
      throw new BadRequestException('Missing Stripe-Signature header');
    }

    let event;
    try {
      // req.body is the raw Buffer here — see main.ts, which routes this path
      // through express.raw() instead of the global JSON parser.
      event = this.paymentsService.constructWebhookEvent(req.body as Buffer, signature);
    } catch (err) {
      throw new BadRequestException(`Invalid Stripe webhook signature: ${(err as Error).message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      await this.paymentsService.handlePaymentSucceeded(event.data.object.id);
    }
    return { received: true };
  }
}
