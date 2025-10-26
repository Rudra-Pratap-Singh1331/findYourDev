import crypto from "crypto";
const generateOTP = () => {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
};
export default generateOTP;
