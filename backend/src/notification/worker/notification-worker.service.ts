import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NotificationQueueService } from '../queue/notification-queue.service';
import { NotificationService } from '../notification.service';
import { BlogService } from '../../blog/blog.service';

@Injectable()
export class NotificationWorkerService implements OnModuleInit, OnModuleDestroy {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly PROCESSING_INTERVAL_MS = 100; // Check queue every 100ms

  constructor(
    private queueService: NotificationQueueService,
    private notificationService: NotificationService,
    private blogService: BlogService,
  ) {}

  async onModuleInit() {
    this.startProcessing();
  }

  async onModuleDestroy() {
    this.stopProcessing();
  }

  /**
   * Start processing queue messages
   */
  private startProcessing() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processQueue();
  }

  /**
   * Stop processing queue messages
   */
  private stopProcessing() {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process queue messages continuously
   */
  private async processQueue() {
    if (!this.isProcessing) {
      return;
    }

    try {
      // Try to dequeue an event (non-blocking with short timeout)
      const event = await this.queueService.dequeueBlogCreatedEvent(1);

      if (event) {
        await this.processBlogCreatedEvent(event);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      // Schedule next processing cycle
      if (this.isProcessing) {
        this.processingInterval = setTimeout(() => {
          this.processQueue();
        }, this.PROCESSING_INTERVAL_MS);
      }
    }
  }

  /**
   * Process a single blog created event
   */
  private async processBlogCreatedEvent(event: any): Promise<void> {
    try {
      // Fetch the full blog with relations
      const blog = await this.blogService.findOne(event.blogId);

      if (!blog) {
        console.error(`Blog not found: ${event.blogId}`);
        return;
      }

      // Create notification marker (this persists to DB and publishes to PubSub)
      await this.notificationService.createMarker(blog);
    } catch (error) {
      console.error(`Error processing blog created event ${event.blogId}:`, error);
      // In production, you might want to implement retry logic or dead letter queue
      throw error;
    }
  }
}

