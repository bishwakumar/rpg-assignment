# Readit Blogs 📝

**Live Application:** [https://readitblogs.vercel.app](https://readitblogs.vercel.app)

A full-stack blog platform with real-time notifications built with Vue 3, NestJS, GraphQL, PostgreSQL, and Redis. Sign up, log in, create blog posts, real-time notifications when new blogs are published.

![System Architecture](./architecture-diagram.png)

---

## 🎯 Overview

- **Live Demo**: Visit [readitblogs.vercel.app](https://readitblogs.vercel.app) to explore the application
- **Real-time Notifications**: Get instant notifications via GraphQL subscriptions when new blogs are posted
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Modern Stack**: Built with Vue 3, NestJS, GraphQL, PostgreSQL, and Redis
- **Production Ready**: Deployed on Vercel (frontend) and Railway (backend)

---

### Data Flow

1. **Blog Creation**: User creates blog → Backend receives mutation
2. **Queue Processing**: Blog event enqueued to Redis queue
3. **Worker Processing**: Background worker processes queue → Creates notification marker
4. **Redis Broadcast**: Marker published to Redis PubSub channel
5. **GraphQL Subscription**: WebSocket delivers notification to subscribed clients
6. **Real-time Update**: Frontend receives notification instantly

---

## 🛠️ Tech Stack

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **Pinia** - State management
- **Apollo Client** - GraphQL client with subscriptions support
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Vue Router** - Client-side routing

### Backend
- **NestJS** - Progressive Node.js framework
- **Apollo Server** - GraphQL server implementation
- **TypeORM** - Object-Relational Mapping
- **Passport.js** - Authentication middleware
- **JWT** - JSON Web Tokens for authentication
- **ioredis** - Redis client for PubSub and queues
- **bcrypt** - Password hashing

### Infrastructure
- **PostgreSQL** (Render) - Primary database
- **Redis** (Upstash) - PubSub and queue management
- **Vercel** - Frontend hosting
- **Railway** - Backend hosting

---


### Authentication
- ✅ User registration with email, username, and password
- ✅ Secure login with JWT tokens
- ✅ Password hashing with bcrypt
- ✅ Protected routes and GraphQL operations
- ✅ Token-based authentication for HTTP and WebSocket

### Blog Management
- ✅ Blog CRUD
- ✅ Real-time blog list updates
- ✅ Blog author information and timestamps

### Real-time Notifications
- ✅ Queue-based processing for reliability
- ✅ Redis PubSub for cross-instance support
- ✅ GraphQL subscriptions for WebSocket delivery
- ✅ Persistent notification storage
- ✅ Unread notification count
- ✅ Auto-recovery on WebSocket reconnection

---

## 📦 Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher) - or use cloud provider
- **Redis** (v6 or higher) - or use cloud provider
- **npm** or **yarn** package manager

---

## 🚀 Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd rpg-assignment
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in `backend/` directory:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/rpg_blog
# OR use individual variables:
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=postgres
# DB_NAME=rpg_blog

# Redis Configuration
REDIS_URL=redis://localhost:6379
# OR use individual variables:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production

# Server Configuration
PORT=3200
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
npm run start:dev
```

Backend will run on `http://localhost:3200`  
GraphQL Playground: `http://localhost:3200/graphql`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file in `frontend/` directory (optional for local dev):

```env
VITE_GRAPHQL_URL=http://localhost:3200/graphql
VITE_GRAPHQL_WS_URL=ws://localhost:3200/graphql
```

Start the frontend:

```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

---

## 📖 GraphQL API Documentation

### Base URLs

- **Production**: `https://rpg-blog-backend.up.railway.app/graphql`
- **WebSocket**: `wss://rpg-blog-backend.up.railway.app/graphql`
- **Local Development**: `http://localhost:3200/graphql`

### Authentication

#### Register User

```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    token
    user {
      id
      email
      username
      createdAt
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "email": "dev@gmail.com",
    "username": "dev",
    "password": "dev123"
  }
}
```

#### Login

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    token
    user {
      id
      email
      username
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "email": "dev@gmail.com",
    "password": "dev123"
  }
}
```

### Blog Operations

#### Get All Blogs

```graphql
query Blogs {
  blogs {
    id
    title
    content
    author {
      id
      username
      email
    }
    createdAt
    updatedAt
  }
}
```

#### Get Single Blog

```graphql
query Blog($id: ID!) {
  blog(id: $id) {
    id
    title
    content
    author {
      id
      username
      email
    }
    createdAt
    updatedAt
  }
}
```

#### Create Blog (Requires Authentication)

```graphql
mutation CreateBlog($input: CreateBlogInput!) {
  createBlog(input: $input) {
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

**Variables:**
```json
{
  "input": {
    "title": "My First Blog Post",
    "content": "This is the content of my blog post..."
  }
}
```

### Notifications

#### Get All Notification Markers

```graphql
query AllMarkers {
  allMarkers {
    markerVersion
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
    createdAt
  }
}
```

#### Get Unread Notification Count

```graphql
query UnreadNotificationCount {
  unreadNotificationCount
}
```

#### Subscribe to New Notifications (Real-time)

```graphql
subscription NewNotificationMarker {
  newNotificationMarker {
    markerVersion
    blog {
      id
      title
      content
      author {
        id
        username
        email
      }
      createdAt
    }
    createdAt
  }
}
```

### Authentication Headers

For protected operations, include the JWT token in the request:

**HTTP Requests:**
```
Authorization: Bearer <your-jwt-token>
```

**WebSocket Subscriptions:**
The token is automatically included in connection parameters from the frontend.

---

## 🔧 Environment Variables

### Backend

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection URL | - | Yes (or use individual DB_* vars) |
| `DATABASE_SSL` | Enable SSL for database | `false` | No |
| `REDIS_URL` | Redis connection URL | - | Yes (or use individual REDIS_* vars) |
| `REDIS_TLS` | Enable TLS for Redis | `false` | No |
| `JWT_SECRET` | Secret key for JWT tokens | - | Yes |
| `PORT` | Server port | `3200` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` | No |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GRAPHQL_URL` | GraphQL HTTP endpoint | `http://localhost:3200/graphql` |
| `VITE_GRAPHQL_WS_URL` | GraphQL WebSocket endpoint | `ws://localhost:3200/graphql` |

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend Tests

```bash
cd frontend

# Run tests (if configured)
npm run test
```

---

## 🐛 Troubleshooting

### CORS Errors

- Ensure `FRONTEND_URL` in backend matches your frontend domain exactly
- Check that `NODE_ENV=production` is set in production
- Verify CORS logs in backend console

### Database Connection Issues

- Verify `DATABASE_URL` is correctly formatted
- For cloud providers (Render), ensure `DATABASE_SSL=true`
- Check database credentials and network access

### Redis Connection Issues

- Verify `REDIS_URL` is correctly formatted
- For Upstash, ensure `REDIS_TLS=true`
- Check Redis credentials and network access

### WebSocket Connection Issues

- Verify `VITE_GRAPHQL_WS_URL` uses `wss://` for HTTPS
- Check that JWT token is included in WebSocket connection params
- Ensure backend CORS allows WebSocket connections


**Live Application:** [https://readitblogs.vercel.app](https://readitblogs.vercel.app)

**Try it out:** Sign up, log in, create a blog post, and watch real-time notifications appear when new blogs are published! 🚀
