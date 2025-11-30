import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '../entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const gqlContext = GqlExecutionContext.create(ctx);
    const request = gqlContext.getContext().req;
    return request.user;
  },
);

