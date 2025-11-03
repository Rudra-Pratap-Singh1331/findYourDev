import express from "express";
import { User } from "../models/user.js";
import validator from "validator";
import userAuthMiddleware from "../middlewares/userAuthMiddleware.js";
import { ConnectionRequestModel } from "../models/connectionRequest.js";
import upload from "../config/multerConfig.js";
import { uploadToCloudinary } from "../Cloudinary/cloudinaryConfig.js";
const app = express();

const userRouter = express.Router();

userRouter.get("/profile", userAuthMiddleware, async (req, res) => {
  try {
    res.status(200).json({
      loggedInUser: req.user,
    });
  } catch (error) {
    res.json(error);
  }
});

userRouter.delete("/delete", userAuthMiddleware, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const deleted = await User.findByIdAndDelete(loggedInUser._id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.cookie("token", null, {
      expires: new Date(Date.now()),
    });

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

userRouter.patch(
  "/profile/update",
  userAuthMiddleware,
  upload.single("photoUrl"),
  async (req, res) => {
    const {
      fullName,
      mobileNumber,
      age,
      gender,
      techStack,
      designation,
      photoUrl,
    } = req.body;
    try {
      const error = {};
      //ye neche wala code hamre attacker se safe rakhne ke liye ha

      if (
        Object.keys(req.body).includes("fullName") &&
        (!fullName || fullName.length < 2)
      ) {
        error.fullName = "Full name must be at least 2 characters long.";
      }

      if (
        Object.keys(req.body).includes("mobileNumber") &&
        !validator.isMobilePhone(req.body.mobileNumber)
      ) {
        error.mobileNumber = "Mobile number is invalid.";
      }
      let photoUrlCloudinary = "";
      if (req.file) {
        const result = await uploadToCloudinary(
          req.file.buffer,
          "userProfilephoto"
        );
        photoUrlCloudinary = result.secure_url;
      }
      //only push that data which is valid not undeifned
      const updateData = {};
      if (fullName) updateData.fullName = fullName;
      if (mobileNumber) updateData.mobileNumber = mobileNumber;
      if (age) updateData.age = age;
      if (gender) updateData.gender = gender;
      if (techStack) updateData.techStack = techStack;
      if (designation) updateData.designation = designation;
      if (photoUrlCloudinary) updateData.photoUrl = photoUrlCloudinary;

      updateData.profileUpdateStatus = true;
      if (Object.keys(error).length > 0) {
        return res.status(400).json({ errors: error });
      } else {
        const updated = await User.findByIdAndUpdate(
          req.user.id,
          { ...updateData },
          {
            new: true,
            runValidators: true,
          }
        ).select("fullName techStack designation profileUpdateStatus photoUrl"); //new true means return the updated doc

        res.status(200).json({ message: "updated", value: updated });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
);

userRouter.get("/connections", userAuthMiddleware, async (req, res) => {
  try {
    const loggedInUserConnections = await ConnectionRequestModel.find({
      //if no user empty array []  is returned
      $or: [
        {
          toUserId: req.user._id,
          status: { $nin: ["Accepted", "Rejected", "Ignored"] },
        },
        {
          fromUserId: req.user._id,
          status: { $nin: ["Accepted", "Rejected", "Ignored"] },
        },
      ],
    })
      .populate("fromUserId", ["fullName", "photoUrl"])
      .populate("toUserId", ["fullName", "photoUrl"]);

    // const data = loggedInUserConnections.map((users) => {
    //   if (users.fromUserId._id.toString() === req.user._id.toString())
    //     return users.toUserId;
    //   return users.fromUserId;
    // });

    res.status(200).json({
      status: true,
      data: loggedInUserConnections,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: {
        message: error.message,
      },
    });
  }
});

userRouter.get(
  "/connections/requests",
  userAuthMiddleware,
  async (req, res) => {
    try {
      const requestsPending = await ConnectionRequestModel.find({
        toUserId: req.user._id,
        status: "Interested",
      }).populate("fromUserId", ["fullName", "age", "gender", "techStack"]);

      const data = requestsPending.map((users) => users.fromUserId);

      return res.status(200).json({
        status: true,
        data: data,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "error:" + error.message,
      });
    }
  }
);

userRouter.get("/feed", userAuthMiddleware, async (req, res) => {
  //finding all the connection that we dont want to show in the user feed

  const page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // sanitizing limit

  limit = limit > 20 ? 10 : limit;

  const existingConnectionUser = await ConnectionRequestModel.find({
    $or: [
      { toUserId: req.user._id },
      {
        fromUserId: req.user._id,
      },
    ],
  }).select("fromUserId toUserId");

  //now here we have to make very if condition for getting unique id because in some document we may the sender or in some we may the reciever

  const userNotToBeShowOnTheFeed = new Set();

  //pushing th eexistingConnectionUser in the set

  existingConnectionUser.forEach((users) => {
    userNotToBeShowOnTheFeed.add(users.fromUserId);
    userNotToBeShowOnTheFeed.add(users.toUserId);
  });

  //finding the rest of the remaining users

  const UsersToBeShowOnTheFeed = await User.find({
    $and: [
      {
        _id: { $nin: Array.from(userNotToBeShowOnTheFeed) }, //conver the Set into Array
      },
      {
        _id: { $ne: req.user._id }, //ye isliye jisse hamari khud ki id n ajaye thats why
      },
    ],
  })
    .select("fullName age techStack gender designation photoUrl")
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: true,
    UsersToBeShowOnTheFeed,
  });
});

userRouter.get("/friends", userAuthMiddleware, async (req, res) => {
  try {
    const friends = await ConnectionRequestModel.find({
      $or: [
        {
          fromUserId: req.user._id,
        },
        {
          toUserId: req.user._id,
        },
      ],
      status: "Accepted",
    });

    //FETCHING ONLY THE PERSON WHO HAVE SEND ME OR I HAVE SEND AND THE STATUS IS ACCEPTED
    const friendsListFinal = friends.map((f) => {
      return f.fromUserId.toString() === req.user._id.toString()
        ? f.toUserId
        : f.fromUserId;
    });

    const friendsConnection = await User.find({
      _id: { $in: friendsListFinal }, //syntax : $in:[]  here the friendsListFinal is a array and mongo db find all the user having id present in array one by one so we will get a array of user to whom we are freinds
    }).select("fullName photoUrl");

    res.status(200).json({
      success: true,
      friends: friendsConnection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error,
    });
  }
});

export default userRouter;
