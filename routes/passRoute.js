import express from "express";
import userAuthMiddleware from "../middlewares/userAuthMiddleware.js";
import { User } from "../models/user.js";
import bcrypt from "bcrypt";
const passRouter = express.Router();

passRouter.patch("/updatepassword", userAuthMiddleware, async (req, res) => {
  try {
    const { pass, userId } = req.body;
    let errors = []; // <-- changed from const to let

    const isValid =
      /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/.test(
        pass
      );

    if (!isValid) {
      errors = [
        "Password must have minimum 8 characters in length.",
        "At least one uppercase English letter.",
        "At least one lowercase English letter.",
        "At least one digit.",
        "At least one special character.",
      ];
    }

    if (errors.length !== 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    const hashPassword = await bcrypt.hash(pass, 10);
    const update = await User.findByIdAndUpdate(userId, {
      password: hashPassword,
    });
    if (!update) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Password Updated Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default passRouter;
