import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { updateAvatar } from "./user.controllers.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(500, "Content is required");
  }

  const userId = req.user._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(500, "User Id not valid");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(500, "User Not Found");
  }

  const tweet = await Tweet.create({
    content,
    owner: userId,
  });

  if (!tweet) {
    throw new ApiError(500, "Error creating a tweet.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "User Id is not Valid.");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
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
              username: 1,
              email: 1,
              fullname: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        owner: { $arrayElemAt: ["$owner", 0] },
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "desc" ? -1 : 1,
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: limit,
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "tweets fetched successfully."));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { tweetId } = req.params;

  if (!content) {
    throw new ApiError(400, "Content must be provided.");
  }
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Incorrect tweet id.");
  }

  const tweet = await Tweet.findById(tweetId);
  //check if the tweet to be updated is from the user that is logged in

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      400,
      "User is unauthorized to update the tweet of another user."
    );
  }
  //changing the content of the tweet
  tweet.content = content;

  await tweet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Updated tweet successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Incorrect tweet id.");
  }

  const tweet = await Tweet.findById(tweetId);

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      400,
      "User is unauthorized to delete tweets of another user."
    );
  }

  const deletedTweet = await Tweet.deleteOne({ _id: tweetId });

  return res
    .status(200)
    .json(new ApiResponse(200, deletedTweet, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
