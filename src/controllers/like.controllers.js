import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  const like = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  if (like) {
    const deletedLike = await Like.deleteOne({ video: videoId });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          deletedLike,
          "Like deleted from the video successfully."
        )
      );
  } else {
    const newLike = await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Liked the video successfully."));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id.");
  }

  const like = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (like) {
    const deletedLike = await Like.deleteOne({ comment: commentId });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          deletedLike,
          "Like deleted from the comment successfully."
        )
      );
  } else {
    const newLike = await Like.create({
      comment: commentId,
      likedBy: req.user?._id,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Liked the comment successfully."));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id.");
  }

  const like = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  if (like) {
    const deletedLike = await Like.deleteOne({ tweet: tweetId });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          deletedLike,
          "Like deleted from the tweet successfully."
        )
      );
  } else {
    const newLike = await Like.create({
      tweet: tweetId,
      likedBy: req.user?._id,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Liked the tweet successfully."));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: {
          $exists: true,
        },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $project: {
              thumbnail: 1,
              views: 1,
              owner: 1,
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
                    avatar: 1,
                    fullname: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $arrayElemAt: ["$owner", 0],
              },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: {
          $arrayElemAt: ["$video", 0],
        },
      },
    },
  ]);

  //below one is copied from github and is short and precise got to know about $exists operator.

  // const likedVideos = await Like.find({
  //   likedBy: userId,
  //   video: { $exists: true },
  // }).populate("video", "title views thumbnail");

  if (!likedVideos) {
    throw new ApiError(400, "No liked videos found.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully.")
    );
});

const getLikedTweets = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const likedTweets = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        tweet: {
          $exists: true,
        },
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "tweet",
        foreignField: "_id",
        as: "tweet",
        pipeline: [
          {
            $project: {
              content: 1,
              owner: 1,
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
          {
            $addFields: {
              owner: {
                $arrayElemAt: ["$owner", 0],
              },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        tweet: {
          $arrayElemAt: ["$tweet", 0],
        },
      },
    },
  ]);

  if (!likedTweets) {
    throw new ApiError(400, "No Liked Tweets.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedTweets, "Liked tweets fetched successfully.")
    );
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
  getLikedTweets,
};
