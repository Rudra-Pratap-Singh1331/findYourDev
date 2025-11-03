import { Server } from "socket.io";
import Chat from "../models/ChatModel.js";
import GroupChat from "../models/GroupChatModel.js";

const socketConnection = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "https://find-your-dev-frontend.vercel.app", // your frontend origin
      credentials: true,
    },
  });
  io.on("connection", (socket) => {
    //handle events here

    //Join one to one chat
    socket.on("joinChat", ({ userId, _id }) => {
      const roomId = [userId, _id].sort().join("@");

      socket.join(roomId);
    });

    //sending one to one message
    socket.on("sendMessage", async ({ userId, _id, text, time }) => {
      const newChat = new Chat({
        fromUserId: userId,
        toUserId: _id,
        text: text,
      });
      await newChat.save();

      const roomId = [userId, _id].sort().join("@");
      socket.to(roomId).emit("messageReceived", { text, time, userId });
    });

    //joining the message in app notification service
    socket.on("joinNotificationService", ({ userId }) => {
      socket.join(`RoomId-${userId}`);
    });

    //sending the notification when the user sends the message
    socket.on("notifyTheUser", ({ _id, userId }) => {
      socket.to(`RoomId-${_id}`).emit("incomingMessage", { userId });
    });

    socket.on("joinGroupChat", ({ chatId }) => {
      socket.join(`GroupRoomId-${chatId}`);
    });

    socket.on(
      "sendGroupMessage",
      async ({ roomId, text, time, fromUserId, senderName }) => {
        try {
          let groupChat = await GroupChat.findOne({ roomId });

          if (!groupChat) {
            groupChat = new GroupChat({
              roomId,
              messages: [],
            });
          }
          groupChat.messages.push({
            text,
            time,
            fromUserId,
            senderName,
          });

          await groupChat.save();
          socket.to(`GroupRoomId-${roomId}`).emit("newGroupMessageIncoming", {
            text,
            time,
            fromUserId,
            senderName,
          });
        } catch (err) {}
      }
    );
  });
};

export default socketConnection;
