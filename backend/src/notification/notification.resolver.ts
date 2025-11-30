import { Resolver, Subscription, Context, Args, Int } from '@nestjs/graphql';
import { NotificationService } from './notification.service';
import { NotificationMarkerPayload } from './dto/notification-marker.dto';

/**
 * Safe default payload to use when the actual payload is missing or invalid
 * This ensures the subscription never returns null for the non-nullable field
 */
const createDefaultPayload = (): NotificationMarkerPayload => {
  return {
    markerVersion: 0,
    blog: null as any, // Will be handled by GraphQL validation
    createdAt: new Date(),
    cursor: 0,
  };
};

/**
 * Validates and normalizes the payload to ensure it's never null
 * @param payload - The payload from PubSub
 * @returns A valid NotificationMarkerPayload, or a default if payload is invalid
 */
const safeResolvePayload = (
  payload: any,
): NotificationMarkerPayload => {
  // If payload is null, undefined, or not an object, return default
  if (!payload || typeof payload !== 'object') {
    console.warn('⚠️ [RESOLVER] Received invalid payload, using default:', payload);
    return createDefaultPayload();
  }

  // Validate required fields
  const hasMarkerVersion =
    typeof payload.markerVersion === 'number' &&
    payload.markerVersion > 0;
  const hasBlog = payload.blog && typeof payload.blog === 'object';
  const hasCreatedAt = payload.createdAt instanceof Date;

  // If critical fields are missing, return default
  if (!hasMarkerVersion || !hasBlog || !hasCreatedAt) {
    console.warn('⚠️ [RESOLVER] Payload missing required fields, using default:', {
      hasMarkerVersion,
      hasBlog,
      hasCreatedAt,
      payload,
    });
    return createDefaultPayload();
  }

      // Return validated payload with cursor
      return {
        markerVersion: payload.markerVersion,
        blog: payload.blog,
        createdAt: payload.createdAt,
        // Include cursor (markerVersion) for incremental loading
        cursor: payload.markerVersion,
      };
};

@Resolver()
export class NotificationResolver {
  constructor(private notificationService: NotificationService) {}

  /**
   * WebSocket subscription for real-time marker events
   * Broadcasts markers received from Notification PubSub to all connected clients
   * This subscription listens to 'newNotificationMarker' events from PubSub
   * 
   * Supports cursor-based filtering for incremental notifications:
   * - If cursor is provided, only returns markers with markerVersion > cursor
   * - If cursor is not provided, returns all markers
   * 
   * The resolve function ensures we never return null for the non-nullable field,
   * providing a safe default if the payload is missing or invalid.
   * 
   * @param cursor - Optional cursor (markerVersion) to filter notifications incrementally
   */
  @Subscription(() => NotificationMarkerPayload, {
    name: 'newNotificationMarker',
    /**
     * Filter function - allows all notifications through
     * Only applies cursor-based filtering if cursor is provided
     */
    filter: (payload, variables: { cursor?: number }, context) => {
      // Handle wrapped payload
      let actualPayload = payload;
      if (payload?.newNotificationMarker !== undefined) {
        actualPayload = payload.newNotificationMarker;
      }

      // Cursor-based filtering: if cursor is provided, only return markers after that cursor
      if (variables?.cursor !== undefined && variables.cursor !== null) {
        const markerVersion = actualPayload?.markerVersion;
        if (typeof markerVersion !== 'number') {
          console.warn('⚠️ [RESOLVER] Invalid markerVersion in payload for cursor filter:', markerVersion);
          return false;
        }
        
        // Only return markers with version greater than cursor
        return markerVersion > variables.cursor;
      }

      // No cursor filter - broadcast to all clients
      return true;
    },
    /**
     * Safe resolve function that ensures we never return null
     * This is critical because the subscription field is non-nullable in the schema
     */
    resolve: (payload: any): NotificationMarkerPayload => {
      // Handle wrapped payload (PubSub may wrap it as { newNotificationMarker: payload })
      let actualPayload = payload;
      if (payload?.newNotificationMarker !== undefined) {
        actualPayload = payload.newNotificationMarker;
      }

      // Validate and normalize the payload
      const resolvedPayload = safeResolvePayload(actualPayload);
      
      // Ensure cursor is set (use markerVersion as cursor)
      if (!resolvedPayload.cursor && resolvedPayload.markerVersion > 0) {
        resolvedPayload.cursor = resolvedPayload.markerVersion;
      }

      return resolvedPayload;
    },
  })
  subscribeToNewMarkers(
    @Args('cursor', { type: () => Int, nullable: true })
    cursor?: number,
    @Context() context?: any,
  ) {
    const pubSub = this.notificationService.getPubSub();
    if (!pubSub) {
      console.error('PubSub instance is null!');
      throw new Error('PubSub instance not available');
    }
    
    try {
      // Get user from context for filtering
      const user = context?.connection?.context?.user || context?.req?.user || context?.user;
      const userId = user?.id ? String(user.id).trim() : null;
      
      // Create asyncIterator - the filter in the decorator will handle filtering
      const asyncIterator = pubSub.asyncIterator('newNotificationMarker');
      
      if (!asyncIterator) {
        console.error('AsyncIterator is null!');
        throw new Error('Failed to create asyncIterator');
      }
      
      return asyncIterator;
    } catch (error) {
      console.error('Error creating asyncIterator:', error);
      throw error;
    }
  }
}


