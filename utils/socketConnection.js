import { Server } from "socket.io";
import Chat from "../models/ChatModel.js";

const socketConnection = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // your frontend origin
      credentials: true,
    },
  });
  io.on("connection", (socket) => {
    //handle events here

    //Join one to one chat
    socket.on("joinChat", ({ userId, _id }) => {
      const roomId = [userId, _id].sort().join("@");
      console.log(roomId);
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
  });
};

export default socketConnection;
