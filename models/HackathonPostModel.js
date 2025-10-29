import mongoose from "mongoose";

const HackathonPostModel = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    hackathonTitle: {
      type: String,
      required: true,
    },

    hackathonType: {
      type: String,
      required: true,
    },
    hackathonDescription: {
      type: String,
      required: true,
    },

    hackathonPostImage: {
      type: String,
    },

    hackathonDeadline: {
      type: Date,
      required: true,
    },

    teamRequired: {
      type: Number,
      required: true,
    },

    currentTeamMember: {
      type: Number,
      default: 1,
    },

    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

const HackathonPost = mongoose.model("HackathonPost", HackathonPostModel);

export default HackathonPost;
