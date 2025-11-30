import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { NotificationMarker } from './entities/notification-marker.entity';
import { UserNotificationState } from './entities/user-notification-state.entity';
import { NotificationQueueService } from './queue/notification-queue.service';
import { NotificationWorkerService } from './worker/notification-worker.service';
import { BlogModule } from '../blog/blog.module';
import { User } from '../auth/entities/user.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationMarker, UserNotificationState, User]),
    BlogModule, // Import BlogModule to access BlogService in worker
  ],
  providers: [
    NotificationService,
    NotificationResolver,
    NotificationQueueService,
    NotificationWorkerService,
  ],
  exports: [NotificationService, NotificationQueueService],
})
export class NotificationModule {}

