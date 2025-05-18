/*
  subscriber ObjectId users
  channel ObjectId users
  createdAt Date
  updatedAt Date
*/

import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, //one who is subscribing (subscriber)
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, //the channel to which the subscriber above is subscribing
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
