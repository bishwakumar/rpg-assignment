import { Injectable, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { getRedisConfig } from '../../config/redis.config';

export interface BlogCreatedEvent {
  blogId: string;
  title: string;
  authorId: string;
  createdAt: Date;
}

@Injectable()
export class NotificationQueueService implements OnModuleInit {
  private redis: Redis;
  private readonly QUEUE_NAME = 'blog_created_events';

  constructor() {
    const redisConfig = getRedisConfig();

    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      ...(redisConfig.tls
        ? {
            tls: {
              rejectUnauthorized: false,
            },
          }
        : {}),
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 30000);
        return delay;
      },
    });

    this.redis.on('error', (err) => {
      console.error('Notification Queue Redis error:', err);
    });

    this.redis.on('connect', () => {
      // Notification Queue Redis connected
    });
  }

  async onModuleInit() {
    // Queue service is ready
  }

  /**
   * Enqueue a blog created event to the notification queue
   */
  async enqueueBlogCreatedEvent(event: BlogCreatedEvent): Promise<void> {
    try {
      await this.redis.lpush(this.QUEUE_NAME, JSON.stringify(event));
    } catch (error) {
      console.error('Error enqueueing blog created event:', error);
      throw error;
    }
  }

  /**
   * Dequeue a blog created event from the notification queue (blocking)
   * Used by the notification worker
   */
  async dequeueBlogCreatedEvent(timeout: number = 5): Promise<BlogCreatedEvent | null> {
    try {
      const result = await this.redis.brpop(this.QUEUE_NAME, timeout);
      if (result && result[1]) {
        return JSON.parse(result[1]) as BlogCreatedEvent;
      }
      return null;
    } catch (error) {
      console.error('Error dequeueing blog created event:', error);
      return null;
    }
  }

  /**
   * Get queue length
   */
  async getQueueLength(): Promise<number> {
    try {
      return await this.redis.llen(this.QUEUE_NAME);
    } catch (error) {
      console.error('Error getting queue length:', error);
      return 0;
    }
  }
}

