import express from "express";
import userAuthMiddleware from "../middlewares/userAuthMiddleware.js";
import Chat from "../models/ChatModel.js";
import GroupChat from "../models/GroupChatModel.js";
const chatRouter = express.Router();

chatRouter.get("/getchats/:toUserId", userAuthMiddleware, async (req, res) => {
  const { toUserId } = req.params;
  const fromUserId = req.user._id;
  try {
    const chats = await Chat.find({
      $or: [
        { fromUserId: fromUserId, toUserId: toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    }).sort({ createdAt: 1 }); //oldest->newest

    res.status(200).json({
      success: true,
      data: chats,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: error,
    });
  }
});

chatRouter.get("/getgroupchats/:id", userAuthMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const groupChat = await GroupChat.find({ roomId: id }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      data: groupChat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error while fetching the chats!",
    });
  }
});

export default chatRouter;
