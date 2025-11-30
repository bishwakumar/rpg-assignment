import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';

@Injectable()
export class SubscriptionAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const connection = ctx.getContext().connection;

    if (!connection || !connection.context) {
      return false;
    }

    const token = connection.context.token;

    if (!token) {
      return false;
    }

    try {
      const payload = this.jwtService.verify(token);
      const user = await this.authService.validateUser(payload.userId);
      
      if (user) {
        connection.context.user = user;
        return true;
      }
    } catch (error) {
      return false;
    }

    return false;
  }
}

