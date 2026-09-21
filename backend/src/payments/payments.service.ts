import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BulkOrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2024-06-20',
    });
  }

  /**
   * Verifies a Stripe webhook request against its raw body and Stripe-Signature
   * header, throwing if the signature doesn't match STRIPE_WEBHOOK_SECRET. Never
   * trust webhook payloads without this — see docs/DEPLOYMENT.md §1.5.
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
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

  /**
   * Called from the Stripe webhook on `payment_intent.succeeded`. Marks the payment
   * record SUCCEEDED and, if it belongs to a bulk order, flips that order to CONFIRMED
   * and notifies the diner and the restaurant's admins — this is what actually "secures"
   * a bulk-order slot per docs/PRODUCT_SPEC.md §2.4.
   */
  async handlePaymentSucceeded(stripePaymentIntentId: string) {
    // Stripe retries a webhook indefinitely on any non-2xx response, so an event for a
    // payment we have no record of (a stale test event, a retry after manual cleanup, a
    // PaymentIntent created outside this flow) must be treated as a no-op, not an error.
    const existing = await this.prisma.payment.findUnique({ where: { stripePaymentIntentId } });
    if (!existing) return;

    const payment = await this.markSucceeded(stripePaymentIntentId);

    const bulkOrder = await this.prisma.bulkOrder.findUnique({
      where: { paymentId: payment.id },
      include: { restaurant: { select: { id: true, name: true } } },
    });
    if (!bulkOrder) return;

    await this.prisma.bulkOrder.update({ where: { id: bulkOrder.id }, data: { status: BulkOrderStatus.CONFIRMED } });

    await this.notifications.sendToUser(
      bulkOrder.userId,
      'Bulk order confirmed',
      `Your ${bulkOrder.type.toLowerCase()} order at ${bulkOrder.restaurant.name} is confirmed and paid.`,
      { type: 'bulk_order_confirmed', bulkOrderId: bulkOrder.id },
    );
    await this.notifications.sendToRestaurantAdmins(
      bulkOrder.restaurant.id,
      'New paid bulk order',
      `A new ${bulkOrder.type.toLowerCase()} order for ${bulkOrder.guestCount} guests has been paid and confirmed.`,
      { type: 'bulk_order_received', bulkOrderId: bulkOrder.id },
    );
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

  // --- Stripe Connect onboarding (restaurant payouts) -----------------------

  /** Creates a Stripe Express connected account for a restaurant that doesn't have one yet. */
  async createConnectedAccount(): Promise<string> {
    const account = await this.stripe.accounts.create({ type: 'express' });
    return account.id;
  }

  /**
   * A single-use onboarding link the restaurant admin opens in a browser to complete
   * Stripe's KYC/bank-details flow. Must be re-requested if it expires (~5 minutes) or
   * the admin needs to resume onboarding.
   */
  async createOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string) {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return link.url;
  }

  async getAccountStatus(accountId: string) {
    const account = await this.stripe.accounts.retrieve(accountId);
    return {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }
}
