import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Blog } from '../../blog/entities/blog.entity';

@ObjectType()
export class NotificationMarkerPayload {
  @Field(() => Int)
  markerVersion: number;

  @Field(() => Blog)
  blog: Blog;

  @Field()
  createdAt: Date;

  /**
   * Cursor for pagination/incremental loading
   * Uses markerVersion as the cursor value for efficient filtering
   */
  @Field(() => Int, { nullable: true })
  cursor?: number;
}

