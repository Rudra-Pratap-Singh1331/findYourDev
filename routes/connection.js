import express from "express";
import mongoose from "mongoose";
import userAuthMiddleware from "../middlewares/userAuthMiddleware.js";
import connectionAuthMiddleware from "../middlewares/connectionAuthMiddleware.js";
import { ConnectionRequestModel } from "../models/connectionRequest.js";

const app = express();

const connectionRouter = express.Router();

connectionRouter.post(
  "/request/send/:typeOfReq/:toUserId",
  userAuthMiddleware,
  connectionAuthMiddleware,
  async (req, res) => {
    try {
      const allowedReqStatus = ["Ignored", "Interested"];

      const isStatusValid = allowedReqStatus.includes(req.params.typeOfReq);

      if (!isStatusValid)
        return res.status(401).json({
          status: false,
          error: {
            message: "Not a Valid Status!",
          },
        });

      const toUserId = req.params.toUserId;

      const fromUserId = req.user._id;

      //now let check validate that the user can only send req one time to another user and that user then cant send the req to the user who has already send the request to that user HWERE WE WILL USE DB QUERY  and also make this check with the help of a mongoose midlleware "pre" in the Schema  let's go!!  CAUTION pre doestnot have acces to req,res parameter it has oncly access to next()

      const ReqExist = await ConnectionRequestModel.findOne({
        $or: [
          { fromUserId, toUserId },
          {
            fromUserId: toUserId,
            toUserId: fromUserId,
          },
        ],
      });
      if (ReqExist) throw new Error("Connection Request Already Exist!");

      const connectionRequestDocument = new ConnectionRequestModel({
        fromUserId,
        toUserId,
        status: req.params.typeOfReq,
      });

      const connectionReqSend = await connectionRequestDocument.save();

      res.status(200).json({
        success: true,
        connectionReqSend,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        error: {
          message: error.message,
        },
      });
    }
  }
);

connectionRouter.post(
  "/request/review/:typeOfReq/:objId",
  userAuthMiddleware,
  async (req, res) => {
    try {
      const allowedStatus = ["Accepted", "Rejected"];

      //validating the status /typeofreq
      if (!allowedStatus.includes(req.params.typeOfReq))
        return res.status(404).json({
          status: false,
          error: {
            message: "Invalid status type!",
          },
        });

      if (!mongoose.Types.ObjectId.isValid(req.params.objId))
        return res.status(404).json({
          status: false,
          error: {
            message: "Invalid mongo id!",
          },
        });

      //finding the connection req in DB

      const connectionReq = await ConnectionRequestModel.findOne({
        _id: req.params.objId,
        toUserId: req.user._id,
        status: "Interested",
      })
        .populate("fromUserId", ["fullName", "photoUrl"])
        .populate("toUserId", ["fullName", "photoUrl"]);

      if (!connectionReq)
        return res.status(404).json({
          status: false,
          error: {
            message: "Connection req not found!",
          },
        });

      connectionReq.status = req.params.typeOfReq;

      const result = await connectionReq.save();

      res.status(200).json({
        status: true,
        messsage: `Request ${req.params.typeOfReq}`,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        error: { message: "Error Occured!" + error.message },
      });
    }
  }
);

export default connectionRouter;
