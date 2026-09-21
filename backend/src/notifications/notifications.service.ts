import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo();

  constructor(private readonly prisma: PrismaService) {}

  /** Sends a push notification to one user, if they have a registered Expo push token. */
  async sendToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } });
    if (!user?.pushToken) return;
    await this.send([user.pushToken], title, body, data);
  }

  /** Sends a push notification to every admin of a restaurant (e.g. new badge, new bulk order). */
  async sendToRestaurantAdmins(restaurantId: string, title: string, body: string, data?: Record<string, unknown>) {
    const admins = await this.prisma.restaurantAdmin.findMany({
      where: { restaurantId },
      include: { user: { select: { pushToken: true } } },
    });
    const tokens = admins.map((a) => a.user.pushToken).filter((t): t is string => !!t);
    if (!tokens.length) return;
    await this.send(tokens, title, body, data);
  }

  private async send(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
    const messages: ExpoPushMessage[] = tokens
      .filter((token) => Expo.isExpoPushToken(token))
      .map((to) => ({ to, title, body, data, sound: 'default' as const }));
    if (!messages.length) return;

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await this.expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        // Push delivery is best-effort — never let a notification failure fail the request that triggered it.
        this.logger.warn(`Failed to send push notification chunk: ${(err as Error).message}`);
      }
    }
  }
}
