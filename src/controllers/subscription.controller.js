import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400,"provide channel id")
    }

    const channel = await User.findById(channelId)

    if(!channel){
        throw new ApiError(400,"Channel does not exist")
    }

    const isSub = await Subscription.findOne({subscriber:req.user._id , channel : channelId })

    if(!isSub){
        await Subscription.create({
            subscriber : req.user._id,
            channel : channelId
        })

        return res.status(200).json(new ApiResponse(200,{status:"subscribed"},"Subscription Added"))
    }else{
        await Subscription.findByIdAndDelete(isSub._id)

        return res.status(200).json(new ApiResponse(200,{status:"unsubscribed"},"Subscription removed"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    console.log(channelId)

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400,"provide channel id")
    }

    const channelExist = await User.findById(channelId)

    if(!channelExist){
        throw new ApiError(400,"channel does not exist")
    }

    const subscriber = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from : "users",
                localField : "subscriber",
                foreignField : "_id",
                as : "subscriber"
            }
        },
        {
            $unwind : "$subscriber"
        },
        {
            $project : {
                subscriber : {
                    _id : 1,
                    fullName : 1,
                    username : 1,
                    avatar :1
                }
            }
        }
    ])

    if(!subscriber?.length){
        throw new ApiError(400,"This channel  has no subscribers")
    }

    const info = {
        subscriber : subscriber || [],
        totalSubscriber : subscriber?.length
    }

    return res.status(200).json(new ApiResponse(200,info,"Subscriber fetch successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params


    if(!subscriberId || !isValidObjectId(subscriberId)){
        throw new ApiError(400,"provide subscribed id")
    }

    const subExist = await User.findById(subscriberId)

    if(!subExist){
        throw new ApiError(400,"channel does not exist")
    }

    const channel = await Subscription.aggregate([
        {
            $match : {
                subscriber : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from : "users",
                localField : "channel",
                foreignField : "_id",
                as : "channel"
            }
        },
        {
            $unwind : "$channel"
        },
        {
            $project : {
                channel : {
                    _id : 1,
                    fullName : 1,
                    username : 1,
                    avatar :1
                }
            }
        }
    ])

    console.log(channel)

    if(!channel?.length){
        throw new ApiError(400,"This channel  has no subscribers")
    }

    const info = {
        channel : channel || [],
        totalChannel : channel?.length
    }

    return res.status(200).json(new ApiResponse(200,info,"Subscribed Channel fetch successfully"))


})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}