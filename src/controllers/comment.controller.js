import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Video } from "../models/video.model.js";


const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(200 ," provide videoId")
    }

    const isVideo = await Video.findById(videoId)

    if(!isVideo){
        throw new ApiError(400,"Video is not found")
    }

    const pipeline = [
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        }
    ]

    const option = {
        page : parseInt(page),
        limit : parseInt(limit),
        customLabels: {
            totalDocs: "total_comments",
            docs: "Comments"
        }
    }

    const allComments = await Comment.aggregatePaginate(pipeline , option)

    if(allComments?.total_comments === 0) {
        throw new ApiError(400 , "Video has zero comment")
    }

    return res.status(200).json(new ApiResponse(200 , allComments , "All comments fetched"))

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {content} = req.body
    const {videoId} = req.params

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(200 ," provide videoId")
    }

    if(!content){
        throw new ApiError(400 , "Please provide content")
    }

    const isVideo = await Video.findById(videoId)

    if(!isVideo){
        throw new ApiError(400,"Video is not found")
    }

    const comment = await Comment.create({
        content,
        video : videoId,
        owner : req.user._id
    })

    if(!comment){
        throw new ApiError(500 , "Something went wrong while adding new comment")
    }


    return res.status(200).json(new ApiResponse(200,comment,"Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {content} = req.body
    const {commentId} = req.params

    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(200 ," provide commentId")
    }

    if(!content){
        throw new ApiError(400 , "Please provide content")
    }

    const updateComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set : {
                content
            }
        },
        {
            new : true
        }
    )

    if(!updateComment){
        throw new ApiError(400,"Comment ddoes not exist")
    }

    return res.status(200).json(new ApiResponse(200,updateComment ,"Comment updated successfully"))

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const {commentId} = req.params

    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(200 ," provide commentId")
    }

    const deleteComment = await Comment.findByIdAndDelete(commentId)

    if(!deleteComment){
        throw new ApiError(400 , "Somthing went wrong while deleting comment")
    }

    return res.status(200).json(new ApiResponse(200,deleteComment,"Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }