import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Redis } from 'ioredis';
import { PubSub } from 'graphql-subscriptions';
import { Blog } from '../blog/entities/blog.entity';
import { NotificationMarker } from './entities/notification-marker.entity';
import { UserNotificationState } from './entities/user-notification-state.entity';
import { User } from '../auth/entities/user.entity';
import { getRedisConfig } from '../config/redis.config';

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private pubSub: PubSub;
  private redis: Redis;
  private redisSubscriber: Redis;
  private readonly NOTIFICATION_CHANNEL = 'new_blog_notifications';

  constructor(
    @InjectRepository(NotificationMarker)
    private markerRepository: Repository<NotificationMarker>,
    @InjectRepository(UserNotificationState)
    private userStateRepository: Repository<UserNotificationState>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    // Initialize PubSub for GraphQL subscriptions
    this.pubSub = new PubSub();

    // Get Redis configuration (supports both REDIS_URL and individual env vars)
    const redisConfig = getRedisConfig();

    // Initialize Redis client for publishing (separate connection)
    // Note: Must be separate from subscriber connection
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
      enableReadyCheck: false, // Disable ready check to avoid subscriber mode conflicts
      maxRetriesPerRequest: null, // Disable retries for publisher
      retryStrategy: (times) => {
        // Retry with exponential backoff, max 30 seconds
        const delay = Math.min(times * 50, 30000);
        return delay;
      },
      reconnectOnError: (err) => {
        // Reconnect on specific errors
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    // Initialize Redis client for subscribing (separate connection)
    // This connection will be in subscriber mode
    this.redisSubscriber = new Redis({
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
      enableReadyCheck: false, // Disable ready check
      maxRetriesPerRequest: null, // Disable retries for subscriber
      retryStrategy: (times) => {
        // Retry with exponential backoff, max 30 seconds
        const delay = Math.min(times * 50, 30000);
        return delay;
      },
      reconnectOnError: (err) => {
        // Reconnect on specific errors
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    // Handle errors
    this.redis.on('error', (err) => {
      console.error('Redis publisher error:', err);
    });

    this.redis.on('connect', () => {
      // Redis publisher connected
    });

    this.redisSubscriber.on('error', (err) => {
      console.error('Redis subscriber error:', err);
    });

    this.redisSubscriber.on('connect', () => {
      // Redis subscriber connected
    });
  }

  async onModuleInit() {
    try {
      // Subscribe to Redis channel for cross-instance notifications
      // Wait for subscriber to be ready before subscribing
      await this.redisSubscriber.subscribe(this.NOTIFICATION_CHANNEL);
      
      this.redisSubscriber.on('message', async (channel, message) => {
        if (channel === this.NOTIFICATION_CHANNEL) {
          try {
            const parsedMarker = JSON.parse(message);

            // Reconstruct the payload from Redis message
            // Redis payload is serialized, so we need to reconstruct Date objects
            const markerPayload = {
              markerVersion: parsedMarker.markerVersion,
              blog: {
                ...parsedMarker.blog,
                createdAt: new Date(parsedMarker.blog.createdAt),
                updatedAt: new Date(parsedMarker.blog.updatedAt),
                // Preserve authorId for filtering
                authorId: parsedMarker.blog.authorId,
                author: parsedMarker.blog.author
                  ? {
                      ...parsedMarker.blog.author,
                      id: parsedMarker.blog.author.id,
                      createdAt: new Date(parsedMarker.blog.author.createdAt),
                      updatedAt: new Date(parsedMarker.blog.author.updatedAt),
                    }
                  : undefined,
              },
              createdAt: new Date(parsedMarker.createdAt),
              // Include cursor (markerVersion) for cursor-based pagination
              cursor: parsedMarker.markerVersion || parsedMarker.cursor,
            };

            // Use safe publish to ensure payload is valid
            await this.safePublishMarker(markerPayload);
          } catch (error) {
            console.error('Error parsing or publishing marker message:', error);
            // Don't throw - log and continue to avoid breaking the Redis subscriber
          }
        }
      });
    } catch (error) {
      console.error('Error initializing Redis subscriber:', error);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.redisSubscriber && this.redisSubscriber.status === 'ready') {
        await this.redisSubscriber.unsubscribe(this.NOTIFICATION_CHANNEL);
        await this.redisSubscriber.quit();
      }
      if (this.redis && this.redis.status === 'ready') {
        await this.redis.quit();
      }
    } catch (error) {
      console.error('Error closing Redis connections:', error);
    }
  }

  /**
   * Safely publishes a notification marker to PubSub
   * Validates the payload before publishing to ensure it's never null
   * 
   * This method ensures the subscription resolver never receives null/undefined payloads,
   * preventing the "Cannot return null for non-nullable field" error.
   * 
   * Example usage:
   * ```typescript
   * const markerPayload = {
   *   markerVersion: 123,
   *   blog: blogEntity,
   *   createdAt: new Date(),
   *   cursor: 123, // Optional: for cursor-based pagination
   * };
   * 
   * try {
   *   await this.safePublishMarker(markerPayload);
   *   console.log('Marker published successfully');
   * } catch (error) {
   *   console.error('Failed to publish marker:', error);
   *   // Handle error appropriately
   * }
   * ```
   * 
   * @param payload - The notification marker payload to publish
   * @throws Error if payload is invalid and cannot be published
   */
  private async safePublishMarker(payload: {
    markerVersion: number;
    blog: Blog;
    createdAt: Date;
    cursor?: number;
  }): Promise<void> {
    // Validate payload before publishing
    if (!payload) {
      throw new Error('Cannot publish null or undefined payload');
    }

    if (typeof payload.markerVersion !== 'number' || payload.markerVersion <= 0) {
      throw new Error(
        `Invalid markerVersion: ${payload.markerVersion}. Must be a positive number.`,
      );
    }

    if (!payload.blog || typeof payload.blog !== 'object') {
      throw new Error('Invalid blog: must be a valid Blog object');
    }

    if (!payload.blog.id) {
      throw new Error('Invalid blog: missing id field');
    }

    // Validate that author information is present (required for filtering)
    const authorId = payload.blog.author?.id || payload.blog.authorId;
    if (!authorId) {
      throw new Error('Invalid blog: missing author information (author.id or authorId) - required for notification filtering');
    }

    if (!(payload.createdAt instanceof Date)) {
      throw new Error('Invalid createdAt: must be a Date object');
    }

    // Publish to local PubSub FIRST (for immediate WebSocket delivery)
    // This triggers the GraphQL subscription resolver which broadcasts to all connected clients
    try {
      // pubSub.publish publishes the payload directly
      // The asyncIterator will automatically wrap it as { newNotificationMarker: payload }
      await this.pubSub.publish('newNotificationMarker', payload);
    } catch (error) {
      console.error('Error publishing to local PubSub:', error);
      // Re-throw to ensure caller knows publish failed
      throw error;
    }
  }

  /**
   * Safely publishes a notification marker to Redis for cross-instance support
   * 
   * @param payload - The notification marker payload to publish
   */
  private async safePublishToRedis(payload: {
    markerVersion: number;
    blog: Blog;
    createdAt: Date;
    cursor?: number;
  }): Promise<void> {
    try {
      // Serialize payload for Redis (only include serializable fields)
      const redisPayload = {
        markerVersion: payload.markerVersion,
        blog: {
          id: payload.blog.id,
          title: payload.blog.title,
          content: payload.blog.content,
          createdAt: payload.blog.createdAt.toISOString(),
          updatedAt: payload.blog.updatedAt.toISOString(),
          authorId: payload.blog.authorId,
          // Include author if available
          author: payload.blog.author
            ? {
                id: payload.blog.author.id,
                email: payload.blog.author.email,
                username: payload.blog.author.username,
                createdAt: payload.blog.author.createdAt.toISOString(),
                updatedAt: payload.blog.author.updatedAt.toISOString(),
              }
            : undefined,
        },
        createdAt: payload.createdAt.toISOString(),
        // Include cursor for cursor-based pagination
        cursor: payload.cursor || payload.markerVersion,
      };

      await this.redis.publish(
        this.NOTIFICATION_CHANNEL,
        JSON.stringify(redisPayload),
      );
    } catch (error) {
      console.error('❌ Error publishing to Redis:', error);
      // Continue even if Redis publish fails - local PubSub will still work
      // Don't throw - Redis is optional for cross-instance support
    }
  }

  async createMarker(blog: Blog): Promise<NotificationMarker> {
    // Create a new marker - markerVersion will be auto-incremented
    const marker = this.markerRepository.create({
      blog,
      blogId: blog.id,
    });
    const savedMarker = await this.markerRepository.save(marker);

    // Load blog relation for response
    const markerWithBlog = await this.markerRepository.findOne({
      where: { markerVersion: savedMarker.markerVersion },
      relations: ['blog', 'blog.author'],
    });

    if (!markerWithBlog) {
      throw new Error('Failed to load marker with blog');
    }

    // Validate that blog is loaded
    if (!markerWithBlog.blog) {
      throw new Error('Failed to load blog relation for marker');
    }

    // Validate that blog author is loaded (critical for filtering)
    if (!markerWithBlog.blog.author) {
      console.warn('⚠️ [BACKEND] Blog author not loaded, attempting to reload...');
      // Try to reload with author
      const reloadedMarker = await this.markerRepository.findOne({
        where: { markerVersion: savedMarker.markerVersion },
        relations: ['blog', 'blog.author'],
      });
      if (reloadedMarker?.blog?.author) {
        markerWithBlog.blog = reloadedMarker.blog;
      } else {
        throw new Error('Failed to load blog author relation - required for notification filtering');
      }
    }

    // Ensure authorId is explicitly set on blog object for filtering
    if (markerWithBlog.blog.author && !markerWithBlog.blog.authorId) {
      markerWithBlog.blog.authorId = markerWithBlog.blog.author.id;
    }

    // Create payload matching GraphQL NotificationMarkerPayload type
    // GraphQL will serialize the Blog entity according to the schema
    // Include cursor (markerVersion) for cursor-based pagination
    const markerPayload = {
      markerVersion: markerWithBlog.markerVersion,
      blog: {
        ...markerWithBlog.blog,
        // Explicitly ensure author and authorId are included
        author: markerWithBlog.blog.author,
        authorId: markerWithBlog.blog.authorId || markerWithBlog.blog.author?.id,
      },
      createdAt: markerWithBlog.createdAt,
      cursor: markerWithBlog.markerVersion, // Cursor for incremental loading
    };

    // Use safe publish methods
    await this.safePublishMarker(markerPayload);
    await this.safePublishToRedis(markerPayload);

    return markerWithBlog;
  }

  async getUnreadMarkers(user: User): Promise<NotificationMarker[]> {
    // Get user's last seen marker version
    let userState = await this.userStateRepository.findOne({
      where: { userId: user.id },
    });

    // If user state doesn't exist, create it with lastSeenMarkerVersion = 0
    if (!userState) {
      userState = this.userStateRepository.create({
        userId: user.id,
        lastSeenMarkerVersion: 0,
      });
      await this.userStateRepository.save(userState);
    }

    // Fetch all markers where markerVersion > lastSeenMarkerVersion
    // Return all markers for all users (including author's own blogs)
    const markers = await this.markerRepository.find({
      where: {
        markerVersion: MoreThan(userState.lastSeenMarkerVersion),
      },
      relations: ['blog', 'blog.author'],
      order: { markerVersion: 'ASC' },
    });

    return markers;
  }

  async getAllMarkers(user: User): Promise<NotificationMarker[]> {
    // Fetch all markers for blogs created after the user's registration date
    // This ensures new users only see notifications from blogs posted after they signed up
    
    // Reload user from database to ensure we have the latest createdAt value
    // This is important because the user object from JWT might not have all fields
    const freshUser = await this.userRepository.findOne({ 
      where: { id: user.id },
      select: ['id', 'email', 'username', 'createdAt']
    });
    
    if (!freshUser || !freshUser.createdAt) {
      console.error(`User ${user.id} not found or has no createdAt date`);
      return []; // Return empty array if user data is invalid
    }
    
    // Convert to proper date object and subtract 1 second as buffer
    // This ensures we don't include blogs created at the exact same millisecond
    const userCreatedAt = freshUser.createdAt instanceof Date 
      ? new Date(freshUser.createdAt.getTime() - 1000) // Subtract 1 second
      : new Date(new Date(freshUser.createdAt).getTime() - 1000);
    
    console.log(`Filtering markers for user ${freshUser.id} (registered: ${freshUser.createdAt.toISOString()}, filter date: ${userCreatedAt.toISOString()})`);
    
    const markers = await this.markerRepository
      .createQueryBuilder('marker')
      .leftJoinAndSelect('marker.blog', 'blog')
      .leftJoinAndSelect('blog.author', 'author')
      .where('blog.createdAt > :userCreatedAt', { userCreatedAt: userCreatedAt })
      .orderBy('marker.markerVersion', 'DESC')
      .getMany();

    console.log(`Found ${markers.length} markers for user ${freshUser.id} after registration date`);
    if (markers.length > 0) {
      console.log(`Sample blog dates: ${markers.slice(0, 3).map(m => m.blog.createdAt.toISOString()).join(', ')}`);
    }

    return markers;
  }

  async markAsSeen(user: User, markerVersion: number): Promise<UserNotificationState> {
    let userState = await this.userStateRepository.findOne({
      where: { userId: user.id },
    });

    if (!userState) {
      userState = this.userStateRepository.create({
        userId: user.id,
        lastSeenMarkerVersion: markerVersion,
      });
    } else {
      // Update to the highest marker version seen
      userState.lastSeenMarkerVersion = Math.max(
        userState.lastSeenMarkerVersion,
        markerVersion,
      );
    }

    return this.userStateRepository.save(userState);
  }

  async getUserState(user: User): Promise<UserNotificationState> {
    let userState = await this.userStateRepository.findOne({
      where: { userId: user.id },
    });

    if (!userState) {
      userState = this.userStateRepository.create({
        userId: user.id,
        lastSeenMarkerVersion: 0,
      });
      await this.userStateRepository.save(userState);
    }

    return userState;
  }

  async getUnreadCount(user: User): Promise<number> {
    // Get user's last seen marker version
    let userState = await this.userStateRepository.findOne({
      where: { userId: user.id },
    });

    // If user state doesn't exist, create it with lastSeenMarkerVersion = 0
    if (!userState) {
      userState = this.userStateRepository.create({
        userId: user.id,
        lastSeenMarkerVersion: 0,
      });
      await this.userStateRepository.save(userState);
    }

    // Reload user from database to ensure we have the latest createdAt value
    const freshUser = await this.userRepository.findOne({ 
      where: { id: user.id },
      select: ['id', 'createdAt']
    });
    
    if (!freshUser || !freshUser.createdAt) {
      console.error(`User ${user.id} not found or has no createdAt date`);
      return 0; // Return 0 if user data is invalid
    }
    
    // Convert to proper date object and subtract 1 second as buffer
    const userCreatedAt = freshUser.createdAt instanceof Date 
      ? new Date(freshUser.createdAt.getTime() - 1000) // Subtract 1 second
      : new Date(new Date(freshUser.createdAt).getTime() - 1000);

    // Count markers where markerVersion > lastSeenMarkerVersion
    // AND blog was created after user registration
    const count = await this.markerRepository
      .createQueryBuilder('marker')
      .leftJoin('marker.blog', 'blog')
      .where('marker.markerVersion > :lastSeenMarkerVersion', { 
        lastSeenMarkerVersion: userState.lastSeenMarkerVersion 
      })
      .andWhere('blog.createdAt > :userCreatedAt', { 
        userCreatedAt: userCreatedAt 
      })
      .getCount();

    return count;
  }

  getPubSub(): PubSub {
    return this.pubSub;
  }
}

