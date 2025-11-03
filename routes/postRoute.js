import express from "express";
import userAuthMiddleware from "../middlewares/userAuthMiddleware.js";
import { uploadToCloudinary } from "../Cloudinary/cloudinaryConfig.js";
import upload from "../config/multerConfig.js";
import Post from "../models/postModel.js";
import PostLike from "../models/PostLikeModel.js";
import Comment from "../models/CommentModel.js";
const app = express();
const postRouter = express.Router();

postRouter.post(
  "/create",
  userAuthMiddleware,
  upload.single("postPhotoUrl"),
  async (req, res) => {
    try {
      const { _id } = req.user;
      const { postContent, postVisibility } = req.body;
   
      let photoUrlCloudinary = "";
      //file upload to cloudinary and get the url
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, "posts");
        photoUrlCloudinary = result.secure_url;
      }
      //now add it to post schema
      const postData = new Post({
        userId: _id,
        postPhotoUrl: photoUrlCloudinary,
        postContent,
        postVisibility,
      });

      await postData.save();

      res.status(200).json({
        success: true,
        message: "Post Created!",
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Failed to create post" });
    }
  }
);

postRouter.get("/", userAuthMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({
      userId: { $ne: req.user._id },
    })
      .sort({ createdAt: -1 })
      .populate("userId", ["fullName", "photoUrl", "designation"])
      .lean(); //latest post first

    const postLikeStatus = await PostLike.find({
      userId: req.user._id,
    }).lean();

    const finalPostData = posts.map((post) => {
      return {
        ...post,
        likedStatus: postLikeStatus.some(
          (like) => like.postId.toString() === post._id.toString()
        ),
      };
    });

    res.status(200).json({
      success: true,
      data: finalPostData,
    });
  } catch (error) {
    res.status(500).json({ error });
  }
});

//like/unlike status
postRouter.post("/reactions", userAuthMiddleware, async (req, res) => {
  const postId = req.body._id;
  const userId = req.user._id;
  try {
    const postExists = await PostLike.findOne({ postId, userId });

    if (!postExists) {
      const newPostLike = new PostLike({
        postId,
        userId,
      });
      await newPostLike.save();
      await Post.findByIdAndUpdate(postId, {
        $inc: { likesCount: 1 },
      });

      res.status(200).json({ status: true, message: "You liked a post" });
    } else {
      await PostLike.findOneAndDelete({
        postId,
        userId,
      });
      await Post.findByIdAndUpdate(postId, {
        $inc: { likesCount: -1 },
      });
      res.status(200).json({ status: true, message: "You disliked a post" });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      error: error,
    });
  }
});

//fetch all the comments
postRouter.get("/:postId/comments", userAuthMiddleware, async (req, res) => {
  const { postId } = req.params;
  try {
    const commments = await Comment.find({ postId }).populate("userId", [
      "fullName",
      "photoUrl",
      "designation",
    ]);

    res.status(200).json({
      success: true,
      data: commments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: error,
    });
  }
});

postRouter.post("/addcomment", userAuthMiddleware, async (req, res) => {
  const { postId, commentData } = req.body;
  const userId = req.user._id;
  try {
    if (commentData === "") throw new Error("Inavlid Comment!");
    const newComment = new Comment({
      postId,
      userId,
      commentData,
    });
    await newComment.save();
    res.status(201).json({
      succes: true,
      message: "Comment Added!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: error.message,
    });
  }
});

export default postRouter;
