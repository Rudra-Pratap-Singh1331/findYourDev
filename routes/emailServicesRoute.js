import express from "express";
import userAuthMiddleware from "../middlewares/userAuthMiddleware.js";
import generateOTP from "../helper/generateOTP.js";
import hashOTP from "../helper/hashOTP.js";
import redis from "../utils/redisClient.js";
import checkOTP from "../helper/checkOTP.js";
import nodemailer from "nodemailer";

const emailRouter = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER_EMAIL,
    pass: process.env.GMAIL_API_KEY,
  },
});

emailRouter.post("/send-otp", userAuthMiddleware, async (req, res) => {
  const { toUserEmail } = req.body;
  console.log("📩 Incoming OTP request for:", toUserEmail);

  try {
    const existingOtp = await redis.get(`otp:${toUserEmail}`);
    if (existingOtp) {
      console.log("⚠️ OTP already exists for:", toUserEmail);
      return res.status(400).json({
        message: "OTP already sent. Please wait before requesting again.",
      });
    }

    const verification_otp = generateOTP();
    console.log("✅ Generated OTP:", verification_otp);

    const hashed_otp = await hashOTP(verification_otp);
    await redis.set(`otp:${toUserEmail}`, hashed_otp, { ex: 300 });
    console.log("🧠 OTP stored in Redis successfully for:", toUserEmail);

    await transporter.sendMail({
      from: `"FindYourDev" <${process.env.GMAIL_USER_EMAIL}>`,
      to: toUserEmail,
      subject: "OTP for Password Reset",
      html: `
      <html>
      <body style="font-family:sans-serif;">
        <h2>FindYourDev OTP</h2>
        <p>Your OTP (valid for 5 minutes):</p>
        <div style="font-size:24px;font-weight:bold;background:#0071dc;color:white;padding:8px;border-radius:6px;">
          ${verification_otp}
        </div>
      </body>
      </html>
      `,
    });

    console.log("📨 Email successfully sent to:", toUserEmail);
    res.status(200).json({ success: true, message: "OTP sent successfully!" });
  } catch (error) {
    console.error("❌ Error while sending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
});

emailRouter.post("/verify-otp", userAuthMiddleware, async (req, res) => {
  const { input_otp, toUserEmail } = req.body;
  console.log("🔍 OTP verification request from:", toUserEmail);
  console.log("🧾 Input OTP received:", input_otp);

  try {
    const isOTPValid = await checkOTP(input_otp, toUserEmail);
    console.log("✅ OTP verification result:", isOTPValid);

    if (!isOTPValid) {
      console.warn("❌ Invalid or expired OTP for:", toUserEmail);
      return res.status(400).json({
        success: false,
        otpValid: false,
        message: "Invalid or expired OTP",
      });
    }

    console.log("🎉 OTP verified successfully for:", toUserEmail);
    res.status(200).json({
      success: true,
      otpValid: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("🚨 Error during OTP verification:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while verifying OTP",
    });
  }
});

export default emailRouter;
