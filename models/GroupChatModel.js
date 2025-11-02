import mongoose from "mongoose";

const GroupChatModel = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HackathonPost",
    required: true,
  },

  messages: [
    {
      text: {
        type: String,
      },
      time: {
        type: String,
      },
      fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      senderName: {
        type: String,
        required: true,
      },
    },
  ],
});

const GroupChat = mongoose.model("GroupChat", GroupChatModel);

export default GroupChat;
