import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addUser } from "../store/userSlice";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const OtpPage = () => {
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState([]);
  const [otpSent, setOtpSent] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loggedInUser = useSelector((store) => store.user);

  const fetchLoggedInUser = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_URL}/user/profile`,
        {
          withCredentials: true,
        }
      );
      dispatch(addUser(data?.loggedInUser));
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Unauthorized!");
        navigate("/login");
      }
    }
  };

  const sendOtp = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/emailservice/send-otp`,
        {
          toUserEmail: loggedInUser?.email,
        },
        { withCredentials: true }
      );

      setOtpSent(true);
      toast.success("OTP sent to your email!");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Oops Something went wrong!"
      );
    }
  };

  const handleVerify = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/emailservice/verify-otp`,
        {
          input_otp: otp,
          toUserEmail: loggedInUser?.email,
        },
        { withCredentials: true }
      );

      if (res?.data?.otpValid === false) {
        toast.error(res?.data?.message);
        navigate("/profile");
      } else {
        toast.success(res?.data?.message);
        setStatus(true);
      }
      setOtp("");
    } catch (error) {
      setOtp("");
      toast.error(
        error?.response?.data?.message || "Oops! Something went wrong."
      );
    }
  };

  const handlePasswordSubmit = async () => {
    setFormError([]);

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      const { data } = await axios.patch(
        `${import.meta.env.VITE_API_URL}/passwordservice/updatepassword`,
        {
          pass: newPassword,
          userId: loggedInUser?._id,
        },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success(data.message);
        navigate("/");
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setFormError(error.response.data.errors);
      } else {
        setFormError(["Something went wrong. Please try again."]);
      }
    }
  };

  useEffect(() => {
    if (!loggedInUser) fetchLoggedInUser();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1e1e1e] text-[#e5e5e5] p-4">
      {!status ? (
        <>
          <h2 className="text-[#569cd6] text-2xl font-semibold mb-6">
            {otpSent
              ? `A verification mail has been sent to ${loggedInUser?.email}`
              : `Click below to send a verification code at ${loggedInUser?.email}`}
          </h2>

          {!otpSent ? (
            <button
              onClick={sendOtp}
              className="btn bg-[#0e639c] hover:bg-[#1177c0] text-white font-semibold px-6 py-2 rounded-md mb-4"
            >
              Send OTP
            </button>
          ) : (
            <>
              <div className="w-40 h-40 flex items-center justify-center mb-8">
                <div className="w-20 h-20 rounded-full bg-[#0e639c] flex items-center justify-center text-white text-3xl animate-bounce">
                  📧
                </div>
              </div>

              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="input input-bordered input-primary w-48 text-center text-lg mb-4 bg-[#252526] border-[#2d2d2d] text-[#e5e5e5] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#569cd6]"
              />

              <button
                onClick={handleVerify}
                className="btn bg-[#0e639c] hover:bg-[#1177c0] text-white font-semibold px-6 py-2 rounded-md"
              >
                Verify OTP
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <h2 className="text-[#569cd6] text-2xl font-semibold mb-6">
            Set Your New Password
          </h2>

          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input input-bordered input-primary w-64 text-center text-lg mb-4 bg-[#252526] border-[#2d2d2d] text-[#e5e5e5] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#569cd6]"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input input-bordered input-primary w-64 text-center text-lg mb-4 bg-[#252526] border-[#2d2d2d] text-[#e5e5e5] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#569cd6]"
          />

          {formError.length > 0 && (
            <div className="bg-[#3c1c1c] text-red-400 p-3 rounded-md w-72 mb-4">
              {formError.map((err, index) => (
                <p key={index} className="text-sm">
                  • {err}
                </p>
              ))}
            </div>
          )}

          <button
            onClick={handlePasswordSubmit}
            className="btn bg-[#0e639c] hover:bg-[#1177c0] text-white font-semibold px-6 py-2 rounded-md"
          >
            Update Password
          </button>
        </>
      )}
    </div>
  );
};

export default OtpPage;
