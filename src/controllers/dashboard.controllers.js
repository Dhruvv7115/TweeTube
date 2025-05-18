import mongoose from "mongoose"
import { Video } from "../models/video.models.js"
import { Subscription } from "../models/subscription.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const userId = req.user?._id;

  const userDetails = await User.findOne({ _id: userId }).select("fullname avatar username coverImage");

  const subscribersCount = await Subscription.countDocuments({
    channel: userId,
  });
  // console.log(subscribersCount);

  const videosCount = await Video.countDocuments({
    owner: userId,
  });
  // console.log(videosCount)

  const viewStatistics = await Video.aggregate([
    {
      $match: {
        owner: userId
      }
    },
    {
      $group: {
        _id: null,
        totalViews: {
          $sum: 1
        }
      }
    },
    {
      $addFields: {
        avgViews: {
          $avg: 1
        },
      }
    },
    {
      $project: {
        avgViews: 1,
        totalViews: 1,
        _id: 0
      }
    }
  ]);

  const avgLikes = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      }
    },
    {
      $addFields: {
        likeCount: {
          $size: "$likes"
        }
      }
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalLikes: { $sum: "$likeCount" },
        avgLikesPerVideo: { $avg:"$likeCount" }
      }
    },
    {
      $project: {
        _id: 0,
        totalVideos: 1,
        totalLikes: 1,
        avgLikesPerVideo: 1
      }
    }
  ]);

  const channelStats = {
    ...avgLikes[0],
    ...viewStatistics[0],
    ...{
      subscribersCount,
      videosCount
    },
    ...userDetails._doc // got to use ._doc to get the actual data(not the mongoose object) now i know the real usecase of ._doc 
  }
  
  return res
    .status(200)
    .json(new ApiResponse(
      200, 
      channelStats,
      "Channel Stats Fetched."
    ))
})

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const userId = req.user?._id;
  const videos = await Video.find({ owner: userId })
    .select("title thumbnail duration views createdAt updatedAt")
    .sort({ createdAt: -1 });

  if (!videos) {
    throw new ApiError(404, "No videos found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(
      200, 
      videos,
      "Videos fetched successfully."
    ))
})

export {
  getChannelStats, 
  getChannelVideos
}