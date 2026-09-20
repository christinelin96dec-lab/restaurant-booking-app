import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2024-06-20',
    });
  }

  get platformFeePercent(): number {
    return Number(this.config.get<string>('PLATFORM_FEE_PERCENT', '10'));
  }

  /** cents in, cents out, rounded to the nearest cent */
  computeApplicationFeeCents(amountCents: number): number {
    return Math.round((amountCents * this.platformFeePercent) / 100);
  }

  /**
   * Creates a PaymentIntent that splits payment between the platform (application fee)
   * and the restaurant's connected Stripe account (see docs/ARCHITECTURE.md §3.3).
   */
  async createConnectedPaymentIntent(params: {
    userId: string;
    amountCents: number;
    currency: string;
    restaurantStripeAccountId: string;
  }) {
    const applicationFeeCents = this.computeApplicationFeeCents(params.amountCents);

    const intent = await this.stripe.paymentIntents.create({
      amount: params.amountCents,
      currency: params.currency.toLowerCase(),
      application_fee_amount: applicationFeeCents,
      transfer_data: { destination: params.restaurantStripeAccountId },
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId: params.userId,
        stripePaymentIntentId: intent.id,
        amountCents: params.amountCents,
        applicationFeeCents,
        currency: params.currency,
        status: PaymentStatus.REQUIRES_PAYMENT,
      },
    });

    return { payment, clientSecret: intent.client_secret };
  }

  async markSucceeded(stripePaymentIntentId: string) {
    return this.prisma.payment.update({
      where: { stripePaymentIntentId },
      data: { status: PaymentStatus.SUCCEEDED },
    });
  }

  async refund(stripePaymentIntentId: string, amountCents?: number) {
    await this.stripe.refunds.create({
      payment_intent: stripePaymentIntentId,
      amount: amountCents,
    });
    return this.prisma.payment.update({
      where: { stripePaymentIntentId },
      data: { status: amountCents ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED },
    });
  }
}
