import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

// NOTE: in production this route must use the raw request body + verify the
// Stripe-Signature header against STRIPE_WEBHOOK_SECRET before trusting the event.
@Controller('webhooks/stripe')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async handleWebhook(@Body() event: { type: string; data: { object: { id: string } } }) {
    if (event.type === 'payment_intent.succeeded') {
      await this.paymentsService.markSucceeded(event.data.object.id);
    }
    return { received: true };
  }
}
