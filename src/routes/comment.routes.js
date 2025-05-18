import { Router } from "express";
import {
  addVideoComment,
  addTweetComment,
  deleteComment,
  getVideoComments,
  getTweetComments,
  updateComment,
} from "../controllers/comment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/v/:videoId").get(getVideoComments).post(addVideoComment);

router.route("/t/:tweetId").get(getTweetComments).post(addTweetComment);

router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;
