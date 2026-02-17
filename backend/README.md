# Home Tutor Backend

## Run
1. Copy `env.example` to `.env`.
2. Set `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN`.
3. Install deps: `npm install`
4. Start server: `npm run dev`

## Required Env
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_ORIGIN`

## Auth Endpoints
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`

## User/Profile Endpoints
- `GET /api/users/me`
- `PUT /api/users/me`
- `PUT /api/users/me/password`
- `PUT /api/users/me/settings`

## Course/Enrollment/Session Endpoints
- `GET /api/courses`
- `GET /api/courses/:id`
- `POST /api/courses` (tutor)
- `GET /api/enrollments`
- `POST /api/enrollments` (student)
- `GET /api/sessions`
- `POST /api/sessions` (tutor)

## Messaging Endpoints
- `GET /api/messages/threads`
- `POST /api/messages/threads/request`
- `POST /api/messages/threads/:threadId/approve`
- `POST /api/messages/threads/:threadId/reject`
- `GET /api/messages/threads/:threadId/messages`
- `POST /api/messages/threads/:threadId/messages`
- `POST /api/messages/threads/:threadId/read`
- `GET /api/messages/search?q=...`

## Notification Endpoints
- `GET /api/notifications?type=message|notification|all`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET /api/notifications/unread-count`

## Socket.IO
Client auth:
```js
io(SOCKET_URL, { auth: { token } })
```

Rooms:
- `user:<userId>`
- `thread:<threadId>`

Client -> Server:
- `thread:join`
- `thread:leave`
- `message:send`
- `thread:markRead`
- `request:create`
- `request:approve`
- `request:reject`
- `presence:ping`

Server -> Client:
- `thread:updated`
- `message:new`
- `notification:new`
- `thread:read`
- `user:presence`

## Flutter (Dart) Socket Note
Use `socket_io_client` and send JWT in `auth.token` to connect. I will add the module under your Flutter project path once you confirm the exact Flutter root to modify.
