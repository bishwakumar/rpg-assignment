import { Module } from '@nestjs/common';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { BlogModule } from './blog/blog.module';
import { NotificationModule } from './notification/notification.module';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthService } from './auth/auth.service';

// Helper function to handle subscription connection authentication
async function handleSubscriptionConnect(
  connectionParams: any,
  jwtService: JwtService,
  authService: AuthService,
): Promise<{ token: string | null; user: any }> {
  let token = null;

  if (connectionParams?.authorization) {
    token = connectionParams.authorization.replace('Bearer ', '');
  } else if (connectionParams?.token) {
    token = connectionParams.token;
  }

  if (token) {
    try {
      const payload = jwtService.verify(token);
      const user = await authService.validateUser(payload.userId);
      if (user) {
        return { token, user };
      } else {
        console.warn('User not found for userId:', payload.userId);
        return { token: null, user: null };
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return { token: null, user: null };
    }
  }

  return { token: null, user: null };
}

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [
        NotificationModule,
        AuthModule,
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
          signOptions: { expiresIn: '7d' },
        }),
      ],
      inject: [JwtService, AuthService],
      useFactory: (
        jwtService: JwtService,
        authService: AuthService,
      ) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        subscriptions: {
          'graphql-ws': {
            path: '/graphql',
            onConnect: async (context: any) => {
              return handleSubscriptionConnect(context.connectionParams, jwtService, authService);
            },
          },
          'subscriptions-transport-ws': {
            path: '/graphql',
            onConnect: async (connectionParams: any) => {
              return handleSubscriptionConnect(connectionParams, jwtService, authService);
            },
          },
        },
        context: ({ req, connection }) => {
          // For subscriptions, get user from connection context
          if (connection) {
            const user = connection.context?.user || null;
            
            // Ensure both req and connection are properly structured
            const subscriptionContext = { 
              req: req || { user: user },
              connection: connection,
            };
            
            // If req exists but doesn't have user, add it
            if (subscriptionContext.req && !subscriptionContext.req.user && user) {
              subscriptionContext.req.user = user;
            }
            
            return subscriptionContext;
          }
          // For queries/mutations, get user from request
          return { req: req || {} };
        },
        installSubscriptionHandlers: true,
      }),
    }),
    AuthModule,
    BlogModule,
    NotificationModule,
  ],
})
export class AppModule {}
