import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { z } from "zod";

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
        const refreshToken =  user.generateRefreshToken();
        const accessToken =  user.generateAccessToken();

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

export { registerUser, loginUser, logoutUser };
