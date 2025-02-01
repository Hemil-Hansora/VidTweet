import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import { Video } from "../models/video.model.js";
import {User} from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!name || !description){
        throw new ApiError(400 , "provide name and description ")
    }
    const user = req.user;

    const playlist = await Playlist.create({
        name,
        description,
        owner : user._id,
    })

    if(!playlist){
        throw new ApiError(500 , "something went wrong while creating playlist ")
    }

    return res.status(200).json(new ApiResponse(200,playlist,"playlist created successfully"))

    //TODO: create playlist
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!userId || !isValidObjectId(userId)){
        throw new ApiError(400,"provide user id")
    }

    const isUser = await User.findById(userId)

    if(!isUser) {
        throw new ApiError(400 , "User is not exist")
    }

    const playlist = await Playlist.find({owner:userId})

    if(!playlist) {
        throw new ApiError(400,"Playlist does not exist")
    }

    return res.status(200).json( new ApiResponse(200,playlist,"Playlist fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"provide user id")
    }


    const playlist = await Playlist.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup : {
                from: "users",
                localField : "owner",
                foreignField : "_id",
                as : "owner",
                pipeline : [
                    {
                        $project : {
                            fullName :1,
                            username : 1,
                            avatar : 1
                        }
                    }
                ]
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "videos",
                foreignField : "_id",
                as : "videos",
                pipeline :[
                    {
                        $project : {
                            title : 1,
                            description : 1,
                            thumbnail : 1,
                            duration : 1,
                            views : 1,
                            isPublished : 1
                        }
                    }
                ]
            }
        },
        {
            $project : {
                name : 1 ,
                description : 1,
                owner : { $first : "$owner" },
                videos : 1,
            }
        }
    ])

    if(!playlist) {
        throw new ApiError(400,"Playlist does not exist")
    }

    return res.status(200).json(new ApiResponse(200,playlist,"Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // console.log(isValidObjectId(playlistId))
    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(200 ," provide playlistId")
    }
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(200 ," provide videoId")
    }

    const isPlaylist = await Playlist.findById(playlistId)
    
    if(!isPlaylist){
        throw new ApiError(400 ,"Playlist doesnot exist")
    }

    const isVideo = await  Video.findById(videoId);

    if(!isVideo){
        throw new ApiError(400,"Video does not exist")
    }

    console.log(isPlaylist?.owner)
    console.log(req.user._id)

    if(!isPlaylist?.owner.equals( req.user._id)){
        throw new ApiError(400 ,"You don't have permission to add video ")
    }

    if(isPlaylist.videos.includes(videoId)){
        throw new ApiError(400 , " this video allready in playlist")
    }

    const addVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet : {
                videos : videoId
            }
        },
        {
            new:true
        }
    )

    if(!addVideo){
        throw new ApiError(500 ,"Something went wrong while adding new video in playlist")
    }

    return res.status(200).json(new ApiResponse(200,addVideo , "Video added"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    
    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(200 ," provide playlistId")
    }
    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(200 ," provide videoId")
    }

    const isPlaylist = await Playlist.findById(playlistId)
    
    if(!isPlaylist){
        throw new ApiError(400 ,"Playlist doesnot exist")
    }

    const isVideo = await  Video.findById(videoId);

    if(!isVideo){
        throw new ApiError(400,"Video does not exist")
    }

    if(!isPlaylist?.owner.equals( req.user._id)){
        throw new ApiError(400 ,"You don't have permission to remove video ")
    }

    if(!isPlaylist.videos.includes(videoId)){
        throw new ApiError(400 , " this video is not present in playlist")
    }

    const removeVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull : {
                videos : videoId
            }
        },
        {
            new : true
        }
    )

    if(!removeVideo) {
        throw new ApiError(500 ,"Something went wrong while removing the video in playlist")
    }

    return res.status(200).json(new ApiResponse(200,removeVideo , "Video removed"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(200 ," provide playlistId")
    }

    const isPlaylist = await Playlist.findById(playlistId)
    
    if(!isPlaylist){
        throw new ApiError(400 ,"Playlist doesnot exist")
    }

    if(!isPlaylist?.owner.equals( req.user._id)){
        throw new ApiError(400 ,"You don't have permission to delete the playlist ")
    }

    const remove = await Playlist.findByIdAndDelete(playlistId);

    if(!remove) {
        throw new ApiError(500 ,"Something went wrong while deleting the playlist")
    }

    return res.status(200).json(new ApiResponse(200,remove , "playlist removed"))


})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(200 ," provide playlistId")
    }

    if(!name && !description){
        throw new ApiError(404,"Atleast provide name or description")
    }

    const isPlaylist = await Playlist.findById(playlistId)
    
    if(!isPlaylist){
        throw new ApiError(400 ,"Playlist doesnot exist")
    }

    if(!isPlaylist?.owner.equals( req.user._id)){
        throw new ApiError(400 ,"You don't have permission to update the playlist ")
    }


    const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set : {
                name : name || isPlaylist?.name,
                description : description || isPlaylist?.description
            }
        },
        {
            new : true
        }
    )

    if(!updatePlaylist){
        throw new ApiError(500 ,"Something went wrong while updating the playlist")
    }

    return res.status(200).json(new ApiResponse(200,updatePlaylist,"Playlist Updated"))

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}