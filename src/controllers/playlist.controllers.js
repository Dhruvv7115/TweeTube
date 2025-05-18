import mongoose, { isValidObjectId, } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, "A title for the playlist is required");
  }

  const playlist = await Playlist.create({
    owner: req.user._id,
    name,
    description: description || "",
  });

  if (!playlist) {
    throw new ApiError(500, "There was a problem in creating a playlist.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id.");
  }

  const playlists = await Playlist.find({ owner: userId })
    .populate("owner", "username avatar")
    .populate("videos", "duration views thumbnail title");

  if (!playlists) {
    throw new ApiError(400, "No playlists found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "playlists fetched successfully."));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id.");
  }

  const playlist = await Playlist.findOne({ _id: playlistId })
    .populate("videos", "thumbnail title views duration")
    .populate("owner", "username avatar");

  if (!playlist) {
    throw new ApiError(400, "Playlist not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully."));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id.");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  const playlist = await Playlist.findOne({ _id: playlistId });

  // console.log(playlist.video.indexOf(video))

  if (!playlist) {
    throw new ApiError(500, "Playlist not found.");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "User can add videos to their own playlist only.");
  }

  const video = await Video.findOne({ _id: videoId });

  if (!video) {
    throw new ApiError(500, "Video not found.");
  }

  if (playlist.videos.indexOf(video._id) !== -1) {
    throw new ApiError(400, "Video already exists in the playlist.");
  }

  playlist.videos.push(video);

  await playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video added to playlist successfully.")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id.");
  }
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  const playlist = await Playlist.findOne({ _id: playlistId });
  if (!playlist) {
    throw new ApiError(400, "Playlist not found.");
  }

  if (playlist.owner._id.toString() !== req.user._id.toString()) {
    throw new ApiError(
      400,
      "User cannot remove videos from other user's playlist."
    );
  }

  const video = await Video.findOne({ _id: videoId });
  if (!video) {
    throw new ApiError(400, "Video not found.");
  }

  let indexOfVideoToBeRemoved = playlist.videos.indexOf(video._id);
  if (indexOfVideoToBeRemoved === -1) {
    throw new ApiError(400, "Video is already not in the playlist.");
  }

  playlist.videos.splice(indexOfVideoToBeRemoved, 1);

  playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlist,
        "Video was removed from the playlist successfully."
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id.");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "Playlist not found.");
  }

  if (playlist.owner._id.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "User cannot delete other user's playlist.");
  }

  const deletedPlaylist = await Playlist.deleteOne({ _id: playlistId });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        deletedPlaylist,
        "Playlist was deleted successfully."
      )
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id.");
  }

  if (!(name || description)) {
    throw new ApiError(400, "Atleast one field is required to be updated.");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "Playlist not found.");
  }

  if (name) {
    playlist.name = name;
  }
  if (description) {
    playlist.description = description;
  }

  playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully."));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
