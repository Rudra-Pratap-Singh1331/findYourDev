import bcrypt from "bcrypt";

const hashOTP = async(verification_otp) => {
  const saltRounds = 10;

  return await bcrypt.hash(verification_otp,saltRounds)

};
export default hashOTP;
