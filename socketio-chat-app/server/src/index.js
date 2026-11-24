import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from "socket.io";
import Message from "./models/Message.js";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "socketio-chat-server" }));

const io = new Server(server, { cors: { origin: CLIENT_URL, methods: ["GET", "POST"] } });
const onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("join_room", async ({ username, room } = {}, callback) => {
    const cleanName = String(username || "").trim().slice(0, 24);
    const cleanRoom = String(room || "").trim().toLowerCase().slice(0, 40);
    if (!cleanName || !cleanRoom) return callback?.({ ok: false, error: "Username and room are required." });
    for (const joinedRoom of socket.rooms) if (joinedRoom !== socket.id) socket.leave(joinedRoom);
    const previous = onlineUsers.get(socket.id);
    if (previous) io.to(previous.room).emit("room_users", getRoomUsers(previous.room));
    socket.data.username = cleanName;
    socket.data.room = cleanRoom;
    socket.join(cleanRoom);
    onlineUsers.set(socket.id, { username: cleanName, room: cleanRoom });
    try {
      const history = await Message.find({ room: cleanRoom }).sort({ createdAt: -1 }).limit(50).lean();
      callback?.({ ok: true, history: history.reverse() });
    } catch (error) {
      console.error("Could not load message history:", error.message);
      callback?.({ ok: false, error: "Could not load chat history." });
    }
    io.to(cleanRoom).emit("room_users", getRoomUsers(cleanRoom));
    socket.to(cleanRoom).emit("system_message", { text: `${cleanName} joined the room.`, createdAt: new Date().toISOString() });
  });

  socket.on("send_message", async ({ text } = {}, callback) => {
    const { username, room } = socket.data;
    const cleanText = String(text || "").trim().slice(0, 2000);
    if (!username || !room) return callback?.({ ok: false, error: "Join a room before sending messages." });
    if (!cleanText) return callback?.({ ok: false, error: "Message cannot be empty." });
    try {
      const saved = await Message.create({ username, room, text: cleanText });
      const message = { _id: saved._id.toString(), username: saved.username, room: saved.room, text: saved.text, createdAt: saved.createdAt.toISOString() };
      io.to(room).emit("receive_message", message);
      callback?.({ ok: true });
    } catch (error) {
      console.error("Could not save message:", error.message);
      callback?.({ ok: false, error: "Message could not be saved. Check database connection." });
    }
  });

  socket.on("typing", (isTyping) => {
    const { username, room } = socket.data;
    if (username && room) socket.to(room).emit("user_typing", { username, isTyping: Boolean(isTyping) });
  });
  socket.on("disconnect", () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      io.to(user.room).emit("room_users", getRoomUsers(user.room));
      socket.to(user.room).emit("system_message", { text: `${user.username} left the room.`, createdAt: new Date().toISOString() });
    }
  });
});
function getRoomUsers(room) {
  return [...onlineUsers.values()].filter((user) => user.room === room).map((user) => user.username);
}
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/socketio_chat");
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}
start();
