import express from "express";
import { User } from "../models/user.js";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const app = express();

const authRouter = express.Router();

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select(
      "fullName techStack designation profileUpdateStatus photoUrl mobileNumber age email"
    );
    if (!user)
      return res
        .status(400)
        .json({ status: false, message: "Invalid Credentials" });
    const value = await bcrypt.compare(password, user.password);
    if (value) {
      //jwt

      const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY);

      res.cookie("token", authToken, {
        httpOnly: true,
        secure: true, // must be true for https
        sameSite: "none", // crucial for cross-site cookies
      });
      res.json(user);
    } else {
      res.status(400).json({ status: false, message: "password invalid" });
    }
  } catch (error) {
    res.send(404).json({ error });
  }
});

authRouter.post("/signup", async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    // error ko array nahi, ek object banao
    const errors = {};
    // Password validation
    const result =
      /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/.test(
        password
      );
    if (!result) {
      errors.password = [
        "Has minimum 8 characters in length.",
        "At least one uppercase English letter.",
        "At least one lowercase English letter.",
        "At least one digit.",
        "At least one special character.",
      ];
    }
    // Email validation
    if (!validator.isEmail(email)) {
      errors.email = `${email} is not a valid email.`;
    }
    // Full Name validation
    if (!fullName || fullName.length < 2) {
      errors.fullName = "Full name must be at least 2 characters long.";
    }
    // Agar errors object khali nahi hai
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    } else {
      const hashPassword = await bcrypt.hash(password, 10);
      const user = new User({
        fullName,
        email,
        password: hashPassword,
      });
      await user.save();
      res.status(200).send("User Created Successfully!");
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).send("This email is already registered.");
    }
    if (error.name == "ValidationError") {
      return res.status(500).json(error);
    }

    res.status(500).json({ er: error.message });
  }
});

authRouter.post("/logout", (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
    secure: true, // must be true for https
    sameSite: "none", // crucial for cross-site cookies
  });
  res.json({
    success: true,
    message: "Logged Out Successfully!",
  });
});

export default authRouter;
