import redis from "../utils/redisClient.js";
import bcrypt from "bcrypt";
const checkOTP = async (input_otp, toUserEmail) => {
  const hashed_otp = await redis.get(`otp:${toUserEmail}`);

  if (!hashed_otp) return false;

  const validity = await bcrypt.compare(input_otp, hashed_otp);

  if (validity) await redis.del(`otp:${toUserEmail}`);

  return validity;
};
export default checkOTP;
