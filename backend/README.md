# Blog Platform Backend

A NestJS-based GraphQL backend for a blog platform with real-time notifications.

## Features

- **User Authentication**: User registration and login with JWT tokens
- **Blog Management**: Create, read, update, and delete blog posts
- **Real-time Notifications**: GraphQL subscriptions for real-time blog notifications
- **GraphQL API**: Full GraphQL API with queries, mutations, and subscriptions
- **PostgreSQL**: Database for persistent storage
- **Redis**: Pub/Sub for cross-instance notifications

## Architecture

```
Backend
├── GraphQL Gateway (Apollo Server)
├── Auth Module (JWT authentication)
├── Blog Module (CRUD operations)
└── Notification Service (Real-time subscriptions)

Infrastructure
├── PostgreSQL (Database)
└── Redis (Pub/Sub)
```

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Redis (v6 or higher)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database and Redis configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=rpg_blog

JWT_SECRET=your-secret-key-change-in-production

REDIS_HOST=localhost
REDIS_PORT=6379

PORT=3200
FRONTEND_URL=http://localhost:3000
```

3. Create PostgreSQL database:
```sql
CREATE DATABASE rpg_blog;
```

4. Start Redis:
```bash
redis-server
```

## Running the Application

### Development
```bash
npm run start:dev
```

The server will start on `http://localhost:3200` and GraphQL playground will be available at `http://localhost:3200/graphql`.

## GraphQL API

### Authentication

**Register User**
```graphql
mutation {
  register(input: {
    email: "user@example.com"
    username: "johndoe"
    password: "password123"
  }) {
    token
    user {
      id
      email
      username
    }
  }
}
```

**Login**
```graphql
mutation {
  login(input: {
    email: "user@example.com"
    password: "password123"
  }) {
    token
    user {
      id
      email
      username
    }
  }
}
```

### Blog Operations

**Create Blog** (Requires authentication)
```graphql
mutation {
  createBlog(input: {
    title: "My First Blog Post"
    content: "This is the content of my blog post."
  }) {
    id
    title
    content
    author {
      id
      username
    }
    createdAt
  }
}
```

**Get All Blogs**
```graphql
query {
  blogs {
    id
    title
    content
    author {
      id
      username
    }
    createdAt
  }
}
```

**Get Single Blog**
```graphql
query {
  blog(id: "blog-id") {
    id
    title
    content
    author {
      id
      username
    }
    createdAt
  }
}
```

**Update Blog** (Requires authentication, owner only)
```graphql
mutation {
  updateBlog(id: "blog-id", input: {
    title: "Updated Title"
    content: "Updated content"
  }) {
    id
    title
    content
  }
}
```

**Delete Blog** (Requires authentication, owner only)
```graphql
mutation {
  deleteBlog(id: "blog-id")
}
```

### Real-time Notifications

**Subscribe to New Blog Notifications**
```graphql
subscription {
  newBlogNotification {
    message
    blog {
      id
      title
      content
      author {
        id
        username
      }
      createdAt
    }
    timestamp
  }
}
```

## Authentication

For protected operations (mutations and some queries), include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

For GraphQL subscriptions, pass the token in the connection parameters:

```javascript
{
  authorization: `Bearer ${token}`
}
```

## Project Structure

```
src/
├── auth/              # Authentication module
│   ├── entities/      # User entity
│   ├── dto/           # Data transfer objects
│   ├── guards/        # JWT guards
│   ├── strategies/    # Passport strategies
│   └── decorators/    # Custom decorators
├── blog/              # Blog module
│   ├── entities/      # Blog entity
│   └── dto/           # Blog DTOs
├── notification/      # Notification service
│   └── dto/           # Notification DTOs
├── config/            # Configuration files
└── main.ts            # Application entry point
```

## Environment Variables

- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_USERNAME`: PostgreSQL username (default: postgres)
- `DB_PASSWORD`: PostgreSQL password (default: postgres)
- `DB_NAME`: Database name (default: rpg_blog)
- `JWT_SECRET`: Secret key for JWT tokens
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (optional)
- `PORT`: Server port (default: 3200)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)
- `NODE_ENV`: Environment (development/production)

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## License

UNLICENSED
