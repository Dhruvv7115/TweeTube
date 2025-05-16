import jwt from "jsonwebtoken"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token = req.cookies.accessToken || req.header("Authorization")?.split(" ")[1];

    if(!token) {
      throw new ApiError(401, "Unauthorized Request");
    }

    // verify the token

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // check if the user exists in the database

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

    if(!user) {
      throw new ApiError(404, "Access token is invalid");
    }

    // attach the user to the request object
    req.user = user;
    next();
    
  } catch (error) {
    throw new ApiError(401, "Invalid token");
  }
})