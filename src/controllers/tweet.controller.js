import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const user = req.user;
    const {content} = req.body;

    if(!content){
        throw new ApiError(400, "Please enter content")
    }

    const tweet = await Tweet.create({
        content,
        owner : user._id
    });

    if (!tweet) {
        throw new ApiError(500, "Something went wrong while createing new tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,tweet,"tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params
    const id = new mongoose.Types.ObjectId(userId);

    if(!id.equals(req.user._id)){
        throw new ApiError(400,"Access denied")
    }

    const tweets = await Tweet.find({owner:id})

    if(!tweets){
        throw new ApiError(400,"User does not have tweets")
    }

    return res.status(200).json(new ApiResponse(200,tweets,"successfully get user tweets"))

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;
    const {content} = req.body;
    const id = new mongoose.Types.ObjectId(tweetId);

    if(!content?.trim()){
        throw new ApiError(400,"Please enter the content")
    }

    const tweet = await Tweet.findByIdAndUpdate(
        id,
        {
            $set:{
                content
            }
        },
        {new :true}
    )

    if(!tweet){
        throw new ApiError(400,"Invalid Id")
    }

    return res.status(200).json(new ApiResponse(200,tweet,"tweet update successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const {tweetId} = req.params;
    const id = new mongoose.Types.ObjectId(tweetId);

    const tweet = await Tweet.findByIdAndDelete(id)

    if(!tweet){
        throw new ApiError(400,"Invalid Id")
    }

    return res.status(200).json(new ApiResponse(200,tweet,"tweet delete successfully"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}