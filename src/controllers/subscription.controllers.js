import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params
  // TODO: toggle subscription
  const subscriberId = req.user._id
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel ID")
  }

  const channel = await User.findById(channelId)
  if (!channel) {
    throw new ApiError(404, "Channel not found")
  }
  const subscriber = await User.findById(subscriberId)
  if (!subscriber) {
    throw new ApiError(404, "Subscriber not found")
  }
  const subscription = await Subscription.findOne({ subscriber: subscriberId, channel: channelId })
  if (subscription) {
    // Unsubscribe
    await Subscription.deleteOne({ subscriber: subscriberId, channel: channelId })
    return res
      .status(200)
      .json(new ApiResponse(
        200, 
        {},
        "Unsubscribed successfully"
      ))
  } else {
    // Subscribe
    await Subscription.create({ subscriber: subscriberId, channel: channelId })
    return res
      .status(201)
      .json(new ApiResponse(
        201, 
        {},
        "Subscribed successfully"
      ))
  }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  
  if(!isValidObjectId(channelId)){
    throw new ApiError(400, "Invalid Channel Id.")
  }

  if(channelId.toString() !== req.user._id.toString()){
    throw new ApiError(401, "User is unauthorized to view the subscriber of another user")
  }

  const subscribers = await Subscription.aggregate([
    {
      $match:{
        channel: new mongoose.Types.ObjectId(channelId)
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
        pipeline: [
          {
            $project: {
              fullname: 1, 
              email: 1, 
              username: 1, 
              avatar: 1, 
            }
          }
        ]
      }
    },
    {
      $addFields: {
        subscriberDetails: {
          $arrayElemAt: ["$subscriberDetails", 0]
        },  
      }
    },
    {
      $project: {
        subscriber: 0
      }
    }
  ]);
  
  // this is the shorter way to do the same thing but i copied this from github while i did the above one on my own.
  // .populate() is used to populate the subscriber field with user details
  // const subscribers = await Subscription.find({
  //   channel: channelId,
  // }).populate("subscriber", "_id username email avatar fullname");
  

  if(!subscribers){
    throw new ApiError(404, "No subscribers found")
  }

  return res
    .status(200)
    .json(new ApiResponse(
      200, 
      subscribers,
      "Subscribers fetched successfully"
    ))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if(!isValidObjectId(subscriberId)){
    throw new ApiError(400, "Invalid user id");
  }

  if(subscriberId.toString() !== req.user._id.toString()){
    throw new ApiError(401, )
  }

  const channelsSubscribed = await Subscription.find({
    subscriber: subscriberId,
  }).populate("channel", "_id username email avatar username");

  if(!channelsSubscribed){
    throw new ApiError(404, "No Subscriptions found")
  }

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      channelsSubscribed,
      "Subscriptions fetched successfully"
    ))

})

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels
}