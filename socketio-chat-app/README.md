# LoopChat — Full-stack Socket.IO Chat App

A room-based real-time chat app built with React + Vite, Node.js + Express, Socket.IO, and MongoDB.

## Features
- Join a room with a display name; multiple rooms work independently.
- Real-time messages with Socket.IO.
- MongoDB message persistence; the latest 50 messages load when joining a room.
- Online users, typing indicator, and join/leave notices.
- Responsive dark UI.

## Requirements
Node.js 18+ and a running MongoDB instance (local or Atlas).

## Setup
1. From the project root, install dependencies:
   ```bash
   npm install
   npm run install:all
   ```
2. Copy `server/.env.example` to `server/.env`. Configure `MONGODB_URI`, `PORT`, and `CLIENT_URL`.
   ```env
   PORT=5000
   CLIENT_URL=http://localhost:5173
   MONGODB_URI=mongodb://127.0.0.1:27017/socketio_chat
   ```
   For MongoDB Atlas, use a **Database User** account (not the Atlas website login). URL-encode special characters in the password.
3. Optionally copy `client/.env.example` to `client/.env`. Default API/socket URL is `http://localhost:5000`.
4. Start frontend and backend together:
   ```bash
   npm run dev
   ```

Frontend: http://localhost:5173  
Backend health check: http://localhost:5000/api/health

You can alternatively run `npm run dev` separately inside `server` and `client` folders.

## Test
Open the frontend in two browser tabs. Join the same room with two display names and send messages. Both tabs should receive messages immediately.

## Socket events
| Event | Direction | Purpose |
|---|---|---|
| `join_room` | client → server | Join room; history returned in acknowledgement |
| `send_message` | client → server | Validate, save, and broadcast a message |
| `receive_message` | server → clients | New message delivery |
| `room_users` | server → clients | Online room member list |
| `typing` | client → server | Send typing state |
| `user_typing` | server → clients | Typing indicator update |
| `system_message` | server → clients | Join/leave notice |

## Notes
This starter uses display names, not authenticated accounts. Names are not verified identities. Before public production use, add authentication, authorization, moderation/reporting, stricter rate limits, and HTTPS.
