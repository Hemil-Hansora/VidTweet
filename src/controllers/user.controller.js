import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { subscribe } from "diagnostics_channel";
import mongoose from "mongoose";

const registerSchema = z.object({
    fullName: z.string().trim().min(1, "Full name is required"),
    email: z.string().trim().email("Invalid email format"),
    password: z
        .string()
        .trim()
        .min(6, "Password must be at least 6 characters"),
    username: z.string().trim().min(1, "Username is required"),
});

const loginSchema = z.object({
    identifier: z
        .string()
        .nonempty("Username or email is required")
        .refine((value) => {
            // Validate as email or username format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const usernameRegex = /^[a-zA-Z0-9_]{3,}$/; // Example: alphanumeric with underscores, minimum 3 characters
            return emailRegex.test(value) || usernameRegex.test(value);
        }, "Invalid username or email"),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .nonempty("Password is required"),
});

const generateAccessAndRefereshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const refreshToken = user.generateRefreshToken();
        const accessToken = user.generateAccessToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { refreshToken, accessToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating Access and Referesh Token "
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(
            (err) => `${err.path[0]}: ${err.message}`
        );
        throw new ApiError(400, errorMessages.join(", "));
    }

    const { fullName, email, password, username } = validationResult.data;

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null;

    if (!avatar) {
        throw new ApiError(400, "Failed to upload avatar");
    }

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(
            (err) => `${err.path[0]}: ${err.message}`
        );
        throw new ApiError(400, errorMessages.join(", "));
    }

    const { identifier, password } = validationResult.data;

    const isEmail = z.string().trim().email().safeParse(identifier).success;

    const user = await User.findOne(
        isEmail ? { email: identifier } : { username: identifier }
    );

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefereshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const option = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        }
    );

    const option = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", option)
        .clearCookie("refreshToken", option)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unothorized request");
    }

    jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRTE,
        async (err, decodedToken) => {
            if(err) {
                throw new ApiError(401, err?.message || "Invalid Access token")
            }

            const user = await User.findById(decodedToken?._id)

            if(!user){
                throw new ApiError(401 , "Invalid refresh Token")
            }

            if(incomingRefreshToken !== user.refreshToken){
                throw new ApiError(401,"Refresh Token is expire or used")
            }

            const option = {
                httpOnly: true,
                secure: true,
            };

            const {accessToken , refreshToken}= await generateAccessAndRefereshToken(user._id)

            return res
            .status(200)
            .cookie("accessToken",accessToken,option)
            .cookie("refreshToken",refreshToken,option)
            .json(
                new ApiResponse(200,{accessToken,refreshToken},"Access Token refreshed")
            )
        }
    );
});

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401,"Invalid old password")
    }

    user.password = newPassword; 
    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Password change successfully")
    )
});

const getCurrentUser = asyncHandler(async (req,res)=>{
    const user = req.user

    if(!user){
        throw new ApiError(401,"User does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "current user fetched Successfully "
        )
    )
})

const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {fullName,username,email} = req.body

    if(!fullName || !username ||!email){
        throw new ApiError (400 , " All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email,
                username
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Account details updated")
    )
})

const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }


    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar){
        throw new ApiError(400,"Error while uploading Avatar")
    }



    const oldAvatarPath = req.user?.avatar

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar  : avatar.url    
            }
        },
        {new:true}
    ).select("-password -refreshToken")

     await deleteOnCloudinary(oldAvatarPath);

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar updated")
    )
})

const updateUserCoverImg = asyncHandler(async (req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage){
        throw new ApiError(400,"Error while uploading Cover Image")
    }

    const oldCoverImgPath = req.user?.coverImage

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage  : coverImage.url    
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    await deleteOnCloudinary(oldCoverImgPath)

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover Image updated")
    )
    
})

const getUserChannelProfile = asyncHandler(async (req,res)=>{
    const {username} = req.params 

    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }

    const channel =  await User.aggregate([
        {
            $match :{
                username : username?.toLowerCase()
            }
        },
        {
            $lookup :{
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as :"subscribers"
            }
        },
        {
            $lookup :{
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as :"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelsSubscribeToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond :{
                        if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                fullName : 1,
                username : 1,
                subscribersCount :1,
                channelsSubscribeToCount : 1,
                isSubscribed : 1,
                avatar : 1,
                email : 1,
                coverImage : 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(400 , "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse (200,channel[0],"user channel fetch successfully")
    )
})

const getWatchHistory = asyncHandler(async (req,res)=>{
    const user = await User.aggregate([
        {
            $match : {
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup :{
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as :"watchHistory",
                pipeline : [
                    {
                        $lookup :{
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as :"owner",
                            pipeline :[
                                {
                                    $project : {
                                        fullName : 1,
                                        username :1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            } 
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory,"Watch history fetch successfully")
    )
})


export { registerUser, loginUser, logoutUser,refreshAccessToken ,changePassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImg,getUserChannelProfile};
