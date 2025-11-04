import express from "express";
import userAuthMiddleware from "../middlewares/userAuthMiddleware.js";
import generateOTP from "../helper/generateOTP.js";
import hashOTP from "../helper/hashOTP.js";
import redis from "../utils/redisClient.js";
import checkOTP from "../helper/checkOTP.js";
import nodemailer from "nodemailer";

const emailRouter = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.BREVO_USER_EMAIL, // e.g. yourbrevoemail@gmail.com
    pass: process.env.BREVO_API_KEY, // From Brevo Dashboard → SMTP & API
  },
});

emailRouter.post("/send-otp", userAuthMiddleware, async (req, res) => {
  const { toUserEmail } = req.body;

  const existingOtp = await redis.get(`otp:${toUserEmail}`);
  if (existingOtp) {
    return res.status(400).json({
      message: "OTP already sent. Please wait before requesting again.",
    });
  }

  const verification_otp = generateOTP();

  try {
    const hashed_otp = await hashOTP(verification_otp);
    await redis.set(`otp:${toUserEmail}`, hashed_otp, { ex: 300 }); // expires in 5 min

    await transporter.sendMail({
      from: `"findYourDev's" <${process.env.BREVO_USER_EMAIL}>`,
      to: toUserEmail,
      subject: "OTP for Password Reset",
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>FindYourDev OTP</title></head>
      <body style="margin:0;padding:0;font-family:Segoe UI, sans-serif;background-color:#f8fafc;color:#0e0e0e;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr><td align="center">
            <table width="400" style="background-color:white;border-radius:10px;padding:25px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
              <tr><td>
                <h1 style="color:#0071dc;margin-bottom:10px;">findYourDev's</h1>
                <p style="font-size:15px;color:#444;">Use the OTP below to reset your password. It expires in <strong>5 minutes</strong>.</p>
                <div style="font-size:32px;font-weight:bold;background-color:#0071dc;color:white;padding:10px;border-radius:6px;letter-spacing:5px;margin:20px 0;">
                  ${verification_otp}
                </div>
                <p style="font-size:13px;color:#666;">If you did not request this, please ignore this email.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>`,
    });

    res.status(200).json({ success: true, message: "OTP sent successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to send OTP", error });
  }
});

emailRouter.post("/verify-otp", userAuthMiddleware, async (req, res) => {
  const { input_otp, toUserEmail } = req.body;

  try {
    const isOTPValid = await checkOTP(input_otp, toUserEmail);
    if (!isOTPValid) {
      return res.status(400).json({
        success: false,
        otpValid: false,
        message: "Invalid or expired OTP",
      });
    }

    res.status(200).json({
      success: true,
      otpValid: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while verifying OTP",
    });
  }
});

export default emailRouter;
