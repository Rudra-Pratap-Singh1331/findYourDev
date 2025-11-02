import mongoose from "mongoose";

const hackathonRequestSchema = new mongoose.Schema(
  {
    hackathonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HackathonPost",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const HackathonRequest = mongoose.model(
  "HackathonRequest",
  hackathonRequestSchema
);
export default HackathonRequest;
