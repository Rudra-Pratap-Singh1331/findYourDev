import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/dbConfig.js";
import { User } from "./models/user.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/authRoute.js";
import userRouter from "./routes/userRoute.js";
import connectionRouter from "./routes/connection.js";
import cors from "cors";
import socketConnection from "./utils/socketConnection.js";
import http from "http";
import postRouter from "./routes/postRoute.js";
import chatRouter from "./routes/chatRoute.js";
import emailRouter from "./routes/emailServicesRoute.js";
import passRouter from "./routes/passRoute.js";
import hackathonRouter from "./routes/hackathonRoute.js";
const app = express();

dotenv.config();

app.use(
  cors({
    origin: "https://find-your-dev-frontend.vercel.app",
    credentials: true,
  })
);

app.use(express.json());

app.use(cookieParser());

app.get("/ping", (req, res) => {
  res.status(200).send("wake!");
});

app.use("/", authRouter);

app.use("/user", userRouter);

app.use("/connection", connectionRouter);

app.use("/posts", postRouter);

app.use("/chat", chatRouter);

app.use("/emailservice", emailRouter);

app.use("/passwordservice", passRouter);

app.use("/hackathons", hackathonRouter);

app.get("/users", async (req, res) => {
  const users = await User.find({});
  res.send(users);
});

const server = http.createServer(app);
socketConnection(server);
connectDB()
  .then(() => {
    server.listen(process.env.PORT, () => {
      //we are doing this because we are not using cjs but if we use cjs we can call the connectDB function insed the configDB and reuire the module above like require("./config/dbConfig") we have already studeied that NodeJS wrap each module into IIFE and will execute the moment the reuire will be readed the fucntion will get execute and db will get connected
    });
  })
  .catch((error) => {});
