import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
// import { isValidElement } from "react"

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  const pipeline = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
  ];

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const comments = await Comment.aggregatePaginate(
    Comment.aggregate(pipeline),
    options
  );

  if (!comments) {
    throw new ApiError(400, "No Comments found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully."));
});

const getTweetComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a tweet
  const { tweetId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id.");
  }

  const pipeline = [
    {
      $match: {
        tweet: new mongoose.Types.ObjectId(tweetId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
  ];

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const comments = await Comment.aggregatePaginate(
    Comment.aggregate(pipeline),
    options
  );

  if (!comments) {
    throw new ApiError(400, "No Comments found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully."));
});

const addVideoComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { content } = req.body;

  const userId = req.user?._id;

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  const comment = await Comment.create({
    video: videoId,
    owner: userId,
    content,
  });

  if (!comment) {
    throw new ApiError(500, "There was a problem while creating a comment.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment created successfully."));
});

const addTweetComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a tweet
  const { content } = req.body;

  const userId = req.user?._id;

  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id.");
  }

  const comment = await Comment.create({
    tweet: tweetId,
    owner: userId,
    content,
  });

  if (!comment) {
    throw new ApiError(500, "There was a problem while creating a comment.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment created successfully."));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { content } = req.body;

  const { commentId } = req.params;

  const userId = req.user?._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(500, "Comment not found.");
  }

  if (comment.owner.toString() !== userId.toString()) {
    throw new ApiError(400, "User can only update their comment.");
  }

  comment.content = content;
  await comment.save();

  const updatedComment = comment;

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedComment, "Comment was updated successfully.")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  const userId = req.user?._id;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(500, "Comment not found.");
  }

  if (comment.owner.toString() !== userId.toString()) {
    throw new ApiError(400, "User can only delete their comment.");
  }

  const deletedComment = await Comment.deleteOne({ _id: commentId });

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedComment, "Comment was deleted successfully.")
    );
});

export {
  getVideoComments,
  getTweetComments,
  addVideoComment,
  addTweetComment,
  updateComment,
  deleteComment,
};
