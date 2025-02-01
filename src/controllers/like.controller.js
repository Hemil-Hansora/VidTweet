import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js";
import { Comment} from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"provide videoId")
    }


    const isVideo = await Video.findById(videoId)

    if(!isVideo){
        throw new ApiError(400 , 'video is not found')
    }

    const isVideoLiked = await Like.findOne({
        $and :[
            {likeBy : req.user?._id },
            {video : videoId}
        ]
    })

    if(isVideoLiked){
        const unLiked = await Like.findByIdAndDelete(isVideoLiked._id)

        if(!unLiked){
            throw new ApiError(500, "Something went wrong while unliked the video")
        }

        return res.status(200).json(new ApiResponse(200,unLiked , "Video unliked successfully"))
    }

    const liked = await Like.create({
        likeBy : req.user._id,
        video : videoId
    })

    if(!liked){
        throw new ApiError(500, "Something went wrong while liked the video")
    }

    return res.status(200).json(new ApiResponse(200,liked , "Video liked successfully"))

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400,"provide commentId")
    }
    

    const isComment = await Comment.findById(commentId)

    if(!isComment){
        throw new ApiError(400 , 'comment is not found')
    }

    const isCommentLiked = await Like.findOne({
        $and :[
            {likeBy : req.user?._id },
            {comment : commentId}
        ]
    })

    if(isCommentLiked){
        const unLiked = await Like.findByIdAndDelete(isCommentLiked._id)

        if(!unLiked){
            throw new ApiError(500, "Something went wrong while unliked the comment")
        }

        return res.status(200).json(new ApiResponse(200,unLiked , "Comment unliked successfully"))
    }

    const liked = await Like.create({
        likeBy : req.user._id,
        comment : commentId
    })

    if(!liked){
        throw new ApiError(500, "Something went wrong while liked the comment")
    }

    return res.status(200).json(new ApiResponse(200,liked , "comment liked successfully"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400,"provide tweetId")
    }
    

    const isTweet = await Tweet.findById(tweetId)

    if(!isTweet){
        throw new ApiError(400 , 'Tweet is not found')
    }

    const isTweetLiked = await Like.findOne({
        $and :[
            {likeBy : req.user?._id },
            {tweet : tweetId}
        ]
    })

    if(isTweetLiked){
        const unLiked = await Like.findByIdAndDelete(isTweetLiked._id)

        if(!unLiked){
            throw new ApiError(500, "Something went wrong while unliked the tweet")
        }

        return res.status(200).json(new ApiResponse(200,unLiked , "tweet unliked successfully"))
    }

    const liked = await Like.create({
        likeBy : req.user._id,
        tweet : tweetId
    })

    if(!liked){
        throw new ApiError(500, "Something went wrong while liked the tweet")
    }

    return res.status(200).json(new ApiResponse(200,liked , "tweet liked successfully"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await Like.find({
        $and : [
            {likeBy : req.user?._id},
            {video : {$exists: true}}
        ]
    })

    if(!likedVideos) {
        throw new ApiError(400 , "Liked video not found")
    }

    return res.status(200).json(new ApiResponse(200,likedVideos,"Videos found"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}