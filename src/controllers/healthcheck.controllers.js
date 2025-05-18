import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthCheck = asyncHandler(async (req, res) => {
  try {
    return res
      .status(200)
      .json(
        new ApiResponse(200, { status: "OK" }, "Health Check Endpoint hit")
      );
  } catch (error) {
    throw new ApiError(500, "Health Check failed. Something went wrong.");
  }
});
export { healthCheck };
