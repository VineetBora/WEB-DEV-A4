import mongoose from "mongoose";
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, maxlength: 24 },
  room: { type: String, required: true, trim: true, maxlength: 40, index: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now }
});
messageSchema.index({ room: 1, createdAt: -1 });
export default mongoose.model("Message", messageSchema);
