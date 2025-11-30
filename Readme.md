# Readit Blogs 

A full-stack blog platform with real-time notifications built with Vue 3, NestJS, GraphQL, PostgreSQL, and Redis.

![System Architecture](./architecture-diagram.png)

## 🎯 Overview

Blog platform with JWT authentication, blog CRUD operations, and real-time notifications via GraphQL subscriptions. Features queue-based notification processing with Redis PubSub for cross-instance support and persistent notification storage.

## 🏛️ Architecture

**Components:**
- Frontend: Vue 3 + Pinia + Apollo Client
- Backend: NestJS GraphQL Gateway (Auth, Blog, Notification modules)
- Infrastructure: PostgreSQL + Redis (PubSub)

**Data Flow:** Blog created → Queue → Worker → DB marker → Redis broadcast → GraphQL subscriptions → WebSocket delivery

## 🛠️ Tech Stack

**Frontend:** Vue 3, Pinia, Apollo Client, TypeScript, Vite  
**Backend:** NestJS, Apollo Server, TypeORM, Passport.js, JWT, Redis  
**Infrastructure:** PostgreSQL, Redis

## 📦 Prerequisites

Node.js (v18+), PostgreSQL (v12+), Redis (v6+)

## 🚀 Setup

### 1. Clone & Install
```bash
git clone <repository-url>
cd rpg-assignment
```

### 2. Database Setup
```bash
# PostgreSQL
psql -U postgres -c "CREATE DATABASE rpg_blog;"

# Redis
redis-cli ping  # Verify: PONG
```

### 3. Backend
```bash
cd backend
npm install
cp .env.example .env
# Configure: DB_*, JWT_SECRET, REDIS_*, PORT=3200, FRONTEND_URL
npm run start:dev
```
Server: `http://localhost:3200` | GraphQL: `http://localhost:3200/graphql`

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend: `http://localhost:5173`

## 🎨 Features

- **Auth:** JWT-based (7-day expiration), bcrypt password hashing, protected routes
- **Blogs:** CRUD with owner-only modification, real-time updates
- **Notifications:** Version-based markers, queue processing, Redis PubSub, persistent storage, auto-recovery on reconnect

## 📖 API

**Endpoint:** `http://localhost:3200/graphql` | **WebSocket:** `ws://localhost:3200/graphql`

### Key Operations

**Register/Login:**
```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) { token, user { id, email, username } }
}
```

**Blogs:**
```graphql
query Blogs { blogs { id, title, content, author { username } } }
mutation CreateBlog($input: CreateBlogInput!) {
  createBlog(input: $input) { id, title, content }
}
```

**Notifications:**
```graphql
query AllMarkers { allMarkers { markerVersion, blog { title } } }
query UnreadNotificationCount { unreadNotificationCount }
subscription NewNotificationMarker {
  newNotificationMarker { markerVersion, blog { title } }
}
```
