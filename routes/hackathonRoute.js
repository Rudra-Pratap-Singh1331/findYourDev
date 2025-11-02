import express from "express";
import userAuthMiddleware from "../middlewares/userAuthMiddleware.js";
import HackathonPost from "../models/HackathonPostModel.js";
import HackathonRequest from "../models/HackathonRequestModel.js";
import upload from "../config/multerConfig.js";
import { uploadToCloudinary } from "../Cloudinary/cloudinaryConfig.js";
const hackathonRouter = express.Router();

hackathonRouter.get("/", userAuthMiddleware, async (req, res) => {
  try {
    const hackathonList = await HackathonPost.find({
      status: "open",
    })
      .populate("ownerId", ["photoUrl", "designation", "fullName"])
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      hackathonList,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error,
    });
  }
});

hackathonRouter.post(
  "/createhackathon",
  userAuthMiddleware,
  upload.single("hackathonPostImage"),
  async (req, res) => {
    const ownerId = req.user._id;
    const {
      hackathonTitle,
      hackathonType,
      hackathonDescription,
      hackathonPostImage,
      hackathonDeadline,
      teamRequired,
    } = req.body;

    try {
      let photoUrlCloudinary = "";
      if (req.file) {
        const result = await uploadToCloudinary(
          req.file.buffer,
          "hackathonImages"
        );
        photoUrlCloudinary = result.secure_url;
      }
      const hackathonInstance = new HackathonPost({
        ownerId,
        hackathonTitle,
        hackathonType,
        hackathonDescription,
        hackathonPostImage: photoUrlCloudinary || "",
        hackathonDeadline,
        teamRequired,
      });

      await hackathonInstance.save();

      const newAcceptedReq = new HackathonRequest({
        hackathonId: hackathonInstance._id,
        userId: req.user._id,
        status: "Accepted",
      });

      await newAcceptedReq.save();
      res.status(200).json({
        success: true,
        message: "Created Successfully!",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error Occured please try again!",
      });
    }
  }
);

hackathonRouter.post("/makerequest", userAuthMiddleware, async (req, res) => {
  const userId = req.user._id;
  const { hackathonId } = req.body; //hackathonId === hackathonpostId

  try {
    const isExist = await HackathonRequest.findOne({
      $and: [{ hackathonId, userId }],
    });

    if (isExist)
      return res.status(409).json({
        success: false,
        message: "You have already applied!",
      });
    const hackathonReq = new HackathonRequest({
      hackathonId,
      userId,
    });

    await hackathonReq.save();
    res.status(200).json({
      success: true,
      message: "Applied!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Please try again!",
    });
  }
});

//fetching myhackthons

hackathonRouter.get("/myhackathon", userAuthMiddleware, async (req, res) => {
  const ownerId = req.user._id;

  try {
    const myHackathon = await HackathonPost.find({
      ownerId: ownerId,
      status: "open",
    }).populate("ownerId", ["fullName", "photoUrl", "designation"]);

    res.status(200).json({
      success: true,
      data: myHackathon,
      message: "hello",
    });
  } catch (error) {
    res.status(500).json({
      suceess: false,
      message: "Oops an Error Occured!",
    });
  }
});

//fetching the list of users who have reqeusted to join the hackathon (status===pending);

hackathonRouter.get(
  "/incomingrequest/:hackathonId",
  userAuthMiddleware,
  async (req, res) => {
    const { hackathonId } = req.params; //hackathonId === hackathonpostId
    try {
      const incomingRequest = await HackathonRequest.find({
        $and: [{ hackathonId }, { status: "Pending" }],
      })
        .populate("userId", [
          "fullName",
          "photoUrl",
          "designation",
          "techStack",
        ])
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: incomingRequest,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Oops Error occured!" });
    }
  }
);

//accept/reject api
hackathonRouter.patch(
  "/reviewrequest/:typeofreq",
  userAuthMiddleware,
  async (req, res) => {
    const { typeofreq } = req.params;

    const { _id } = req.body; //har request ki document id ha

    if (!["Accepted", "Rejected"].includes(typeofreq)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request type",
      });
    }

    try {
      const updatedDocs = await HackathonRequest.findByIdAndUpdate(
        _id,
        {
          status: typeofreq,
        },
        { new: true }
      );

      const { hackathonId } = updatedDocs;

      if (typeofreq === "Accepted") {
        await HackathonPost.findByIdAndUpdate(hackathonId, {
          $inc: { currentTeamMember: 1 },
        });
      }

      res.status(200).json({
        success: true,
        message: typeofreq,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Oops an error occured!",
      });
    }
  }
);

hackathonRouter.get(
  "/appliedhackathons",
  userAuthMiddleware,
  async (req, res) => {
    try {
      const result = await HackathonRequest.find({
        userId: req.user._id,
        status: "Pending",
      })
        .populate({
          path: "hackathonId",
          select:
            "ownerId hackathonTitle hackathonType hackathonDescription hackathonPostImage hackathonDeadline  teamRequired currentTeamMember  status",
          populate: {
            path: "ownerId",
            select: "photoUrl designation fullName",
          },
        })
        .sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Something went wrong",
      });
    }
  }
);

hackathonRouter.delete("/cancelrequest/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedRequest = await HackathonRequest.findByIdAndDelete(id);

    if (!deletedRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found or already deleted",
      });
    }

    res.status(200).json({
      success: true,
      message: "Hackathon request cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to cancel request",
    });
  }
});

hackathonRouter.patch(
  "/closehackathon",
  userAuthMiddleware,
  async (req, res) => {
    const { _id } = req.body;

    try {
      const result = await HackathonPost.findByIdAndUpdate(_id, {
        status: "close",
      });

      res.status(200).json({
        success: true,
        message: "Apllication Closed",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Something went wrong!",
      });
    }
  }
);

hackathonRouter.get(
  "/joinedhackathons",
  userAuthMiddleware,
  async (req, res) => {
    const id = req.user._id;

    try {
      const result = await HackathonRequest.find({
        userId: id,
        status: "Accepted",
      }).populate({
        path: "hackathonId",
        select:
          "ownerId hackathonTitle hackathonPostImage teamRequired currentTeamMember",
        populate: {
          path: "ownerId",
          select: "fullName",
        },
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Something went wrong!",
      });
    }
  }
);

hackathonRouter.get("/chatgroup/:id", userAuthMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await HackathonPost.find({
      _id: id,
    }).select("hackathonPostImage hackathonTitle");
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong!",
    });
  }
});
export default hackathonRouter;
