import express from "express";
import userAuthMiddleware from "../middlewares/userAuthMiddleware.js";
import { Resend } from "resend";
import generateOTP from "../helper/generateOTP.js";
import hashOTP from "../helper/hashOTP.js";
import redis from "../utils/redisClient.js";
import checkOTP from "../helper/checkOTP.js";
const emailRouter = express.Router();

const resend = new Resend(process.env.RESEND_EMAIL_SERVICES_API_KEY);

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

    await redis.set(`otp:${toUserEmail}`, hashed_otp, { ex: 300 });

    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: toUserEmail,
      subject: "OTP for password Reset",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FindYourDev OTP</title>
</head>
<body style="margin:0; padding:0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1e1e2f; color: #d4d4d4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1e1e2f; padding: 50px 0;">
    <tr>
      <td align="center">
        <table width="400px" cellpadding="0" cellspacing="0" style="background-color:#252526; border-radius: 8px; padding: 30px; text-align:center; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
          <tr>
            <td>
              <h1 style="color:#569cd6; margin-bottom: 10px;">FindYourDev</h1>
              <p style="font-size:16px; color:#cccccc; margin-bottom: 20px;">Use the OTP below to reset your password. It expires in <strong>2 minutes</strong>.</p>
              <div style="font-size: 32px; font-weight: bold; background-color: #0e639c; color: #fff; padding: 15px 0; border-radius: 6px; letter-spacing: 4px; margin-bottom: 25px;">
                ${verification_otp}
              </div>
              <p style="font-size:14px; color:#888888; margin-bottom:0;">If you did not request this, please ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
    });
    console.log(result);
    res.status(200).json({ success: true, message: "OTP sent" });
  } catch (error) {
    res.status(500).json({ success: false, error: error });
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
