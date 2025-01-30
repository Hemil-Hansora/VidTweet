import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = 1,
        userId = "",
    } = req.query;

    //TODO: get all videos based on query, sort, pagination

    let pipeline = [
        {
            $match: {
                $and: [
                    {
                        $or: [
                            { title: { $regex: query, $options: "i" } },
                            { description: { $regex: query, $options: "i" } },
                        ],
                    },
                    ...(userId
                        ? [{ owner: new mongoose.Types.ObjectId(userId) }]
                        : ""),
                ],
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
                            _id: 1,
                            fullName: 1,
                            avatar: 1,
                            username: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner",
                },
            },
        },
        {
            $sort: {
                [sortBy]: parseInt(sortType),
            },
        },
    ];

    try {
        // const options = {
        //     page : parseInt(page),
        //     limit : parseInt(limit),
        //     customLabels : {
        //         totalDocs : "totalVideos",
        //         docs : "videos"
        //     }
        // }

        const options = {
            // options for pagination
            page: parseInt(page),
            limit: parseInt(limit),
            customLabels: {
                // custom labels for pagination
                totalDocs: "totalVideos",
                docs: "videos",
            },
        };

        // const result = await Video.aggregatePaginate(Video.aggregate(pipeline),options);
        const result = await Video.aggregatePaginate(
            Video.aggregate(pipeline),
            options
        );
        console.log("xxxxxxx");
        if (!result?.videos?.length) {
            throw new ApiError(400, "No video found");
        }

        return res
            .status(200)
            .json(new ApiResponse(200, result, "Video Fetched successfully"));
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Internal server error in video aggregation",
            error
        );
    }
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video
    if (!title && !description) {
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
        description,
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

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "give video id");
    }

    // const video = await Video.findById(videoId);

    // if (!video) {
    //     throw new ApiError(400, "Video not found");
    // }

    try {
        const video = await Video.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(videoId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "uploadedBy",
                },
            },
            {
                $unwind: "$uploadedBy",
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "likes",
                },
            },
            {
                $lookup: {
                    from: "subscribers",
                    localField: "owner",
                    foreignField: "channel",
                    as: "subscribers",
                },
            },
            {
                $addFields: {
                    totalSubscribers: {
                        $size: "$subscribers",
                    },
                    isSubscriberd: {
                        $cond: {
                            if: {
                                $in: [req.user._id, "$subscribers.subscriber"],
                            },
                            then: true,
                            else: false,
                        },
                    },
                    TotalLikes: {
                        $size: "$likes",
                    },
                    isLiked: {
                        $cond: {
                            if: { $in: [req.user._id, "$likes.likeBy"] },
                            then: true,
                            else: false,
                        },
                    },
                },
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    views: 1,
                    thumbnail: 1,
                    videoFile: 1,
                    uploadedBy: {
                        fullName: 1,
                        username: 1,
                        avatar: 1,
                    },
                    TotalLikes: 1,
                    isLiked: 1,
                    totalSubscribers: 1,
                    isSubscriberd: 1,
                },
            },
        ]);

        console.log(video);

        return res
            .status(200)
            .json(new ApiResponse(200, video, "successfully get video"));
    } catch (error) {
        throw new ApiError(
            400,
            error?.message || "Something went wrong",
            error
        );
    }
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body;
    if (!(title || description)) {
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
                description,
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
