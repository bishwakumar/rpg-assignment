import { Resolver, Mutation, Query, Args, Context, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth.response';
import { NotificationService } from '../notification/notification.service';
import { NotificationMarker } from '../notification/entities/notification-marker.entity';
import { UserNotificationState } from '../notification/entities/user-notification-state.entity';
import { UnreadCountResponse } from '../notification/dto/unread-count-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './entities/user.entity';

@Resolver()
export class AuthResolver {
  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
  ) {}

  @Mutation(() => AuthResponse)
  async register(@Args('input') registerInput: RegisterInput): Promise<AuthResponse> {
    return this.authService.register(registerInput);
  }

  @Mutation(() => AuthResponse)
  async login(@Args('input') loginInput: LoginInput): Promise<AuthResponse> {
    return this.authService.login(loginInput);
  }

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async me(@Context() context: { req: { user: User } }): Promise<User> {
    return context.req.user;
  }

  // Notification state queries/mutations moved to Auth Module
  @Query(() => [NotificationMarker])
  @UseGuards(JwtAuthGuard)
  async unreadMarkers(
    @Context() context: { req: { user: User } },
  ): Promise<NotificationMarker[]> {
    return this.notificationService.getUnreadMarkers(context.req.user);
  }

  @Query(() => [NotificationMarker])
  @UseGuards(JwtAuthGuard)
  async allMarkers(
    @Context() context: { req: { user: User } },
  ): Promise<NotificationMarker[]> {
    return this.notificationService.getAllMarkers(context.req.user);
  }

  @Query(() => UserNotificationState)
  @UseGuards(JwtAuthGuard)
  async notificationState(
    @Context() context: { req: { user: User } },
  ): Promise<UserNotificationState> {
    return this.notificationService.getUserState(context.req.user);
  }

  @Query(() => Int)
  @UseGuards(JwtAuthGuard)
  async unreadNotificationCount(
    @Context() context: { req: { user: User } },
  ): Promise<number> {
    return this.notificationService.getUnreadCount(context.req.user);
  }

  @Mutation(() => UnreadCountResponse)
  @UseGuards(JwtAuthGuard)
  async updateLastSeenMarkerVersion(
    @Args('markerVersion', { type: () => Int }) markerVersion: number,
    @Context() context: { req: { user: User } },
  ): Promise<UnreadCountResponse> {
    const userState = await this.notificationService.markAsSeen(context.req.user, markerVersion);
    const count = await this.notificationService.getUnreadCount(context.req.user);
    
    return {
      count,
      lastSeenMarkerVersion: userState.lastSeenMarkerVersion,
    };
  }
}

