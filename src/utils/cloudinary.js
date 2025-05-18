import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
// Load environment variables from .env file

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload an image
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // Automatically determine the resource type (image, video, etc.)
    });
    console.log("file uploaded to cloudinary. File src: ", response.url);
    fs.unlinkSync(localFilePath); // Delete the file from local storage after upload
    return response;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    fs.unlinkSync(localFilePath); // Delete the file from local storage if upload fails
    return null;
  }
};

const deleteFromCloudinary = async (publicId, resource_type) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type,
    });
    console.log("File deleted from Cloudinary: ", publicId);
    return response;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
