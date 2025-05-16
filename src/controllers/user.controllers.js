import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    // Simulate token generation logic
    const user = await User.findById(userId)
    // small check for user existence
    if(!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
  
    // Save refresh token in the database
    user.refreshToken = refreshToken

    await user.save({validateBeforeSave: false})

    return { accessToken, refreshToken }


  } catch (error) {
    throw new ApiError(500, "Error generating tokens");
  }
}

const registerUser = asyncHandler(async (req, res) => {
  // Simulate user registration logic

  const { username, email, fullname, password } = req.body;

  if([ username, email, fullname, password ].some(field => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  // Simulate checking for existing user
  const existingUser = await User.findOne({
    $or: [{ username },{ email }]
  }); 

  if(existingUser) {
    throw new ApiError(400, "User with this username or email already exists");
  }
  // console.warn(req.files);

  // extracting avatar and coverImage from the request
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverLocalPath = req.files?.coverImage[0]?.path;

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar is required");
  }

  // const avatar = await uploadOnCloudinary(avatarLocalPath);
  // let coverImage;
  // if(coverLocalPath){
  //   coverImage = await uploadOnCloudinary(coverLocalPath);
  // }
  let avatar;
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    // console.log("Uploaded avatar: ", avatar);
  } catch (error) {
    console.error("Error uploading avatar to Cloudinary:", error);
    throw new ApiError(500, "Error uploading avatar");
  }
  let coverImage;
  try {
    coverImage = await uploadOnCloudinary(coverLocalPath);
    // console.log("Uploaded coverImage: ", coverImage);
  } catch (error) {
    console.error("Error uploading coverImage to Cloudinary:", error);
    throw new ApiError(500, "Error uploading coverImage");
  }

  // Simulate saving user to the database
  try {
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      fullname,
      password,
      avatar: avatar?.url,
      coverImage: coverImage?.url || "",
    });
  
    const createdUser = await User.findById(user._id).select("-password -refreshToken"); // Exclude password and refreshToken from the response
  
    if(!createdUser) {
      throw new ApiError(500, "Something went wrong while creating the user");
    }
  
    return res.status(201).json(
      new ApiResponse(201, "User created successfully", createdUser)
    );

  } catch (error) {
    console.error("Error creating user:", error);
    if(avatar){
      await deleteFromCloudinary(avatar.public_id, "image");
    }
    if(coverImage){
      await deleteFromCloudinary(coverImage.public_id, "image");
    }
    throw new ApiError(500, "Something went wrong while creating the user and images were deleted");
    
  }
});

const loginUser = asyncHandler(async (req, res) => {  
  // getting the user credentials from the request body
  const { email, username, password } = req.body;

  // checking if the username or email is provided
  if(!email && !username) {
    throw new ApiError(400, "username or email is required");
  }
  // checking if the user exists in the database
  const user = await User.findOne({
    $or: [{ username },{ email }]
  });

  if(!user) {
    throw new ApiError(400, "User not found");
  }

  // checking if the password is correct
  const isPasswordValid = await user.comparePassword(password);
  if(!isPasswordValid) {
    throw new ApiError(400, "Invalid password");
  }

  // generating access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken"); // Exclude password and refreshToken from the response

  if(!loggedInUser) {
    throw new ApiError(500, "Something went wrong while logging in");
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  }

  // sending the response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(
      200, 
      { user: loggedInUser, accessToken, refreshToken },
      "User logged in successfully"
    )); 

});

const refreshAccessToken = asyncHandler(async (req, res) => {
  
  // getting the refresh token from the request
  const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  // req.cookies would work fine for websites but in apps refresh token is sent through the req.body

  if(!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }
  try {
    // checking if the refresh token is valid
    const decodedToken = jwt.verify(
      incomingRefreshToken, 
      process.env.REFRESH_TOKEN_SECRET
    );
  
    // checking if the user exists in the database
    const user = await User.findById(decodedToken?._id);
    if(!user) {
      throw new ApiError(404, "Invalid refresh token");
    }

    if(incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const options = { 
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }

    // generating new access and refresh tokens

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id);

    // sending the response
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(
        200, 
        { accessToken, 
          refreshToken: newRefreshToken },
        "Access token refreshed successfully"
      ));

  } catch (error) {
    throw new ApiError(500, "Something went wrong while refreshing the access token");
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  // need to complete this function after middleware
  await User.findByIdAndUpdate(
    req.user._id,
    { 
      $unset: { 
        refreshToken: 1 //this removes the refresh token from the user document
      }
    },
    { 
      new: true 
    }
  )

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(
      200, 
      {},
      "User logged out successfully"
    ));
});

const changePassword = asyncHandler(async(req, res) => {
  const { oldPassword, newPassword } = req.body;

  if(!oldPassword || !newPassword) {
    throw new ApiError(400, "All fields are required");
  }

  // checking if the user exists in the database
  const user = await User.findById(req.user._id);
  if(!user) {
    throw new ApiError(404, "User not found");
  }

  // checking if the password is correct
  const isPasswordValid = await user.comparePassword(oldPassword)

  if(!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {  
  return res
    .status(200)
    .json(new ApiResponse(
      200, 
      req.user, 
      "User fetched successfully"
    ));
});
 
const updateAccountDetails = asyncHandler(async (req, res) => {

  const { newUsername, newEmail, newFullname } = req.body;

  if(!(newUsername || newEmail || newFullname)) {
    throw new ApiError(400, "At least one field is required");
  }

  const currentUser = await User.findById(req.user._id);
  if(!currentUser) {
    throw new ApiError(404, "User not found");
  }

  let emailChanged = newEmail && newEmail !== currentUser.email;
  let usernameChanged = newUsername && newUsername !== currentUser.username;

  if(emailChanged) {
    const emailExists = await User.findOne({ email: newEmail });
    if(emailExists) {
      throw new ApiError(400, "Email already exists");
    }
  }
  if(usernameChanged){
    const usernameExists = await User.findOne({ username: newUsername });
    if(usernameExists) {
      throw new ApiError(400, "Username already exists");
    }
  }

  if (newEmail) currentUser.email = newEmail;
  if (newUsername) currentUser.username = newUsername;
  if (newFullname) currentUser.fullname = newFullname;

  await currentUser.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, currentUser, "User Details updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar is required");
  }

  const user = await User.findById(req.user._id).select("-password");
  if(!user) {
    throw new ApiError(404, "User not found");
  }
  // finding the publicId of the old avatar
  let publicId;
  if(user.avatar) {
    publicId = user.avatar.split("/").pop().split(".")[0];
    // console.log(publicId);
  }
  /*
     If the user already has an avatar, delete the old one from Cloudinary
     - user.avatar contains the URL of the current avatar (e.g., "https://res.cloudinary.com/.../avatar123.jpg")
     - We need to extract the unique identifier ("avatar123") to delete the correct image
     - .split("/").pop() gets the last part of the URL ("avatar123.jpg")
     - .split(".")[0] removes the file extension (.jpg), leaving just "avatar123"
     - This ensures we delete only the user's previous avatar and not anything else!
  */

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url) {
    throw new ApiError(500, "Something went wrong while uploading the avatar");
  }
  // updating the user with the new avatar
  user.avatar = avatar?.url;
  
  // deleting the old avatar from cloudinary
  await deleteFromCloudinary(publicId, "image");

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));

});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if(!coverImageLocalPath){
    throw new ApiError(400, "Cover is required");
  }

  const user = await User.findById(req.user._id).select("-password");

  if(!user) {
    throw new ApiError(404, "User not found");
  }

  // finding the publicId of the old coverImage
  let publicId;
  if(user.coverImage) {
    publicId = user.coverImage.split("/").pop().split(".")[0];
  }
  /*
     If the user already has an coverImage, delete the old one from Cloudinary
     - user.coverImage contains the URL of the current coverImage (e.g., "https://res.cloudinary.com/.../coverImage123.jpg")
     - We need to extract the unique identifier ("coverImage123") to delete the correct image
     - .split("/").pop() gets the last part of the URL ("coverImage123.jpg")
     - .split(".")[0] removes the file extension (.jpg), leaving just "coverImage123"
     - This ensures we delete only the user's previous coverImage and not anything else!
  */

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url) {
    throw new ApiError(500, "Something went wrong while uploading the coverImage");
  }
  // updating the user with the new coverImage
  user.coverImage = coverImage?.url;
  
  await user.save({ validateBeforeSave: false });
  
  // deleting the old coverImage from cloudinary
  await deleteFromCloudinary(publicId, "image");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const getUserProfile = asyncHandler(async(req, res) => {
  const { username } = req.params

  if(!username?.trim()){
    throw new ApiError(400, "username is required.")
  }

  const channel = await User.aggregate([
    {
      $match:{
        username: username?.toLowerCase()
      }
    },
    {
      $lookup:{
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup:{
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields:{
        subscriberCount:{
          $size: "$subscribers"
        },
        subscribedToCount:{
          $size: "$subscribedTo"
        },
        isSubscribed:{
          $cond: {
            if: { $in: [ req.user?._id, "$subscribers.subscriber" ] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project:{
        username: 1,
        email: 1,
        fullname: 1,
        avatar: 1,
        coverImage: 1,
        subscriberCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1
      }
    }
  ]);

  console.log(channel);

  if(!channel.length){
    throw new ApiError(400, "channel not found.")
  }

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      channel[0],
      "channel fetched successfully"
    ))
  
});

const getWatchHistory = asyncHandler(async(req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
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
                    username: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner:{
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ]);

  if(!user){
    throw new ApiError(400, "user watch history not found")
  }

  return res
    .status(200)
    .json(new ApiResponse(
      200, 
      user[0].watchHistory, 
      "watch history fetched successfully."
    ))
});

export { 
  registerUser, 
  loginUser, 
  refreshAccessToken, 
  logoutUser, 
  changePassword, 
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserProfile,
  getWatchHistory
};
