import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

/**
 * Thin wrapper providing a short-lived distributed lock, used to prevent two
 * diners from confirming the same table/slot at the same time
 * (see docs/ARCHITECTURE.md §3.1).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379'));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /** Acquires a lock for `key`, runs `fn`, then releases it. Throws if the lock is already held. */
  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const token = randomUUID();
    const acquired = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    if (!acquired) {
      throw new ServiceUnavailableException('This slot is currently being booked by someone else, please retry');
    }
    try {
      return await fn();
    } finally {
      const script = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end`;
      await this.client.eval(script, 1, key, token);
    }
  }
}
