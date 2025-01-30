import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    //TODO: get all videos based on query, sort, pagination
    
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, discription } = req.body;
    // TODO: get video, upload to cloudinary, create video
    if (!title && !discription) {
        throw new ApiError(400, "Please enter the details");
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new ApiError(400, "Failed to upload videoFile");
    }
    if (!thumbnail) {
        throw new ApiError(400, "Failed to upload thumbnail");
    }

    console.log(videoFile.url);
    console.log(thumbnail.url);

    const video = await Video.create({
        title,
        discription,
        duration: videoFile.duration,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: new mongoose.Types.ObjectId(req.user._id),
    });

    console.log("video added");

    if (!video) {
        throw new ApiError(500, "Something went wrong while publish the video");
    }

    return res.status(200).json(new ApiResponse(200, video, "video published"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: get video by id

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "successfully get video"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail
    const { title, discription } = req.body;
    if (!(title || discription)) {
        throw new ApiError(400, "Please enter the details");
    }

    const thumbnailLocalPath = req.file?.path;
    console.log(thumbnailLocalPath);

    const thumbnail = thumbnailLocalPath
        ? await uploadOnCloudinary(thumbnailLocalPath)
        : null;

    console.log(thumbnail);

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                discription,
                thumbnail: thumbnail?.url,
            },
        },
        { new: true }
    );

    if (!video) {
        throw new ApiError(400, "Error while updating the video");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video update successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video

    const video = await Video.findByIdAndDelete(videoId);

    if (!video) {
        throw new ApiError(400, "Video does not exist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findByIdAndUpdate(
        videoId,
        [
            {
                $set: {
                    isPublished: { $not: "$isPublished" }, // Toggles true <-> false
                },
            },
        ],
        { new: true }
    );

    if (!video) {
        throw new ApiError(400, "Video does not exist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                `video ${video.isPublished ? "Published " : "Unpublished"} Successfully`
            )
        );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
