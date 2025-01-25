import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }

    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRTE,
        async (err, decodedToken) => {
            if (err) {
                throw new ApiError(401, err?.message || "Invalid Access token");
            }

            const user = await User.findById(decodedToken?._id).select(
                "-password -refreshToken"
            );

            if (!user) {
                throw new ApiError(401, "Invalid Access token");
            }

            req.user = user;
            next();
        }
    );
});
